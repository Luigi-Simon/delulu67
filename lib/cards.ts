// lib/cards.ts - Card System Definition

export type CardRarity = "common" | "rare" | "epic";
export type CardType = "attack" | "defend" | "heal";

export interface Card {
  id: string;
  name: string;
  rarity: CardRarity;
  type: CardType;
  value: number; // damage for attack, HP for defend/heal
  description: string;
  emoji: string;
}

// Card Database
export const CARDS: Record<string, Card> = {
  // COMMON CARDS (60% drop rate)
  card_focus_blast: {
    id: "card_focus_blast",
    name: "Focus Blast",
    rarity: "common",
    type: "attack",
    value: 10,
    description: "Deal 10 damage to target",
    emoji: "⚡"
  },
  card_quick_shield: {
    id: "card_quick_shield",
    name: "Quick Shield",
    rarity: "common",
    type: "defend",
    value: 5,
    description: "Gain 5 HP",
    emoji: "🛡️"
  },
  card_study_strike: {
    id: "card_study_strike",
    name: "Study Strike",
    rarity: "common",
    type: "attack",
    value: 8,
    description: "Deal 8 damage to target",
    emoji: "📚"
  },
  card_coffee_boost: {
    id: "card_coffee_boost",
    name: "Coffee Boost",
    rarity: "common",
    type: "heal",
    value: 7,
    description: "Restore 7 HP",
    emoji: "☕"
  },

  // RARE CARDS (30% drop rate)
  card_power_strike: {
    id: "card_power_strike",
    name: "Power Strike",
    rarity: "rare",
    type: "attack",
    value: 20,
    description: "Deal 20 damage to target",
    emoji: "💥"
  },
  card_healing_wave: {
    id: "card_healing_wave",
    name: "Healing Wave",
    rarity: "rare",
    type: "heal",
    value: 15,
    description: "Restore 15 HP",
    emoji: "💚"
  },
  card_iron_wall: {
    id: "card_iron_wall",
    name: "Iron Wall",
    rarity: "rare",
    type: "defend",
    value: 12,
    description: "Gain 12 HP",
    emoji: "🏰"
  },
  card_brain_blast: {
    id: "card_brain_blast",
    name: "Brain Blast",
    rarity: "rare",
    type: "attack",
    value: 18,
    description: "Deal 18 damage to target",
    emoji: "🧠"
  },

  // EPIC CARDS (10% drop rate)
  card_mega_blast: {
    id: "card_mega_blast",
    name: "Mega Blast",
    rarity: "epic",
    type: "attack",
    value: 35,
    description: "Deal 35 damage to target",
    emoji: "🔥"
  },
  card_divine_shield: {
    id: "card_divine_shield",
    name: "Divine Shield",
    rarity: "epic",
    type: "defend",
    value: 30,
    description: "Gain 30 HP",
    emoji: "✨"
  },
  card_phoenix_heal: {
    id: "card_phoenix_heal",
    name: "Phoenix Heal",
    rarity: "epic",
    type: "heal",
    value: 25,
    description: "Restore 25 HP",
    emoji: "🔆"
  },
  card_ultimate_strike: {
    id: "card_ultimate_strike",
    name: "Ultimate Strike",
    rarity: "epic",
    type: "attack",
    value: 40,
    description: "Deal 40 damage to target",
    emoji: "⚔️"
  }
};

// Rarity Drop Rates based on focus session duration
export const RARITY_TABLE = {
  20: { common: 0.75, rare: 0.20, epic: 0.05 },  // 20 min session
  40: { common: 0.60, rare: 0.30, epic: 0.10 },  // 40 min session
  67: { common: 0.45, rare: 0.35, epic: 0.20 }   // 67 min session (best odds)
};

// Get random card based on rarity weights
export function drawCard(durationMin: 20 | 40 | 67): Card {
  const rarityWeights = RARITY_TABLE[durationMin];
  const rand = Math.random();
  
  let rarity: CardRarity;
  if (rand < rarityWeights.epic) {
    rarity = "epic";
  } else if (rand < rarityWeights.epic + rarityWeights.rare) {
    rarity = "rare";
  } else {
    rarity = "common";
  }

  // Filter cards by rarity
  const cardsOfRarity = Object.values(CARDS).filter(c => c.rarity === rarity);
  const randomCard = cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];
  
  return randomCard;
}

// Get card by ID
export function getCard(cardId: string): Card | undefined {
  return CARDS[cardId];
}

// Get all cards as array
export function getAllCards(): Card[] {
  return Object.values(CARDS);
}
