"use client";
import { useState, useEffect } from "react";
// 1. Import db along with auth
import { auth, db } from "../app/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function LoginButton() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // 1. Pop up Google Login
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 2. Check if this user already exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // 3. IF NEW: Create the account with your Schema
        console.log("Creating new user profile...");
        
        const newUserData = {
          uid: user.uid,
          displayName: user.displayName || "Anonymous",
          photoURL: user.photoURL || "",
          // Generate a simple Friend Code from their UID
          friendCode: user.uid.slice(0, 6).toUpperCase(), 
          friends: [],
          presence: "Online", // Default status
          stats: { 
            totalMinutes: 0, 
            sessionsCount: 0 
          },
          inventory: {
            // Give them a Starter Deck!
            hand: ["card_focus_blast", "card_shield"], 
            collectionCounts: { "card_focus_blast": 1, "card_shield": 1 }
          }
        };

        await setDoc(userRef, newUserData);
        alert("🎉 Welcome! New account created with Starter Deck.");
      } else {
        console.log("Welcome back, existing user.");
      }

    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (user) {
    return (
      <button onClick={handleLogout} className="text-red-500 underline text-sm">
        Sign Out ({user.displayName})
      </button>
    );
  }

  return (
    <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition">
      Sign in with Google
    </button>
  );
}