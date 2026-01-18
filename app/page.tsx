"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import SeedButton from "../components/SeedButton";
import { LoginButton } from "../components/LoginButton";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-8 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <h1 className="text-6xl font-bold mb-4">⚔️ Study Battle</h1>
      <p className="text-xl text-gray-300 mb-8">Focus. Fight. Win.</p>
      
      {/* 1. Login Button */}
      <LoginButton />

      <div className="border-t border-gray-700 w-full my-4"></div>

      {/* 2. Seed Button (For testing data) */}
      <SeedButton />
    </main>
  );
}