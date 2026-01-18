# Study Battle - Quick Testing Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Sign In (30 seconds)
1. Open: https://3000-ichprm6njaos5ip46jmiv-1ac38c93.sg1.manus.computer
2. Click "Sign in with Google"
3. Select your Google account
4. You'll be redirected to the dashboard

### Step 2: Create a Match (1 minute)
1. Click "+ Create New Match"
2. Select "1v1 Duel" or "Group Battle"
3. Click "Create Match"
4. Copy the Match ID from the alert (e.g., `match_1737143405123`)
5. Share with a friend to test multiplayer, or continue solo

### Step 3: Start Focus Session (2 minutes)
1. Select duration: **20 min** (fastest for testing)
2. Click "Start Focus Session"
3. Watch the countdown timer
4. **For quick testing**: Wait 20 minutes OR modify the duration in Firestore

### Step 4: Receive Reward (30 seconds)
1. When timer hits 0:00, you'll see a reward popup
2. Check your hand - new card should appear
3. Your stats will update (total minutes, session count)

### Step 5: Battle! (1 minute)
1. If you have opponents, select a target in the "Select Target" panel
2. Click on a card in your hand
3. Click "Play Card"
4. Watch the HP change in the leaderboard
5. Check the activity feed for your action

---

## 🧪 Advanced Testing Scenarios

### Test Scenario 1: Full Hand Mechanic
**Goal**: Verify hand limit of 3 cards

1. Complete 2 focus sessions (you'll have 2 starter cards + 2 rewards = 4 cards total)
2. Your hand should show 3 cards
3. Try to draw a card - you should see "Hand is full! Play a card first."
4. Play one card
5. Now draw should work

### Test Scenario 2: Multiplayer Match
**Goal**: Test real-time updates between players

**Player 1:**
1. Create a match
2. Copy the Match ID
3. Start a focus session

**Player 2:**
1. Join match using the Match ID
2. You should see Player 1 in the leaderboard
3. Start your own focus session

**Both players:**
- Watch each other's HP
- See activity feed updates in real-time
- Play cards and observe changes

### Test Scenario 3: Card Rarity Distribution
**Goal**: Verify rarity drop rates

Complete multiple sessions and track results:
- **20 min sessions**: Expect mostly Common cards (75%)
- **40 min sessions**: More Rare cards (30%)
- **67 min sessions**: Best chance for Epic cards (20%)

### Test Scenario 4: Match Timer
**Goal**: Verify 24-hour countdown

1. Create a match
2. Note the "Time Remaining" display
3. It should show approximately "23h 59m"
4. Refresh page - timer should persist

### Test Scenario 5: Death Mechanic
**Goal**: Test player elimination

1. Create a 1v1 match with a friend
2. Play attack cards on each other
3. Reduce opponent's HP to 0
4. Opponent should show "💀 Dead" status
5. Winner is determined by last alive

---

## 🐛 Common Issues & Solutions

### Issue: "You need to be in a match to start a focus session!"
**Solution**: Create or join a match first

### Issue: "Cannot play cards during focus session!"
**Solution**: Wait for your focus session to complete

### Issue: "Select a target first!"
**Solution**: Click on an opponent in the "Select Target" panel before playing attack cards

### Issue: "Hand is full! Play a card first."
**Solution**: Play one of your 3 cards before drawing a new one

### Issue: "No cards in collection!"
**Solution**: Complete at least one focus session to earn your first card

---

## 📊 Testing Checklist

Use this checklist to verify all features:

### Authentication
- [ ] Sign in with Google works
- [ ] User profile created on first login
- [ ] Redirected to dashboard after login
- [ ] Logout works
- [ ] Re-login shows existing data

### Match System
- [ ] Can create 1v1 match
- [ ] Can create group match
- [ ] Match ID is generated and displayed
- [ ] Can join match with valid ID
- [ ] Cannot join with invalid ID
- [ ] 24-hour timer displays correctly
- [ ] Leaderboard shows all participants
- [ ] HP values display correctly

### Focus Sessions
- [ ] Can select 20/40/67 minute duration
- [ ] Cannot start without being in a match
- [ ] Cannot start if already in a session
- [ ] Countdown timer works
- [ ] Timer persists on page refresh
- [ ] Session completes automatically
- [ ] Stats update after completion

### Card Rewards
- [ ] Card reward popup appears on completion
- [ ] Card added to collection
- [ ] Card added to hand (if space available)
- [ ] Collection counts increment
- [ ] Rarity distribution matches duration

### Battle Mechanics
- [ ] Hand displays up to 3 cards
- [ ] Can play cards when not in focus session
- [ ] Cannot play cards during focus session
- [ ] Attack cards damage target
- [ ] Heal cards restore own HP
- [ ] Defend cards increase own HP
- [ ] HP cannot go below 0
- [ ] HP cannot go above 100
- [ ] Dead players marked correctly
- [ ] Activity feed updates

### Card Drawing
- [ ] Can draw card from collection
- [ ] Cannot draw with full hand
- [ ] Cannot draw with empty collection
- [ ] Random card selected from collection

### Real-time Updates
- [ ] Match data updates in real-time
- [ ] HP changes visible to all players
- [ ] Activity feed updates for all players
- [ ] New participants appear immediately

---

## 🎮 Sample Test Flow (Complete Walkthrough)

**Time Required**: ~25 minutes

1. **[0:00]** Sign in with Google
2. **[0:30]** Click "Seed Database" to populate test data
3. **[1:00]** Create a new 1v1 match
4. **[1:30]** Start a 20-minute focus session
5. **[21:30]** Session completes, receive card reward
6. **[22:00]** Check hand - should have 3 cards (2 starter + 1 reward)
7. **[22:30]** Select a target (if multiplayer) or yourself for testing
8. **[23:00]** Play an attack card
9. **[23:30]** Check leaderboard - HP should have changed
10. **[24:00]** Draw a new card from collection
11. **[24:30]** Play a heal/defend card
12. **[25:00]** Verify all stats updated correctly

---

## 📱 Browser Compatibility

Tested on:
- ✅ Chrome 120+ (Recommended)
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+

Mobile:
- ⚠️ Works but UI not optimized (use desktop for best experience)

---

## 🔍 Debugging Tips

### Check Browser Console
Press F12 and look for:
- Firebase connection errors
- Authentication issues
- Firestore permission errors

### Check Firestore Database
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Verify collections: `users`, `matches`, `focusSessions`
4. Check document structure matches schema

### Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Look for failed requests
4. Check Firebase API calls

---

## 💡 Pro Tips for Testing

1. **Use Multiple Browser Profiles**: Test multiplayer by opening the app in different browser profiles (each can sign in with different Google accounts)

2. **Use Incognito Mode**: Test fresh user experience without cached data

3. **Monitor Firestore**: Keep Firebase Console open to watch real-time database changes

4. **Test Edge Cases**: 
   - Try to play cards with empty hand
   - Try to draw with full hand
   - Try to join non-existent match
   - Try to start session without match

5. **Performance Testing**: Open multiple tabs and perform actions simultaneously to test real-time sync

---

## 📞 Need Help?

If you encounter issues:
1. Check the console for errors
2. Verify Firebase connection
3. Ensure you're signed in
4. Try refreshing the page
5. Clear browser cache and retry

---

**Happy Testing! May the best studier win! 🏆**
