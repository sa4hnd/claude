# Convex Setup Instructions

## Prerequisites
1. Install Convex CLI globally: `npm install -g convex`
2. Make sure you have your Convex project ID in `.env.local`:
   ```
   EXPO_PUBLIC_PROJECT_ID=your_project_id
   ```

## Setup Steps

### 1. Initialize Convex (if not already done)
```bash
npx convex dev
```

This will:
- Configure your Convex project
- Generate TypeScript types
- Push your schema and functions to Convex

### 2. Configure Authentication

You need to set up Google OAuth in your Convex dashboard:

1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Navigate to Settings > Authentication
3. Add Google as an OAuth provider
4. Configure the OAuth redirect URL for your app

### 3. Environment Variables

Make sure your `.env.local` has:
```
EXPO_PUBLIC_PROJECT_ID=your_convex_project_id
```

### 4. Run the Development Server

```bash
# Terminal 1: Start Convex dev server
npx convex dev

# Terminal 2: Start Expo
npm start
```

## Database Schema

The app uses the following Convex tables:
- `users` - User accounts
- `conversations` - Chat conversations
- `messages` - Messages within conversations

## Authentication Flow

1. User clicks "Sign in with Google"
2. Redirects to Google OAuth
3. After authentication, user is created/retrieved in Convex
4. All conversations and messages are synced to Convex database

## Features

- ✅ User authentication with Google OAuth
- ✅ Conversations saved to Convex database
- ✅ Messages synced in real-time
- ✅ Fallback to local storage when not authenticated
- ✅ Automatic user creation on first login

## Troubleshooting

### "Not authenticated" errors
- Make sure Convex dev server is running
- Check that OAuth is configured in Convex dashboard
- Verify `EXPO_PUBLIC_PROJECT_ID` is set correctly

### Type generation errors
- Run `npx convex dev` to regenerate types
- Make sure all Convex functions are properly exported

### Database sync issues
- Check Convex dashboard for errors
- Verify schema matches the code
- Check network connectivity
