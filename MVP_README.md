# Study Battle MVP - Documentation

## 🎮 Overview

**Study Battle** is a gamified study app that combines focus sessions with battle mechanics inspired by Clash Royale and Battle Cats. Users compete in 24-hour matches while earning cards through productive study sessions.

## 🌐 Live Demo

**URL**: https://3000-ichprm6njaos5ip46jmiv-1ac38c93.sg1.manus.computer

## ✨ Features Implemented

### 1. Authentication
- ✅ Google Sign-In integration
- ✅ Automatic user profile creation
- ✅ Starter deck (2 cards) on first login
- ✅ Friend code generation
- ✅ Auto-redirect to dashboard after login

### 2. Match System
- ✅ Create 1v1 or Group matches
- ✅ Join matches via Match ID
- ✅ 24-hour match timer
- ✅ Real-time HP tracking
- ✅ Leaderboard with alive/dead status
- ✅ Activity feed for all actions

### 3. Focus Sessions
- ✅ Three duration options: 20, 40, 67 minutes
- ✅ Live countdown timer
- ✅ Cannot play cards during focus
- ✅ Automatic reward distribution on completion
- ✅ Stats tracking (total minutes, session count)

### 4. Card Reward System
- ✅ Duration-based rarity table:
  - **20 min**: 75% Common, 20% Rare, 5% Epic
  - **40 min**: 60% Common, 30% Rare, 10% Epic
  - **67 min**: 45% Common, 35% Rare, 20% Epic
- ✅ 12 unique cards across 3 rarities
- ✅ Cards added to collection and hand
- ✅ Collection tracking with counts

### 5. Battle Mechanics
- ✅ Hand limit of 3 cards
- ✅ Draw cards from collection
- ✅ Play cards to attack/defend/heal
- ✅ Target selection system
- ✅ HP modification based on card effects
- ✅ Death/elimination tracking
- ✅ Cannot play during focus sessions
- ✅ Must play card if hand is full before drawing

### 6. Card Types

#### Common Cards (4)
- **Focus Blast** ⚡ - Attack: 10 damage
- **Quick Shield** 🛡️ - Defend: +5 HP
- **Study Strike** 📚 - Attack: 8 damage
- **Coffee Boost** ☕ - Heal: +7 HP

#### Rare Cards (4)
- **Power Strike** 💥 - Attack: 20 damage
- **Healing Wave** 💚 - Heal: +15 HP
- **Iron Wall** 🏰 - Defend: +12 HP
- **Brain Blast** 🧠 - Attack: 18 damage

#### Epic Cards (4)
- **Mega Blast** 🔥 - Attack: 35 damage
- **Divine Shield** ✨ - Defend: +30 HP
- **Phoenix Heal** 🔆 - Heal: +25 HP
- **Ultimate Strike** ⚔️ - Attack: 40 damage

## 🏗️ Technical Architecture

### Tech Stack
- **Framework**: Next.js 16.1.3 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google OAuth)
- **Hosting**: Vercel-ready (currently on sandbox)

### Database Schema

#### Users Collection
```typescript
{
  uid: string;
  displayName: string;
  photoURL: string;
  friendCode: string;
  friends: string[];
  presence: "Studying" | "Slacking" | "Offline";
  stats: {
    totalMinutes: number;
    sessionsCount: number;
  };
  inventory: {
    hand: string[];
    collectionCounts: Record<string, number>;
  };
}
```

#### Matches Collection
```typescript
{
  matchId: string;
  type: "duo" | "group";
  createdAt: Timestamp;
  endsAt: Timestamp;
  status: "active" | "finished";
  participants: string[];
  hp: Record<string, number>;
  alive: Record<string, boolean>;
  buffs: Record<string, any[]>;
  eventSeq: number;
  activityFeed: string[];
}
```

#### FocusSessions Collection
```typescript
{
  sessionId: string;
  uid: string;
  matchId: string;
  durationMin: 20 | 40 | 67;
  startServerTime: Timestamp;
  endTime?: Timestamp;
  status: "running" | "completed" | "failed" | "cancelled";
  result: {
    rewardGranted: boolean;
    droppedCard: string | null;
  };
}
```

