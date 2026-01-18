"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { drawCard, getCard, Card } from "../../../lib/cards";
import { openChest, determineChestReward, getChest, ChestType } from "../../../lib/chests";
import { EMOTES, Emote } from "../../../lib/emotes";
import { FocusDuration, FocusSessionData, MatchData, UserData } from "../../../lib/types";
import { useTimedMessage } from "../../../lib/useTimedMessage";

export default function MatchPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [activeSession, setActiveSession] = useState<FocusSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<string>("");
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [activeSessions, setActiveSessions] = useState<Record<string, FocusSessionData>>({});
  
  // UI States
  const [selectedDuration, setSelectedDuration] = useState<FocusDuration>(20);
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [rewardCard, setRewardCard] = useState<Card | null>(null);
  const { message: notification, showMessage: showNotification } = useTimedMessage();
  const [showEmotes, setShowEmotes] = useState(false);
  const [showChestReward, setShowChestReward] = useState(false);
  const [chestReward, setChestReward] = useState<{ chest: ChestType; cards: Card[] } | null>(null);
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [damageAnimation, setDamageAnimation] = useState<{uid: string, value: number} | null>(null);

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

  // Load match data
  useEffect(() => {
    if (!matchId) return;

    const matchRef = doc(db, "matches", matchId);
    const unsubscribe = onSnapshot(matchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as MatchData;
        setMatchData({ ...data, matchId: snapshot.id });
        
        if (data.status === "finished") {
          setTimeout(() => {
            router.push("/dashboard");
          }, 5000);
        }
      } else {
        router.push("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [matchId, router]);

  // Load participant names
  useEffect(() => {
    if (!matchData) return;

    const loadParticipantNames = async () => {
      const names: Record<string, string> = {};
      for (const uid of matchData.participants) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          names[uid] = userDoc.data().displayName || uid;
        }
      }
      setParticipantNames(names);
    };

    loadParticipantNames();
  }, [matchData]);

  // Load all active sessions in match
  useEffect(() => {
    if (!matchData) return;

    const sessionsRef = collection(db, "focusSessions");
    const q = query(
      sessionsRef,
      where("matchId", "==", matchData.matchId),
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
  }, [matchData]);

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
    if (!matchData) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const endTime = matchData.endsAt?.toDate?.()?.getTime() || now;
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
  }, [matchData]);

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

  const sendEmote = async (emote: Emote) => {
    if (!user || !userData || !matchData) return;

    await updateDoc(doc(db, "matches", matchData.matchId), {
      activityFeed: arrayUnion(`${emote.emoji} ${userData.displayName}: "${emote.text}"`)
    });

    setShowEmotes(false);
    showNotification(`Sent: ${emote.emoji} ${emote.text}`);
  };

  const startFocusSession = async () => {
    if (!user || !matchData) {
      showNotification("⚠️ Error starting session!");
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
      matchId: matchData.matchId,
      durationMin: selectedDuration,
      startServerTime: serverTimestamp(),
      status: "running",
      result: { rewardGranted: false, droppedCard: null }
    };

    await setDoc(doc(db, "focusSessions", sessionId), sessionData);
    
    if (userData) {
      const displayDuration = selectedDuration === 0.17 ? '10sec' : `${selectedDuration}min`;
      await updateDoc(doc(db, "matches", matchData.matchId), {
        activityFeed: arrayUnion(`${userData.displayName} started a ${displayDuration} focus session 🎯`)
      });
    }
    
    const displayDuration = selectedDuration === 0.17 ? '10 seconds' : `${selectedDuration} minutes`;
    showNotification(`🎯 Focus session started! Duration: ${displayDuration}`);
  };

  const cancelFocusSession = async () => {
    if (!activeSession || !user || !userData) return;

    setShowCancelConfirm(false);

    await updateDoc(doc(db, "focusSessions", activeSession.sessionId), {
      status: "cancelled",
      endTime: serverTimestamp(),
      "result.rewardGranted": false,
      "result.droppedCard": null
    });

    if (matchData) {
      await updateDoc(doc(db, "matches", matchData.matchId), {
        activityFeed: arrayUnion(`${userData.displayName} quit their focus session early ❌ (No rewards)`)
      });
    }

    showNotification("❌ Session cancelled. No rewards earned.");
  };

  const handleSessionComplete = async () => {
    if (!activeSession || !user || !userData) return;

    const drawnCard = drawCard(activeSession.durationMin);
    
    await updateDoc(doc(db, "focusSessions", activeSession.sessionId), {
      status: "completed",
      endTime: serverTimestamp(),
      "result.rewardGranted": true,
      "result.droppedCard": drawnCard.id
    });

    const userRef = doc(db, "users", user.uid);
    const currentCount = userData.inventory.collectionCounts[drawnCard.id] || 0;
    
    await updateDoc(userRef, {
      "stats.totalMinutes": increment(activeSession.durationMin),
      "stats.sessionsCount": increment(1),
      [`inventory.collectionCounts.${drawnCard.id}`]: currentCount + 1
    });

    if (userData.inventory.hand.length < 3) {
      await updateDoc(userRef, {
        "inventory.hand": arrayUnion(drawnCard.id)
      });
    }

    if (matchData) {
      await updateDoc(doc(db, "matches", matchData.matchId), {
        activityFeed: arrayUnion(`${userData.displayName} completed focus session and earned ${drawnCard.emoji} ${drawnCard.name}!`)
      });
    }

    setRewardCard(drawnCard);
    setTimeout(() => setRewardCard(null), 5000);
  };

  const endMatch = async () => {
    if (!user || !userData || !matchData) return;

    setShowEndMatchConfirm(false);

    const rankings = matchData.participants
      .map(uid => ({ uid, hp: matchData.hp[uid] || 0 }))
      .sort((a, b) => b.hp - a.hp);

    for (let i = 0; i < rankings.length; i++) {
      const participant = rankings[i];
      const placement = i + 1;
      const chestType = determineChestReward(placement, rankings.length, 1);
      const cards = openChest(chestType);

      const userRef = doc(db, "users", participant.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updates: any = {};

        cards.forEach(card => {
          const currentCount = userData.inventory?.collectionCounts?.[card.id] || 0;
          updates[`inventory.collectionCounts.${card.id}`] = currentCount + 1;
        });

        const currentHand = userData.inventory?.hand || [];
        const cardsToAdd = cards.slice(0, Math.max(0, 3 - currentHand.length));
        if (cardsToAdd.length > 0) {
          updates["inventory.hand"] = arrayUnion(...cardsToAdd.map(c => c.id));
        }

        await updateDoc(userRef, updates);
      }

      if (participant.uid === user.uid) {
        setChestReward({ chest: chestType, cards });
        setShowChestReward(true);
      }
    }

    await updateDoc(doc(db, "matches", matchData.matchId), {
      status: "finished",
      activityFeed: arrayUnion(`Match ended! Winner: ${participantNames[rankings[0].uid]}`)
    });

    showNotification("🏆 Match ended! Returning to lobby...");
  };

  const playCard = async (cardId: string) => {
    if (!user || !userData || !matchData || activeSession) {
      showNotification("⚠️ Cannot play cards during focus session!");
      return;
    }

    // Auto-target opponent in 1v1, or use selected target in group
    const opponent = matchData.participants.find(uid => uid !== user?.uid);
    const targetUid = matchData.type === "duo" ? opponent : selectedTarget;

    if (!targetUid) {
      showNotification("⚠️ Select a target first!");
      return;
    }

    const card = getCard(cardId);
    if (!card) return;

    const newHand = userData.inventory.hand.filter(c => c !== cardId);
    await updateDoc(doc(db, "users", user.uid), {
      "inventory.hand": newHand
    });

    const matchRef = doc(db, "matches", matchData.matchId);
    const targetName = participantNames[targetUid] || targetUid;
    
    if (card.type === "attack") {
      const targetHp = matchData.hp[targetUid] || 100;
      const newHp = Math.max(0, targetHp - card.value);
      
      // Show damage animation
      setDamageAnimation({ uid: targetUid, value: card.value });
      setTimeout(() => setDamageAnimation(null), 2000);
      
      await updateDoc(matchRef, {
        [`hp.${targetUid}`]: newHp,
        [`alive.${targetUid}`]: newHp > 0,
        eventSeq: increment(1),
        activityFeed: arrayUnion(`${userData.displayName} used ${card.emoji} ${card.name} on ${targetName} (-${card.value} HP)`)
      });
    } else if (card.type === "heal" || card.type === "defend") {
      const myHp = matchData.hp[user.uid] || 100;
      const newHp = Math.min(100, myHp + card.value);
      
      await updateDoc(matchRef, {
        [`hp.${user.uid}`]: newHp,
        eventSeq: increment(1),
        activityFeed: arrayUnion(`${userData.displayName} used ${card.emoji} ${card.name} (+${card.value} HP)`)
      });
    }

    showNotification(`✅ Played ${card.emoji} ${card.name}!`);
    if (matchData.type !== "duo") {
      setSelectedTarget("");
    }
  };

  // Draw card is now handled automatically after completing study sessions
  // This function is no longer used

  const copyMatchId = () => {
    if (matchData) {
      navigator.clipboard.writeText(matchData.matchId);
      showNotification("📋 Match ID copied to clipboard!");
    }
  };

  const leaveMatch = () => {
    router.push("/dashboard");
  };

  if (loading || !matchData || !userData) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="text-center">
        <div className="text-6xl mb-4">⚔️</div>
        <p className="text-xl">Loading match...</p>
      </div>
    </div>;
  }

  // Get opponent for 1v1 (or first opponent in group)
  const opponent = matchData.participants.find(uid => uid !== user?.uid);
  const myHp = matchData.hp[user?.uid || ""] || 0;
  const opponentHp = opponent ? (matchData.hp[opponent] || 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
      {/* All modals remain the same */}
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

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 border-red-500">
            <h2 className="text-2xl font-bold mb-4">🛑 Stop Studying?</h2>
            <p className="text-gray-300 mb-2">Are you sure you want to quit this focus session?</p>
            <div className="bg-red-500/20 border border-red-500 rounded p-3 mb-6">
              <p className="text-red-400 font-bold">⚠️ Warning: You will NOT receive any rewards!</p>
              <p className="text-sm text-gray-300 mt-1">Complete the session to earn your card.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 bg-green-600 px-4 py-2 rounded hover:bg-green-700 transition font-bold"
              >
                Keep Studying
              </button>
              <button 
                onClick={cancelFocusSession}
                className="flex-1 bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition font-bold"
              >
                Quit (No Rewards)
              </button>
            </div>
          </div>
        </div>
      )}

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

      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-bounce">
          {notification}
        </div>
      )}

      {rewardCard && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-8 py-4 rounded-lg shadow-2xl animate-bounce z-50">
          <p className="text-2xl font-bold">🎉 Reward: {rewardCard.emoji} {rewardCard.name}</p>
          <p className="text-sm">{rewardCard.description}</p>
        </div>
      )}
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button 
          onClick={leaveMatch}
          className="mb-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition flex items-center gap-2"
        >
          ← Back to Lobby
        </button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">⚔️ Battle Arena</h1>
            <div className="mb-2">
              <p className="text-xs text-gray-400">Match ID</p>
              <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                {matchData.matchId}
              </span>
            </div>
            <p className="text-sm text-gray-300">⏰ Time Remaining: <span className="font-bold text-yellow-400">{timeRemaining}</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEmotes(true)} className="bg-purple-500 px-4 py-2 rounded hover:bg-purple-600 transition">
              😎 Emotes
            </button>
            <button onClick={copyMatchId} className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition">
              📋 Copy ID
            </button>
            <button onClick={() => setShowEndMatchConfirm(true)} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition">
              🏁 End Match
            </button>
          </div>
        </div>
      </div>

      {/* Main Battle UI */}
      <div className="max-w-7xl mx-auto">
        {activeSession ? (
          /* Focus Session Full Screen */
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-12 border border-white/20 text-center">
            <div className="mb-6">
              <h3 className="text-3xl font-bold mb-2">📚 Focus Mode Active</h3>
              <p className="text-gray-300">Battle features are disabled. Study hard to earn your reward!</p>
            </div>
            <div className="text-8xl font-bold mb-6 text-green-400">{sessionTimeRemaining}</div>
            <p className="text-gray-300 text-xl mb-2">Session in progress... Stay focused!</p>
            <p className="text-sm text-gray-400 mb-6">Duration: {activeSession.durationMin === 0.17 ? '10 seconds' : `${activeSession.durationMin} minutes`}</p>
            <div className="max-w-md mx-auto">
              <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 animate-pulse" style={{width: '100%'}} />
              </div>
            </div>
            <div className="mt-8 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg max-w-md mx-auto">
              <p className="text-yellow-300 font-bold">⚠️ Study or Play - You can't do both!</p>
              <p className="text-sm text-gray-300 mt-1">Complete this session to unlock battle features and earn a card reward.</p>
            </div>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="mt-6 bg-red-500/80 hover:bg-red-600 px-6 py-3 rounded-lg font-bold transition"
            >
              🛑 Stop Studying (No Rewards)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left - Battle Cats Style Tower Defense */}
            <div className="lg:col-span-2 space-y-6">
              {/* Battlefield */}
              <div className="bg-gradient-to-b from-blue-900 to-green-900 rounded-lg p-6 border-4 border-yellow-400 relative overflow-hidden" style={{minHeight: '400px'}}>
                <h2 className="text-2xl font-bold mb-4 text-center text-yellow-300">🏰 BATTLEFIELD 🏰</h2>
                
                {/* Towers Container */}
                <div className="flex justify-between items-end h-64 relative">
                  {/* Your Tower (Left) */}
                  <div className="flex flex-col items-center relative">
                    <div className="text-sm font-bold mb-2 bg-blue-600 px-3 py-1 rounded-full">
                      YOU
                    </div>
                    <div className="relative">
                      {/* Tower */}
                      <div className="text-9xl filter drop-shadow-lg" style={{
                        opacity: myHp / 100
                      }}>
                        🏰
                      </div>
                      {/* HP Bar */}
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-32">
                        <div className="text-center mb-1">
                          <span className="text-2xl font-bold text-red-400">❤️ {myHp}</span>
                        </div>
                        <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden border-2 border-white">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-500"
                            style={{ width: `${myHp}%` }}
                          />
                        </div>
                      </div>
                      {myHp === 0 && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                          <span className="text-8xl">💀</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Battlefield Center */}
                  <div className="flex-1 mx-8 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-yellow-300 font-bold text-4xl">VS</p>
                    </div>
                  </div>

                  {/* Opponent Tower (Right) */}
                  {opponent && (
                    <div className="flex flex-col items-center relative">
                      <div className="text-sm font-bold mb-2 bg-red-600 px-3 py-1 rounded-full">
                        OPPONENT
                      </div>
                      <div className="relative">
                        {/* Tower */}
                        <div className="text-9xl filter drop-shadow-lg" style={{
                          opacity: opponentHp / 100
                        }}>
                          🏰
                        </div>
                        {/* HP Bar */}
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-32">
                          <div className="text-center mb-1">
                            <span className="text-2xl font-bold text-red-400">❤️ {opponentHp}</span>
                          </div>
                          <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden border-2 border-white">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-500"
                              style={{ width: `${opponentHp}%` }}
                            />
                          </div>
                        </div>
                        {/* Damage Animation */}
                        {damageAnimation && damageAnimation.uid === opponent && (
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full animate-bounce">
                            <span className="text-5xl font-bold text-red-500">-{damageAnimation.value}</span>
                          </div>
                        )}
                        {opponentHp === 0 && (
                          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                            <span className="text-8xl">💀</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Activity Feed at Bottom */}
                <div className="mt-12 bg-black/50 p-4 rounded max-h-32 overflow-y-auto">
                  <h3 className="font-bold mb-2 text-sm text-yellow-300">📜 Battle Log:</h3>
                  <div className="space-y-1">
                    {matchData.activityFeed.slice(-5).reverse().map((activity, idx) => (
                      <div key={idx} className="text-xs text-gray-300 border-l-2 border-yellow-500 pl-2">
                        {activity}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Focus Session */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h2 className="text-2xl font-bold mb-4">🎯 Focus Session</h2>
                <p className="text-gray-300 mb-4">Study to earn card rewards!</p>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => setSelectedDuration(0.17)}
                    className={`px-4 py-4 rounded font-bold transition ${
                      selectedDuration === 0.17
                        ? "bg-blue-500 scale-105 shadow-lg"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <div className="text-2xl mb-1">10</div>
                    <div className="text-xs">seconds</div>
                  </button>
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
                  className="w-full mt-4 bg-green-500 px-4 py-3 rounded hover:bg-green-600 font-bold transition text-lg"
                >
                  🚀 Start Focus Session
                </button>
              </div>
            </div>

            {/* Right - Cards */}
            <div className="space-y-6">
              {/* Target Selection - Only show for group matches */}
              {matchData.type === "group" && matchData.participants.length > 2 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <h2 className="text-xl font-bold mb-4">Target</h2>
                  <div className="space-y-2">
                    {matchData.participants.filter(uid => uid !== user?.uid && matchData.alive[uid]).map(uid => (
                      <button
                        key={uid}
                        onClick={() => setSelectedTarget(uid)}
                        className={`w-full px-4 py-3 rounded transition font-bold ${
                          selectedTarget === uid ? "bg-red-500 scale-105" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        {participantNames[uid] || uid} ({matchData.hp[uid]} HP)
                      </button>
                    ))}
                  </div>
                  {selectedTarget && (
                    <p className="text-green-400 text-sm mt-3 text-center">✓ Target Selected</p>
                  )}
                </div>
              )}

              {/* Hand */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Hand ({userData.inventory.hand.length}/3)</h2>
                  <span className="text-xs text-gray-400">Complete study sessions to draw cards</span>
                </div>
                
                <div className="space-y-3">
                  {userData.inventory.hand.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No cards in hand. Complete a study session to earn cards!</p>
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
                            disabled={!matchData}
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
                  <p className="text-yellow-400 text-sm mt-3 text-center">Hand full! Play a card to make room.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
