// lib/matchId.ts - Beautiful Match ID Generator

const ADJECTIVES = [
  "EPIC", "MEGA", "SUPER", "ULTRA", "HYPER", "TURBO",
  "FIRE", "ICE", "STORM", "THUNDER", "LIGHTNING", "BLAZE",
  "DRAGON", "PHOENIX", "TITAN", "LEGEND", "MYSTIC", "COSMIC",
  "GOLDEN", "SILVER", "DIAMOND", "CRYSTAL", "ROYAL", "NOBLE",
  "SWIFT", "FIERCE", "BRAVE", "WILD", "BOLD", "MIGHTY",
  "STUDY", "FOCUS", "BRAIN", "SMART", "GENIUS", "WISE",
  "NINJA", "WARRIOR", "MASTER", "CHAMPION", "HERO", "BEAST"
];

const NOUNS = [
  "WOLF", "LION", "TIGER", "BEAR", "EAGLE", "HAWK",
  "DRAGON", "PHOENIX", "GRIFFIN", "HYDRA", "KRAKEN", "TITAN",
  "STORM", "BLAZE", "FROST", "THUNDER", "SHADOW", "LIGHT",
  "BLADE", "SHIELD", "CROWN", "STAR", "MOON", "SUN",
  "SAGE", "SCHOLAR", "WIZARD", "MONK", "KNIGHT", "SAMURAI",
  "QUEST", "BATTLE", "DUEL", "CLASH", "FIGHT", "WAR",
  "POWER", "FORCE", "MIGHT", "GLORY", "HONOR", "VALOR"
];

const NUMBERS = [
  "67", "42", "99", "777", "420", "360", "1337",
  "2024", "2025", "2026", "100", "200", "300"
];

/**
 * Generate a beautiful, memorable Match ID
 * Format: ADJECTIVE-NOUN-NUMBER
 * Examples: EPIC-DRAGON-67, STUDY-BEAST-2024, FIRE-TITAN-777
 */
export function generateMatchId(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
  
  return `${adjective}-${noun}-${number}`;
}

/**
 * Validate if a string is a valid Match ID format
 */
export function isValidMatchId(id: string): boolean {
  // Check format: WORD-WORD-NUMBER
  const pattern = /^[A-Z]+-[A-Z]+-\d+$/;
  return pattern.test(id);
}

/**
 * Format Match ID for display (adds styling hints)
 */
export function formatMatchId(id: string): string {
  return id.toUpperCase().replace(/_/g, '-');
}

/**
 * Generate a unique Match ID by checking against existing IDs
 * (In a real implementation, you'd check against the database)
 */
export function generateUniqueMatchId(): string {
  // For now, just generate one
  // In production, you'd loop until you find a unique one
  return generateMatchId();
}