### File Structure
```
delulu67/
├── app/
│   ├── firebase.ts          # Firebase configuration
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page with auth redirect
│   └── dashboard/
│       └── page.tsx         # Main game dashboard
├── components/
│   ├── LoginButton.tsx      # Google auth component
│   └── SeedButton.tsx       # Database seeding utility
├── lib/
│   └── cards.ts             # Card definitions and rarity system
└── functions/
    └── index.js             # Firebase Cloud Functions (if needed)
```

## 🎯 How to Use

### For Users

1. **Sign In**
   - Click "Sign in with Google"
   - Grant permissions
   - Automatically redirected to dashboard

2. **Create or Join a Match**
   - Click "+ Create New Match"
   - Choose 1v1 or Group
   - Share Match ID with friends
   - Or enter a Match ID to join existing match

3. **Start Focus Session**
   - Must be in an active match
   - Select duration (20/40/67 minutes)
   - Click "Start Focus Session"
   - Stay focused until timer completes

4. **Earn Rewards**
   - Session completes automatically
   - Receive a card based on duration
   - Card added to collection and hand (if space)
   - Stats updated

5. **Battle**
   - Select a target opponent
   - Play cards from your hand
   - Attack cards damage opponents
   - Defend/Heal cards restore your HP
   - Draw new cards when hand has space

6. **Win Condition**
   - Last player alive after 24 hours
   - Or highest HP when timer expires

### For Developers

#### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

#### Environment Setup
Firebase config is currently hardcoded in `app/firebase.ts`. For production:
1. Create `.env.local` file
2. Move Firebase config to environment variables
3. Update firebase.ts to use process.env

#### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🔧 Configuration

### Firebase Rules (Recommended)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid in resource.data.participants;
    }
    
    match /focusSessions/{sessionId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.uid;
    }
  }
}
```

## 🐛 Known Limitations (MVP)

1. **Session Verification**: No server-side verification that user actually focused (trust-based)
2. **Card Balance**: Card values not playtested, may need adjustment
3. **Match End**: No automatic match ending at 24 hours (manual check needed)
4. **Notifications**: No push notifications for match events
5. **Friends System**: Friend code exists but no friend request flow
6. **Mobile**: UI not fully optimized for mobile devices
7. **Error Handling**: Basic error messages, could be more descriptive

## 🚀 Future Enhancements

### Phase 2 Features
- [ ] Server-side focus session verification
- [ ] Push notifications for match events
- [ ] Friend request/accept system
- [ ] Card trading/gifting
- [ ] Achievements and badges
- [ ] Match history and statistics
- [ ] Spectator mode
- [ ] Tournament brackets

### Phase 3 Features
- [ ] Card upgrades/evolution
- [ ] Deck building (multiple decks)
- [ ] Daily quests and rewards
- [ ] Seasonal rankings
- [ ] In-app purchases (cosmetics)
- [ ] Social features (chat, emotes)
- [ ] Replay system

## 📊 Testing Checklist

- [x] Google sign-in works
- [x] User profile created on first login
- [x] Match creation (1v1 and group)
- [x] Match joining via ID
- [x] Focus session starts and counts down
- [x] Card reward distributed on completion
- [x] Cards appear in hand
- [x] Play card reduces hand count
- [x] Attack cards damage target
- [x] Heal/Defend cards increase HP
- [x] Draw card adds to hand
- [x] Hand limit enforced (3 cards)
- [x] Cannot play during focus session
- [x] Real-time updates across clients
- [x] Activity feed updates
- [x] Leaderboard shows correct HP

## 📝 License

This is a Hack n Roll hackathon project. All rights reserved to the team.

## 👥 Credits

- **Team**: Delulu67
- **Built with**: Manus AI Agent
- **Hackathon**: Hack n Roll 2026
- **Inspired by**: Clash Royale, Battle Cats

---

**Ready to battle? Focus hard, fight smart, and win! ⚔️**
