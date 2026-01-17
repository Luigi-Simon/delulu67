import SeedButton from "../components/SeedButton";
import { LoginButton } from "../components/LoginButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-8">
      <h1 className="text-4xl font-bold">Hack n Roll Dev</h1>
      
      {/* 1. Login Button */}
      <LoginButton />

      <div className="border-t border-gray-700 w-full my-4"></div>

      {/* 2. Seed Button (For testing data) */}
      <SeedButton />
    </main>
  );
}