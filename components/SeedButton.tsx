"use client";

import { useState } from "react";
import { db } from "../app/firebase";
import { doc, writeBatch, collection } from "firebase/firestore";
import type { DashboardUserData, FocusSessionData, MatchData } from "../lib/types";

export default function SeedButton() {
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // --- A. Create Users ---
      const userRef1 = doc(db, "users", "user_1");
      const userRef2 = doc(db, "users", "user_2");

      const userData1: DashboardUserData = {
        uid: "user_1",
        displayName: "HackWizard",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wizard",
        friendCode: "HACK01",
        friends: ["user_2"],
        presence: "Studying",
        stats: { totalMinutes: 120, sessionsCount: 3 },
        inventory: {
          hand: ["card_fireball", "card_shield"],
          collectionCounts: { "card_fireball": 1 }
        }
      };

      const userData2: DashboardUserData = {
        uid: "user_2",
        displayName: "CodeNinja",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ninja",
        friendCode: "CODE99",
        friends: ["user_1"],
        presence: "Slacking",
        stats: { totalMinutes: 40, sessionsCount: 1 },
        inventory: {
          hand: ["card_heal"],
          collectionCounts: {}
        }
      };

      batch.set(userRef1, userData1);
      batch.set(userRef2, userData2);

      // --- B. Create Match ---
      const matchRef = doc(db, "matches", "match_alpha");
      
      const matchData: MatchData = {
        matchId: "match_alpha",
        type: "duo",
        createdAt: now,
        endsAt: tomorrow,
        status: "active",
        participants: ["user_1", "user_2"],
        hp: { "user_1": 100, "user_2": 80 },
        alive: { "user_1": true, "user_2": true },
        buffs: { "user_1": [], "user_2": [] },
        eventSeq: 1,
        activityFeed: ["Match Created", "Player 2 joined"]
      };

      batch.set(matchRef, matchData);

      // --- C. Create GameEvent (Sub-collection) ---
      const eventRef = doc(collection(db, "matches", "match_alpha", "events"));
      batch.set(eventRef, {
        eventId: eventRef.id,
        matchId: "match_alpha",
        seq: 1,
        timestamp: now,
        type: "ATTACK",
        payload: {
          attacker: "user_1",
          targets: ["user_2"],
          dmg: 20
        }
      });

      // --- D. Create Focus Session ---
      const sessionRef = doc(db, "focusSessions", "sess_01");
      const sessionData: FocusSessionData = {
        sessionId: "sess_01",
        uid: "user_1",
        matchId: "match_alpha",
        durationMin: 20,
        startServerTime: now,
        status: "running",
        result: { rewardGranted: false, droppedCard: null }
      };

      batch.set(sessionRef, sessionData);

      // --- E. Create Invite ---
      const inviteRef = doc(db, "invites", "inv_01");
      batch.set(inviteRef, {
        inviteId: "inv_01",
        fromUid: "user_1",
        toUids: ["user_3"],
        matchType: "group",
        status: "pending",
        createdAt: now
      });

      await batch.commit();
      alert("✅ Database populated!");

    } catch (error) {
      console.error("Error seeding:", error);
      alert("❌ Error. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // --- THIS WAS LIKELY MISSING IN YOUR CODE ---
  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
    >
      {loading ? "Seeding..." : "🌱 Seed Database"}
    </button>
  );
}
