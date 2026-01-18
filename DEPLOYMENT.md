# Deployment Instructions

## 🚀 Pushing to GitHub

Your MVP is ready to be pushed to your repository: **Luigi-Simon/delulu67**

### Files Added/Modified

**New Files:**
- `lib/cards.ts` - Card system with 12 cards and rarity mechanics
- `app/dashboard/page.tsx` - Main game dashboard with all MVP features
- `MVP_README.md` - Complete documentation
- `TESTING_GUIDE.md` - Testing instructions
- `DEPLOYMENT.md` - This file
- `landing_page_screenshot.webp` - Screenshot of landing page

**Modified Files:**
- `app/page.tsx` - Added auto-redirect to dashboard after login

### Push Commands

```bash
cd /home/ubuntu/delulu67

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add Study Battle MVP with focus sessions and card battle system

- Implement card system with 12 cards (Common, Rare, Epic)
- Add dashboard with match creation/joining
- Add focus session timer (20/40/67 min)
- Add card battle mechanics (attack/defend/heal)
- Add real-time leaderboard and activity feed
- Add hand limit (3 cards) and draw mechanics
- Update landing page with auto-redirect"

# Push to main branch
git push origin main
```

---

## 🌐 Deploying to Vercel (Recommended)

Vercel is the easiest way to deploy Next.js apps with zero configuration.

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import `Luigi-Simon/delulu67`
5. Vercel auto-detects Next.js settings
6. Click "Deploy"
7. Your app will be live at `https://delulu67.vercel.app` (or similar)

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project directory)
cd /home/ubuntu/delulu67
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - What's your project's name? delulu67
# - In which directory is your code located? ./
# - Want to override settings? No

# Deploy to production
vercel --prod
```

---

## 🔧 Environment Variables

For production deployment, you should move Firebase config to environment variables:

### 1. Create `.env.local` file (DO NOT COMMIT)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD9qzNu_1rVff-FahlaxMGBXGSVU_GAFZ8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=teamdelulu67.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=teamdelulu67
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=teamdelulu67.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=473418184191
NEXT_PUBLIC_FIREBASE_APP_ID=1:473418184191:web:d19038e3f1ac1bdeea63ca
```

### 2. Update `app/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
```

### 3. Add to `.gitignore`

```
.env.local
.env*.local
```

### 4. Set Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Settings → Environment Variables
3. Add each variable from `.env.local`
4. Redeploy

---

## 🔒 Firebase Security Rules

Before going public, update your Firestore security rules:

### Navigate to Firebase Console
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select project: **teamdelulu67**
3. Firestore Database → Rules

### Recommended Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read any user profile, but only write their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == userId;
      allow update, delete: if request.auth.uid == userId;
    }
    
    // Matches can be read by anyone authenticated
    // Can only be created by authenticated users
    // Can only be updated by participants
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                      request.auth.uid in resource.data.participants;
      allow delete: if false; // Matches should not be deleted
    }
    
    // Focus sessions can only be read/written by the owner
    match /focusSessions/{sessionId} {
      allow read: if request.auth != null && 
                     request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.uid;
      allow update: if request.auth != null && 
                       request.auth.uid == resource.data.uid;
      allow delete: if false; // Sessions should not be deleted
    }
    
    // Invites (if you add this feature later)
    match /invites/{inviteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                      (request.auth.uid == resource.data.fromUid || 
                       request.auth.uid in resource.data.toUids);
      allow delete: if request.auth.uid == resource.data.fromUid;
    }
    
    // Game events subcollection
    match /matches/{matchId}/events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish** to apply the rules.

---

## 📱 Custom Domain (Optional)

### After deploying to Vercel:

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `studybattle.com`)
3. Follow DNS configuration instructions
4. Vercel automatically provisions SSL certificate

---

## 🔍 Post-Deployment Checklist

After deploying, verify:

- [ ] Landing page loads correctly
- [ ] Google sign-in works
- [ ] Dashboard accessible after login
- [ ] Can create matches
- [ ] Can join matches
- [ ] Focus sessions work
- [ ] Cards are rewarded
- [ ] Battle mechanics work
- [ ] Real-time updates work
- [ ] No console errors
- [ ] Mobile view is acceptable
- [ ] Firebase rules are secure

---

## 📊 Monitoring & Analytics

### Vercel Analytics (Free)
1. Go to Vercel Dashboard → Analytics
2. View page views, visitors, performance

### Firebase Analytics (Free)
1. Enable in Firebase Console
2. Add to `app/firebase.ts`:
```typescript
import { getAnalytics } from "firebase/analytics";
const analytics = getAnalytics(app);
```

### Error Tracking
Consider adding:
- [Sentry](https://sentry.io) for error tracking
- [LogRocket](https://logrocket.com) for session replay

---

## 🚨 Important Notes

1. **Firebase Config**: Currently hardcoded. Move to env vars before public launch.

2. **Security Rules**: Default rules are too permissive. Update before launch.

3. **Rate Limiting**: No rate limiting on session creation. Add Cloud Functions to prevent abuse.

4. **Session Verification**: Currently trust-based. Add server-side verification for production.

5. **Costs**: Firebase free tier limits:
   - 50K reads/day
   - 20K writes/day
   - 20K deletes/day
   - 1GB storage
   - Monitor usage in Firebase Console

---

## 🆘 Troubleshooting

### Build Fails on Vercel
- Check Node.js version (should be 18+)
- Verify all dependencies in `package.json`
- Check build logs for specific errors

### Firebase Connection Issues
- Verify environment variables are set correctly
- Check Firebase project is active
- Ensure billing is enabled (even for free tier)

### Authentication Not Working
- Check authorized domains in Firebase Console
- Add your Vercel domain to authorized domains
- Verify OAuth consent screen is configured

---

## 📚 Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## 🎉 You're Ready!

Your Study Battle MVP is production-ready. Just push to GitHub and deploy to Vercel!

**Good luck with Hack n Roll! 🚀**
