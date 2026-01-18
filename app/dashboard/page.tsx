"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  getDocs
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getCard } from "../../lib/cards";
import { generateUniqueMatchId } from "../../lib/matchId";

interface UserData {
  uid: string;
  displayName: string;
  photoURL: string;
  friendCode: string;
  friends: string[];
  presence: string;
  stats: { totalMinutes: number; sessionsCount: number };
  inventory: {
    hand: string[];
    collectionCounts: Record<string, number>;
  };
}

interface MatchData {
  matchId: string;
  type: "duo" | "group";
  createdAt: any;
  endsAt: any;
  status: "active" | "finished";
  participants: string[];
  hp: Record<string, number>;
}

interface FriendData {
  uid: string;
  displayName: string;
  photoURL: string;
  presence: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentMatch, setCurrentMatch] = useState<MatchData | null>(null);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [matchType, setMatchType] = useState<"duo" | "group">("duo");
  const [joinMatchId, setJoinMatchId] = useState("");
  const [addFriendCode, setAddFriendCode] = useState("");
  const [notification, setNotification] = useState<string>("");

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load user data
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.data() as UserData);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load current match (only one)
  useEffect(() => {
    if (!user) return;

    const matchesRef = collection(db, "matches");
    const q = query(
      matchesRef,
      where("participants", "array-contains", user.uid),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const matchDoc = snapshot.docs[0];
        setCurrentMatch({ ...matchDoc.data(), matchId: matchDoc.id } as MatchData);
      } else {
        setCurrentMatch(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load friends with real-time presence
  useEffect(() => {
    if (!userData || !userData.friends || userData.friends.length === 0) {
      setFriends([]);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const friendsData: Record<string, FriendData> = {};

    userData.friends.forEach(friendUid => {
      const unsubscribe = onSnapshot(doc(db, "users", friendUid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          friendsData[friendUid] = {
            uid: friendUid,
            displayName: data.displayName || "Unknown",
            photoURL: data.photoURL || "",
            presence: data.presence || "offline"
          };
          setFriends(Object.values(friendsData));
        }
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userData?.friends]);

  // Set user presence to online on mount
  useEffect(() => {
    if (!user) return;

    const setOnline = async () => {
      await updateDoc(doc(db, "users", user.uid), {
        presence: "online"
      });
    };

    const setOffline = async () => {
      await updateDoc(doc(db, "users", user.uid), {
        presence: "offline"
      });
    };

    setOnline();

    // Set offline on unmount or page close
    window.addEventListener("beforeunload", setOffline);

    return () => {
      setOffline();
      window.removeEventListener("beforeunload", setOffline);
    };
  }, [user]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const createMatch = async () => {
    if (!user || !userData) return;

    if (currentMatch) {
      showNotification("⚠️ You're already in a match! Leave it first.");
      return;
    }

    const matchId = generateUniqueMatchId();
    const now = new Date();
    const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const matchData: MatchData = {
      matchId,
      type: matchType,
      createdAt: now,
      endsAt,
      status: "active",
      participants: [user.uid],
      hp: { [user.uid]: 100 },
      alive: { [user.uid]: true },
      buffs: { [user.uid]: [] },
      eventSeq: 0,
      activityFeed: [`${userData.displayName} created the match`]
    } as any;

    await setDoc(doc(db, "matches", matchId), matchData);
    setShowCreateMatch(false);
    showNotification(`✅ Match created! Entering battle...`);
    
    setTimeout(() => {
      router.push(`/match/${matchId}`);
    }, 1000);
  };

  const joinMatch = async () => {
    if (!user || !userData || !joinMatchId.trim()) return;

    if (currentMatch) {
      showNotification("⚠️ You're already in a match! Leave it first.");
      return;
    }

    const matchRef = doc(db, "matches", joinMatchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
      showNotification("❌ Match not found!");
      return;
    }

    const matchData = matchSnap.data() as MatchData;

    if (matchData.participants.includes(user.uid)) {
      showNotification("⚠️ You're already in this match!");
      router.push(`/match/${joinMatchId}`);
      return;
    }

    await updateDoc(matchRef, {
      participants: arrayUnion(user.uid),
      [`hp.${user.uid}`]: 100,
      [`alive.${user.uid}`]: true,
      [`buffs.${user.uid}`]: [],
      activityFeed: arrayUnion(`${userData.displayName} joined the match`)
    });

    setJoinMatchId("");
    showNotification("✅ Joined match! Entering battle...");
    
    setTimeout(() => {
      router.push(`/match/${joinMatchId}`);
    }, 1000);
  };

  const enterMatch = () => {
    if (currentMatch) {
      router.push(`/match/${currentMatch.matchId}`);
    }
  };

  const addFriend = async () => {
    if (!user || !userData || !addFriendCode.trim()) return;

    if (addFriendCode === userData.friendCode) {
      showNotification("❌ You can't add yourself!");
      return;
    }

    // Find user by friend code
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("friendCode", "==", addFriendCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showNotification("❌ Friend code not found!");
      return;
    }

    const friendDoc = querySnapshot.docs[0];
    const friendUid = friendDoc.id;

    if (userData.friends?.includes(friendUid)) {
      showNotification("⚠️ Already friends!");
      return;
    }

    // Add friend to both users
    await updateDoc(doc(db, "users", user.uid), {
      friends: arrayUnion(friendUid)
    });

    await updateDoc(doc(db, "users", friendUid), {
      friends: arrayUnion(user.uid)
    });

    setAddFriendCode("");
    showNotification(`✅ Added ${friendDoc.data().displayName} as friend!`);
  };

  const copyFriendCode = () => {
    if (userData) {
      navigator.clipboard.writeText(userData.friendCode);
      showNotification("📋 Friend code copied!");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="text-center">
        <div className="text-6xl mb-4">⚔️</div>
        <p className="text-xl">Loading...</p>
      </div>
    </div>;
  }

  if (!userData) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <p>No user data found</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
      {/* Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-bounce">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={userData.photoURL} alt="avatar" className="w-16 h-16 rounded-full border-4 border-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold">{userData.displayName}</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-300">Friend Code:</p>
                <span className="font-mono bg-black/30 px-2 py-1 rounded text-yellow-400 font-bold">{userData.friendCode}</span>
                <button onClick={copyFriendCode} className="text-xs bg-blue-500 px-2 py-1 rounded hover:bg-blue-600 transition">
                  📋 Copy
                </button>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-500 px-6 py-3 rounded-lg hover:bg-red-600 transition font-bold">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stats & Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4">📊 Your Stats</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/30 p-4 rounded text-center">
                <div className="text-3xl font-bold text-green-400">{userData.stats.totalMinutes}</div>
                <div className="text-sm text-gray-300 mt-1">Total Minutes</div>
              </div>
              <div className="bg-black/30 p-4 rounded text-center">
                <div className="text-3xl font-bold text-blue-400">{userData.stats.sessionsCount}</div>
                <div className="text-sm text-gray-300 mt-1">Sessions</div>
              </div>
              <div className="bg-black/30 p-4 rounded text-center">
                <div className="text-3xl font-bold text-purple-400">{Object.keys(userData.inventory.collectionCounts).length}</div>
                <div className="text-sm text-gray-300 mt-1">Cards Collected</div>
              </div>
            </div>
          </div>

          {/* Current Match Status */}
          {currentMatch && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 border-4 border-yellow-400">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">⚔️ Match In Progress</h2>
                  <p className="text-xl font-bold bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent mb-2">
                    {currentMatch.matchId}
                  </p>
                  <p className="text-sm">{currentMatch.type === "duo" ? "1v1 Duel" : "Group Battle"} • {currentMatch.participants.length} players</p>
                  <p className="text-sm mt-1">Your HP: <span className="font-bold text-2xl">❤️ {currentMatch.hp[user?.uid || ""] || 0}</span></p>
                </div>
                <button onClick={enterMatch} className="bg-white text-red-600 px-6 py-4 rounded-lg hover:bg-gray-100 transition font-bold text-lg shadow-lg">
                  Enter Battle →
                </button>
              </div>
            </div>
          )}

          {/* Card Collection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4">🃏 Card Collection</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {Object.entries(userData.inventory.collectionCounts).map(([cardId, count]) => {
                const card = getCard(cardId);
                if (!card) return null;
                
                return (
                  <div key={cardId} className={`p-3 rounded border-2 ${
                    card.rarity === 'epic' ? 'bg-purple-900/50 border-purple-500' :
                    card.rarity === 'rare' ? 'bg-blue-900/50 border-blue-500' :
                    'bg-gray-800/50 border-gray-500'
                  }`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-2xl">{card.emoji}</span>
                      <span className="text-xs bg-black/50 px-2 py-1 rounded">x{count}</span>
                    </div>
                    <p className="font-bold text-sm">{card.name}</p>
                    <p className="text-xs uppercase" style={{
                      color: card.rarity === 'epic' ? '#a855f7' : card.rarity === 'rare' ? '#3b82f6' : '#9ca3af'
                    }}>{card.rarity}</p>
                  </div>
                );
              })}
              {Object.keys(userData.inventory.collectionCounts).length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-400">
                  <p>No cards yet!</p>
                  <p className="text-sm mt-2">Complete focus sessions to earn cards</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Match & Friends */}
        <div className="space-y-6">
          {/* Create/Join Match */}
          {!currentMatch && (
            <>
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold mb-4">🎮 Create Match</h2>
                <button
                  onClick={() => setShowCreateMatch(!showCreateMatch)}
                  className="w-full bg-green-500 px-4 py-3 rounded-lg hover:bg-green-600 font-bold transition mb-4"
                >
                  + New Match
                </button>

                {showCreateMatch && (
                  <div className="space-y-3 border-t border-gray-600 pt-4">
                    <select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value as "duo" | "group")}
                      className="w-full bg-gray-800 px-3 py-2 rounded text-white"
                    >
                      <option value="duo">⚔️ 1v1 Duel</option>
                      <option value="group">👥 Group Battle</option>
                    </select>
                    <button onClick={createMatch} className="w-full bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition font-bold">
                      Create & Enter
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold mb-4">🔗 Join Match</h2>
                <input
                  type="text"
                  placeholder="Enter Match ID"
                  value={joinMatchId}
                  onChange={(e) => setJoinMatchId(e.target.value.toUpperCase())}
                  className="w-full bg-gray-800 px-3 py-3 rounded mb-3 text-white font-mono"
                />
                <button onClick={joinMatch} className="w-full bg-purple-500 px-4 py-3 rounded hover:bg-purple-600 transition font-bold">
                  Join & Enter
                </button>
              </div>
            </>
          )}

          {/* Add Friend */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold mb-4">➕ Add Friend</h2>
            <input
              type="text"
              placeholder="Enter Friend Code"
              value={addFriendCode}
              onChange={(e) => setAddFriendCode(e.target.value.toUpperCase())}
              className="w-full bg-gray-800 px-3 py-3 rounded mb-3 text-white font-mono"
            />
            <button onClick={addFriend} className="w-full bg-green-500 px-4 py-3 rounded hover:bg-green-600 transition font-bold">
              Add Friend
            </button>
          </div>

          {/* Friends List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold mb-4">👥 Friends ({friends.length})</h2>
            {friends.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No friends yet!</p>
                <p className="text-xs mt-2">Add friends using their friend code</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {friends.map(friend => (
                  <div key={friend.uid} className="flex items-center gap-3 bg-black/30 p-3 rounded">
                    <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <p className="font-bold">{friend.displayName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${friend.presence === 'online' ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                        {friend.presence === 'online' ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
