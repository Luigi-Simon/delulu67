// lib/chests.ts - Chest Reward System

import { Card, CARDS, CardRarity } from './cards';

export type ChestType = "bronze" | "silver" | "gold" | "diamond";

export interface Chest {
  type: ChestType;
  name: string;
  emoji: string;
  cardCount: number;
  guaranteedRarity: CardRarity | null;
  rarityWeights: {
    common: number;
    rare: number;
    epic: number;
  };
}

// Chest definitions
export const CHESTS: Record<ChestType, Chest> = {
  bronze: {
    type: "bronze",
    name: "Bronze Chest",
    emoji: "📦",
    cardCount: 2,
    guaranteedRarity: null,
    rarityWeights: {
      common: 0.80,
      rare: 0.18,
      epic: 0.02
    }
  },
  silver: {
    type: "silver",
    name: "Silver Chest",
    emoji: "🎁",
    cardCount: 3,
    guaranteedRarity: "rare",
    rarityWeights: {
      common: 0.60,
      rare: 0.35,
      epic: 0.05
    }
  },
  gold: {
    type: "gold",
    name: "Gold Chest",
    emoji: "💎",
    cardCount: 4,
    guaranteedRarity: "rare",
    rarityWeights: {
      common: 0.40,
      rare: 0.45,
      epic: 0.15
    }
  },
  diamond: {
    type: "diamond",
    name: "Diamond Chest",
    emoji: "👑",
    cardCount: 5,
    guaranteedRarity: "epic",
    rarityWeights: {
      common: 0.20,
      rare: 0.50,
      epic: 0.30
    }
  }
};

// Determine chest type based on match performance
export function determineChestReward(
  placement: number,
  totalPlayers: number,
  matchDuration: number // in hours
): ChestType {
  // Winner gets best chest
  if (placement === 1) {
    if (totalPlayers >= 4) return "diamond";
    if (totalPlayers >= 2) return "gold";
    return "silver";
  }
  
  // Second place
  if (placement === 2) {
    if (totalPlayers >= 4) return "gold";
    return "silver";
  }
  
  // Third place and below
  if (placement === 3) {
    return "silver";
  }
  
  // Everyone else gets bronze
  return "bronze";
}

// Open a chest and get cards
export function openChest(chestType: ChestType): Card[] {
  const chest = CHESTS[chestType];
  const drawnCards: Card[] = [];
  const allCards = Object.values(CARDS);
  
  // First, add guaranteed rarity card if specified
  if (chest.guaranteedRarity) {
    const guaranteedCards = allCards.filter(c => c.rarity === chest.guaranteedRarity);
    const randomCard = guaranteedCards[Math.floor(Math.random() * guaranteedCards.length)];
    drawnCards.push(randomCard);
  }
  
  // Draw remaining cards
  const remainingCards = chest.guaranteedRarity ? chest.cardCount - 1 : chest.cardCount;
  
  for (let i = 0; i < remainingCards; i++) {
    const card = drawCardByWeight(chest.rarityWeights);
    drawnCards.push(card);
  }
  
  return drawnCards;
}

// Draw a card based on rarity weights
function drawCardByWeight(weights: { common: number; rare: number; epic: number }): Card {
  const rand = Math.random();
  const allCards = Object.values(CARDS);
  
  let rarity: CardRarity;
  if (rand < weights.epic) {
    rarity = "epic";
  } else if (rand < weights.epic + weights.rare) {
    rarity = "rare";
  } else {
    rarity = "common";
  }
  
  const cardsOfRarity = allCards.filter(c => c.rarity === rarity);
  return cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];
}

// Get chest by type
export function getChest(chestType: ChestType): Chest {
  return CHESTS[chestType];
}
