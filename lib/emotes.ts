// lib/emotes.ts - Emote System for Taunting

export interface Emote {
  id: string;
  text: string;
  emoji: string;
  category: "taunt" | "encourage" | "flex";
}

export const EMOTES: Emote[] = [
  // Taunts
  {
    id: "67_67_67",
    text: "67 67 67",
    emoji: "🔥",
    category: "taunt"
  },
  {
    id: "not_studying",
    text: "Haha you're not studying enough!",
    emoji: "😂",
    category: "taunt"
  },
  {
    id: "slacking",
    text: "Stop slacking!",
    emoji: "😴",
    category: "taunt"
  },
  {
    id: "too_easy",
    text: "This is too easy!",
    emoji: "😎",
    category: "taunt"
  },
  {
    id: "weak",
    text: "Is that all you got?",
    emoji: "💪",
    category: "taunt"
  },
  {
    id: "focus_harder",
    text: "Focus harder!",
    emoji: "🎯",
    category: "taunt"
  },
  
  // Encouragement
  {
    id: "good_luck",
    text: "Good luck!",
    emoji: "🍀",
    category: "encourage"
  },
  {
    id: "nice_try",
    text: "Nice try!",
    emoji: "👍",
    category: "encourage"
  },
  {
    id: "well_played",
    text: "Well played!",
    emoji: "👏",
    category: "encourage"
  },
  
  // Flex
  {
    id: "on_fire",
    text: "I'm on fire! 🔥🔥🔥",
    emoji: "🔥",
    category: "flex"
  },
  {
    id: "unstoppable",
    text: "Unstoppable!",
    emoji: "⚡",
    category: "flex"
  },
  {
    id: "epic_card",
    text: "Just got an EPIC card!",
    emoji: "✨",
    category: "flex"
  },
  {
    id: "grinding",
    text: "Grinding hard!",
    emoji: "💯",
    category: "flex"
  },
  {
    id: "study_beast",
    text: "Study beast mode activated!",
    emoji: "🦁",
    category: "flex"
  }
];

export function getEmoteById(id: string): Emote | undefined {
  return EMOTES.find(e => e.id === id);
}

export function getEmotesByCategory(category: "taunt" | "encourage" | "flex"): Emote[] {
  return EMOTES.filter(e => e.category === category);
}
