// app/page.tsx
import SeedButton from "../components/SeedButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Hack n Roll Dev</h1>
      
      {/* This renders your button component */}
      <SeedButton />
    </main>
  );
}