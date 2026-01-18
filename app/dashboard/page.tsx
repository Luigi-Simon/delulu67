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
  increment,
  getDocs
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { drawCard, getCard, Card } from "../../lib/cards";
import { openChest, determineChestReward, getChest, ChestType } from "../../lib/chests";
import { EMOTES, Emote } from "../../lib/emotes";

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
  alive: Record<string, boolean>;
  buffs: Record<string, any[]>;
  eventSeq: number;
  activityFeed: string[];
}

interface FocusSessionData {
  sessionId: string;
  uid: string;
  matchId: string;
  durationMin: 20 | 40 | 67;
  startServerTime: any;
  endTime?: any;
  status: "running" | "completed" | "failed" | "cancelled";
  result: { rewardGranted: boolean; droppedCard: string | null };
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentMatch, setCurrentMatch] = useState<MatchData | null>(null);
  const [activeSession, setActiveSession] = useState<FocusSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<string>("");
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [activeSessions, setActiveSessions] = useState<Record<string, FocusSessionData>>({});
  
  // UI States
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [matchType, setMatchType] = useState<"duo" | "group">("duo");
  const [joinMatchId, setJoinMatchId] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<20 | 40 | 67>(20);
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [rewardCard, setRewardCard] = useState<Card | null>(null);
  const [notification, setNotification] = useState<string>("");
  const [showEmotes, setShowEmotes] = useState(false);
  const [showChestReward, setShowChestReward] = useState(false);
  const [chestReward, setChestReward] = useState<{ chest: ChestType; cards: Card[] } | null>(null);
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState(false);

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

  // Load current match
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

  // Load participant names
  useEffect(() => {
    if (!currentMatch) return;

    const loadParticipantNames = async () => {
      const names: Record<string, string> = {};
      for (const uid of currentMatch.participants) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          names[uid] = userDoc.data().displayName || uid;
        }
      }
      setParticipantNames(names);
    };

    loadParticipantNames();
  }, [currentMatch]);

  // Load all active sessions in current match
  useEffect(() => {
    if (!currentMatch) return;

    const sessionsRef = collection(db, "focusSessions");
    const q = query(
      sessionsRef,
      where("matchId", "==", currentMatch.matchId),
      where("status", "==", "running")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions: Record<string, FocusSessionData> = {};
      snapshot.docs.forEach(doc => {
        const session = { ...doc.data(), sessionId: doc.id } as FocusSessionData;
        sessions[session.uid] = session;
      });
      setActiveSessions(sessions);
    });

    return () => unsubscribe();
  }, [currentMatch]);

  // Load active focus session
  useEffect(() => {
    if (!user) return;

    const sessionsRef = collection(db, "focusSessions");
    const q = query(
      sessionsRef,
      where("uid", "==", user.uid),
      where("status", "==", "running")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0];
        setActiveSession({ ...sessionDoc.data(), sessionId: sessionDoc.id } as FocusSessionData);
      } else {
        setActiveSession(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Match timer
  useEffect(() => {
    if (!currentMatch) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const endTime = currentMatch.endsAt?.toDate?.()?.getTime() || now;
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining("Match Ended");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMatch]);

  // Session timer
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const startTime = activeSession.startServerTime?.toDate?.()?.getTime() || now;
      const duration = activeSession.durationMin * 60 * 1000;
      const endTime = startTime + duration;
      const diff = endTime - now;

      if (diff <= 0) {
        setSessionTimeRemaining("Session Complete!");
        handleSessionComplete();
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setSessionTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Notification system
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

    const matchId = `match_${Date.now()}`;
    const now = new Date();
    const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

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
    };

    await setDoc(doc(db, "matches", matchId), matchData);
    setShowCreateMatch(false);
    showNotification(`✅ Match created! ID: ${matchId}`);
  };

  const joinMatch = async () => {
    if (!user || !userData || !joinMatchId.trim()) return;

    const matchRef = doc(db, "matches", joinMatchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
      showNotification("❌ Match not found!");
      return;
    }

    const matchData = matchSnap.data() as MatchData;

    if (matchData.participants.includes(user.uid)) {
      showNotification("⚠️ You're already in this match!");
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
    showNotification("✅ Joined match!");
  };

  const endMatch = async () => {
    if (!user || !userData || !currentMatch) return;

    setShowEndMatchConfirm(false);

    // Calculate rankings
    const rankings = currentMatch.participants
      .map(uid => ({ uid, hp: currentMatch.hp[uid] || 0 }))
      .sort((a, b) => b.hp - a.hp);

    // Distribute chest rewards to all participants
    for (let i = 0; i < rankings.length; i++) {
      const participant = rankings[i];
      const placement = i + 1;
      const chestType = determineChestReward(placement, rankings.length, 1);
      const cards = openChest(chestType);

      // Update user inventory
      const userRef = doc(db, "users", participant.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updates: any = {};

        // Add cards to collection
        cards.forEach(card => {
          const currentCount = userData.inventory?.collectionCounts?.[card.id] || 0;
          updates[`inventory.collectionCounts.${card.id}`] = currentCount + 1;
        });

        // Add cards to hand if space available
        const currentHand = userData.inventory?.hand || [];
        const cardsToAdd = cards.slice(0, Math.max(0, 3 - currentHand.length));
        if (cardsToAdd.length > 0) {
          updates["inventory.hand"] = arrayUnion(...cardsToAdd.map(c => c.id));
        }

        await updateDoc(userRef, updates);
      }

      // Show chest reward for current user
      if (participant.uid === user.uid) {
        setChestReward({ chest: chestType, cards });
        setShowChestReward(true);
      }
    }

    // Mark match as finished
    await updateDoc(doc(db, "matches", currentMatch.matchId), {
      status: "finished",
      activityFeed: arrayUnion(`Match ended! Winner: ${participantNames[rankings[0].uid]}`)
    });

    showNotification("🏆 Match ended! Check your chest reward!");
  };

  const sendEmote = async (emote: Emote) => {
    if (!user || !userData || !currentMatch) return;

    await updateDoc(doc(db, "matches", currentMatch.matchId), {
      activityFeed: arrayUnion(`${emote.emoji} ${userData.displayName}: "${emote.text}"`)
    });

    setShowEmotes(false);
    showNotification(`Sent: ${emote.emoji} ${emote.text}`);
  };

  const startFocusSession = async () => {
    if (!user || !currentMatch) {
      showNotification("⚠️ You need to be in a match to start a focus session!");
      return;
    }

    if (activeSession) {
      showNotification("⚠️ You already have an active session!");
      return;
    }

    const sessionId = `sess_${Date.now()}`;
    const sessionData: FocusSessionData = {
      sessionId,
      uid: user.uid,
      matchId: currentMatch.matchId,
      durationMin: selectedDuration,
      startServerTime: serverTimestamp(),
      status: "running",
      result: { rewardGranted: false, droppedCard: null }
    };

    await setDoc(doc(db, "focusSessions", sessionId), sessionData);
    
    // Add to activity feed
    if (userData) {
      await updateDoc(doc(db, "matches", currentMatch.matchId), {
        activityFeed: arrayUnion(`${userData.displayName} started a ${selectedDuration}min focus session 🎯`)
      });
    }
    
    showNotification(`🎯 Focus session started! Duration: ${selectedDuration} minutes`);
  };

  const handleSessionComplete = async () => {
    if (!activeSession || !user || !userData) return;

    // Draw a card
    const drawnCard = drawCard(activeSession.durationMin);
    
    // Update session
    await updateDoc(doc(db, "focusSessions", activeSession.sessionId), {
      status: "completed",
      endTime: serverTimestamp(),
      "result.rewardGranted": true,
      "result.droppedCard": drawnCard.id
    });

    // Update user inventory
    const userRef = doc(db, "users", user.uid);
    const currentCount = userData.inventory.collectionCounts[drawnCard.id] || 0;
    
    await updateDoc(userRef, {
      "stats.totalMinutes": increment(activeSession.durationMin),
      "stats.sessionsCount": increment(1),
      [`inventory.collectionCounts.${drawnCard.id}`]: currentCount + 1
    });

    // If hand is not full, add to hand
    if (userData.inventory.hand.length < 3) {
      await updateDoc(userRef, {
        "inventory.hand": arrayUnion(drawnCard.id)
      });
    }

    // Add to activity feed
    if (currentMatch) {
      await updateDoc(doc(db, "matches", currentMatch.matchId), {
        activityFeed: arrayUnion(`${userData.displayName} completed focus session and earned ${drawnCard.emoji} ${drawnCard.name}!`)
      });
    }

    setRewardCard(drawnCard);
    setTimeout(() => setRewardCard(null), 5000);
  };

  const playCard = async (cardId: string) => {
    if (!user || !userData || !currentMatch || activeSession) {
      showNotification("⚠️ Cannot play cards during focus session!");
      return;
    }

    if (!selectedTarget) {
      showNotification("⚠️ Select a target first!");
      return;
    }

    const card = getCard(cardId);
    if (!card) return;

    // Remove card from hand
    const newHand = userData.inventory.hand.filter(c => c !== cardId);
    await updateDoc(doc(db, "users", user.uid), {
      "inventory.hand": newHand
    });

    // Apply card effect
    const matchRef = doc(db, "matches", currentMatch.matchId);
    const targetName = participantNames[selectedTarget] || selectedTarget;
    
    if (card.type === "attack") {
      const targetHp = currentMatch.hp[selectedTarget] || 100;
      const newHp = Math.max(0, targetHp - card.value);
      
      await updateDoc(matchRef, {
        [`hp.${selectedTarget}`]: newHp,
        [`alive.${selectedTarget}`]: newHp > 0,
        eventSeq: increment(1),
        activityFeed: arrayUnion(`${userData.displayName} used ${card.emoji} ${card.name} on ${targetName} (-${card.value} HP)`)
      });
    } else if (card.type === "heal" || card.type === "defend") {
      const myHp = currentMatch.hp[user.uid] || 100;
      const newHp = Math.min(100, myHp + card.value);
      
      await updateDoc(matchRef, {
        [`hp.${user.uid}`]: newHp,
        eventSeq: increment(1),
        activityFeed: arrayUnion(`${userData.displayName} used ${card.emoji} ${card.name} (+${card.value} HP)`)
      });
    }

    showNotification(`✅ Played ${card.emoji} ${card.name}!`);
    setSelectedTarget("");
  };

  const drawNewCard = async () => {
    if (!user || !userData) return;

    if (userData.inventory.hand.length >= 3) {
      showNotification("⚠️ Hand is full! Play a card first.");
      return;
    }

    // Get a random card from collection
    const collectionIds = Object.keys(userData.inventory.collectionCounts).filter(
      id => userData.inventory.collectionCounts[id] > 0
    );

    if (collectionIds.length === 0) {
      showNotification("⚠️ No cards in collection! Complete focus sessions to earn cards.");
      return;
    }

    const randomCardId = collectionIds[Math.floor(Math.random() * collectionIds.length)];
    
    await updateDoc(doc(db, "users", user.uid), {
      "inventory.hand": arrayUnion(randomCardId)
    });

    showNotification(`✅ Drew ${getCard(randomCardId)?.emoji} ${getCard(randomCardId)?.name}!`);
  };

  const copyMatchId = () => {
    if (currentMatch) {
      navigator.clipboard.writeText(currentMatch.matchId);
      showNotification("📋 Match ID copied to clipboard!");
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
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={userData.photoURL} alt="avatar" className="w-12 h-12 rounded-full border-2 border-white" />
            <div>
              <h1 className="text-2xl font-bold">{userData.displayName}</h1>
              <p className="text-sm text-gray-300">Code: {userData.friendCode}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition">
            Logout
          </button>
        </div>
      </div>

      {/* Chest Reward Modal */}
      {showChestReward && chestReward && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg p-8 max-w-md w-full border-4 border-yellow-400 animate-bounce">
            <div className="text-center">
              <div className="text-8xl mb-4">{getChest(chestReward.chest).emoji}</div>
              <h2 className="text-3xl font-bold mb-2">{getChest(chestReward.chest).name}</h2>
              <p className="text-xl mb-6">You received {chestReward.cards.length} cards!</p>
              
              <div className="space-y-3 mb-6">
                {chestReward.cards.map((card, idx) => (
                  <div key={idx} className="bg-black/30 p-3 rounded flex items-center justify-between">
                    <span className="text-lg">{card.emoji} {card.name}</span>
                    <span className="text-sm uppercase" style={{
                      color: card.rarity === 'epic' ? '#a855f7' : card.rarity === 'rare' ? '#3b82f6' : '#9ca3af'
                    }}>{card.rarity}</span>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => setShowChestReward(false)}
                className="bg-green-500 px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition text-lg"
              >
                Awesome! 🎉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Match Confirmation */}
      {showEndMatchConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 border-red-500">
            <h2 className="text-2xl font-bold mb-4">End Match?</h2>
            <p className="text-gray-300 mb-6">Are you sure you want to end this match? All players will receive chest rewards based on their placement.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowEndMatchConfirm(false)}
                className="flex-1 bg-gray-600 px-4 py-2 rounded hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button 
                onClick={endMatch}
                className="flex-1 bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition font-bold"
              >
                End Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emote Panel */}
      {showEmotes && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">😎 Emotes</h2>
              <button onClick={() => setShowEmotes(false)} className="text-2xl">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold mb-2 text-red-400">🔥 Taunts</h3>
                <div className="grid grid-cols-1 gap-2">
                  {EMOTES.filter(e => e.category === "taunt").map(emote => (
                    <button
                      key={emote.id}
                      onClick={() => sendEmote(emote)}
                      className="bg-red-900/50 hover:bg-red-800 p-3 rounded text-left transition"
                    >
                      <span className="text-xl mr-2">{emote.emoji}</span>
                      {emote.text}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-2 text-blue-400">💪 Flex</h3>
                <div className="grid grid-cols-1 gap-2">
                  {EMOTES.filter(e => e.category === "flex").map(emote => (
                    <button
                      key={emote.id}
                      onClick={() => sendEmote(emote)}
                      className="bg-blue-900/50 hover:bg-blue-800 p-3 rounded text-left transition"
                    >
                      <span className="text-xl mr-2">{emote.emoji}</span>
                      {emote.text}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-2 text-green-400">👍 Encourage</h3>
                <div className="grid grid-cols-1 gap-2">
                  {EMOTES.filter(e => e.category === "encourage").map(emote => (
                    <button
                      key={emote.id}
                      onClick={() => sendEmote(emote)}
                      className="bg-green-900/50 hover:bg-green-800 p-3 rounded text-left transition"
                    >
                      <span className="text-xl mr-2">{emote.emoji}</span>
                      {emote.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-bounce">
          {notification}
        </div>
      )}

      {/* Reward Notification */}
      {rewardCard && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-8 py-4 rounded-lg shadow-2xl animate-bounce z-50">
          <p className="text-2xl font-bold">🎉 Reward: {rewardCard.emoji} {rewardCard.name}</p>
          <p className="text-sm">{rewardCard.description}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Match Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Match */}
          {currentMatch ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">⚔️ Active Match</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowEmotes(true)} className="bg-purple-500 px-3 py-1 rounded text-sm hover:bg-purple-600 transition">
                    😎 Emotes
                  </button>
                  <button onClick={copyMatchId} className="bg-blue-500 px-3 py-1 rounded text-sm hover:bg-blue-600 transition">
                    📋 Copy ID
                  </button>
                  <button onClick={() => setShowEndMatchConfirm(true)} className="bg-red-500 px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                    🏁 End Match
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-2">Match ID: <span className="font-mono bg-black/30 px-2 py-1 rounded">{currentMatch.matchId}</span></p>
              <p className="text-sm text-gray-300 mb-4">⏰ Time Remaining: <span className="font-bold text-yellow-400">{timeRemaining}</span></p>
              
              <div className="space-y-2">
                <h3 className="font-bold text-lg mb-3">🏆 Leaderboard:</h3>
                {currentMatch.participants
                  .sort((a, b) => (currentMatch.hp[b] || 0) - (currentMatch.hp[a] || 0))
                  .map((uid, index) => (
                  <div key={uid} className={`flex justify-between items-center p-4 rounded transition ${
                    uid === user?.uid ? 'bg-blue-600/50 border-2 border-blue-400' : 'bg-black/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <span className="font-bold">{participantNames[uid] || uid}</span>
                        {uid === user?.uid && <span className="ml-2 text-yellow-400">(You)</span>}
                        {activeSessions[uid] && (
                          <div className="text-xs text-green-400 mt-1">
                            🎯 Focusing ({activeSessions[uid].durationMin}min)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-red-400 font-bold">❤️ {currentMatch.hp[uid] || 0} HP</div>
                        <div className="w-32 h-2 bg-gray-700 rounded-full mt-1">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all"
                            style={{ width: `${currentMatch.hp[uid] || 0}%` }}
                          />
                        </div>
                      </div>
                      {!currentMatch.alive[uid] && <span className="text-2xl">💀</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="font-bold mb-3 text-lg">📜 Activity Feed:</h3>
                <div className="bg-black/30 p-4 rounded max-h-48 overflow-y-auto space-y-2">
                  {currentMatch.activityFeed.slice(-10).reverse().map((activity, idx) => (
                    <div key={idx} className="text-sm text-gray-300 border-l-2 border-blue-500 pl-3 py-1">
                      {activity}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">🎮 No Active Match</h2>
              <p className="text-gray-300 mb-6">Create a new match or join an existing one to start battling!</p>
              <div className="space-y-4">
                <button
                  onClick={() => setShowCreateMatch(!showCreateMatch)}
                  className="w-full bg-green-500 px-4 py-3 rounded hover:bg-green-600 font-bold transition"
                >
                  + Create New Match
                </button>

                {showCreateMatch && (
                  <div className="bg-black/30 p-4 rounded space-y-3 border border-green-500/30">
                    <select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value as "duo" | "group")}
                      className="w-full bg-gray-800 px-3 py-2 rounded text-white"
                    >
                      <option value="duo">⚔️ 1v1 Duel</option>
                      <option value="group">👥 Group Battle</option>
                    </select>
                    <button onClick={createMatch} className="w-full bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition">
                      Create Match
                    </button>
                  </div>
                )}

                <div className="border-t border-gray-600 pt-4">
                  <p className="text-sm text-gray-400 mb-2">Have a Match ID?</p>
                  <input
                    type="text"
                    placeholder="Enter Match ID to join"
                    value={joinMatchId}
                    onChange={(e) => setJoinMatchId(e.target.value)}
                    className="w-full bg-gray-800 px-3 py-2 rounded mb-2 text-white"
                  />
                  <button onClick={joinMatch} className="w-full bg-purple-500 px-4 py-2 rounded hover:bg-purple-600 transition">
                    Join Match
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Focus Session */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4">🎯 Focus Session</h2>
            
            {activeSession ? (
              <div className="text-center">
                <div className="text-6xl font-bold mb-4 text-green-400">{sessionTimeRemaining}</div>
                <p className="text-gray-300 text-lg mb-2">Session in progress... Stay focused!</p>
                <p className="text-sm text-gray-400">Duration: {activeSession.durationMin} minutes</p>
                <div className="mt-4 w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 animate-pulse" style={{width: '100%'}} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-300 mb-4">Choose your focus duration and earn rewards!</p>
                <div className="grid grid-cols-3 gap-3">
                  {[20, 40, 67].map(duration => (
                    <button
                      key={duration}
                      onClick={() => setSelectedDuration(duration as 20 | 40 | 67)}
                      className={`px-4 py-4 rounded font-bold transition ${
                        selectedDuration === duration
                          ? "bg-blue-500 scale-105 shadow-lg"
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      <div className="text-2xl mb-1">{duration}</div>
                      <div className="text-xs">minutes</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={startFocusSession}
                  disabled={!currentMatch}
                  className="w-full bg-green-500 px-4 py-3 rounded hover:bg-green-600 font-bold disabled:bg-gray-600 disabled:cursor-not-allowed transition text-lg"
                >
                  🚀 Start Focus Session
                </button>
                {!currentMatch && (
                  <p className="text-sm text-yellow-400 text-center">⚠️ Join a match first!</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Cards */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold mb-4">📊 Stats</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Minutes:</span>
                <span className="font-bold text-green-400">{userData.stats.totalMinutes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sessions:</span>
                <span className="font-bold text-blue-400">{userData.stats.sessionsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Cards Collected:</span>
                <span className="font-bold text-purple-400">{Object.keys(userData.inventory.collectionCounts).length}</span>
              </div>
            </div>
          </div>

          {/* Hand */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🃏 Hand ({userData.inventory.hand.length}/3)</h2>
              <button
                onClick={drawNewCard}
                disabled={userData.inventory.hand.length >= 3 || activeSession !== null}
                className="bg-blue-500 px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
              >
                + Draw
              </button>
            </div>
            
            <div className="space-y-3">
              {userData.inventory.hand.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No cards in hand. Draw a card!</p>
              ) : (
                userData.inventory.hand.map((cardId, idx) => {
                  const card = getCard(cardId);
                  if (!card) return null;
                  
                  return (
                    <div key={idx} className={`p-4 rounded border-2 transition hover:scale-105 ${
                      card.rarity === 'epic' ? 'bg-purple-900/50 border-purple-500' :
                      card.rarity === 'rare' ? 'bg-blue-900/50 border-blue-500' :
                      'bg-gray-800/50 border-gray-500'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-lg">{card.emoji} {card.name}</p>
                          <p className="text-xs uppercase tracking-wide" style={{
                            color: card.rarity === 'epic' ? '#a855f7' : card.rarity === 'rare' ? '#3b82f6' : '#9ca3af'
                          }}>{card.rarity}</p>
                        </div>
                        <span className="text-3xl font-bold">{card.value}</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{card.description}</p>
                      <button
                        onClick={() => playCard(cardId)}
                        disabled={activeSession !== null || !currentMatch}
                        className="w-full bg-red-500 px-3 py-2 rounded text-sm hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-bold"
                      >
                        ⚡ Play Card
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {userData.inventory.hand.length >= 3 && (
              <p className="text-yellow-400 text-sm mt-3 text-center">⚠️ Hand full! Play a card first.</p>
            )}
          </div>

          {/* Target Selection */}
          {currentMatch && !activeSession && currentMatch.participants.length > 1 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4">🎯 Select Target</h2>
              <div className="space-y-2">
                {currentMatch.participants.filter(uid => uid !== user?.uid && currentMatch.alive[uid]).map(uid => (
                  <button
                    key={uid}
                    onClick={() => setSelectedTarget(uid)}
                    className={`w-full px-4 py-3 rounded transition font-bold ${
                      selectedTarget === uid ? "bg-red-500 scale-105" : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    {participantNames[uid] || uid} ({currentMatch.hp[uid]} HP)
                  </button>
                ))}
              </div>
              {selectedTarget && (
                <p className="text-green-400 text-sm mt-3 text-center">✓ Target: {participantNames[selectedTarget]}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
