# Convex Database & Authentication Integration

This app now uses Convex for database persistence and authentication. Here's what has been implemented:

## ✅ What's Been Added

### 1. **Convex Database Schema** (`convex/schema.ts`)
- `users` table - Stores user accounts
- `conversations` table - Stores chat conversations with metadata
- `messages` table - Stores individual messages within conversations

### 2. **Authentication System**
- **AuthProvider** (`providers/AuthProvider.tsx`) - Manages authentication state
- **AuthScreen** (`components/AuthScreen.tsx`) - Login/signup UI
- Google OAuth integration for web
- Automatic user creation on first login

### 3. **Database Functions**
- **auth.ts** - User authentication queries
- **conversations.ts** - CRUD operations for conversations
- **messages.ts** - Message creation and updates

### 4. **Updated ChatProvider**
- **ChatProviderWithConvex.tsx** - New provider that syncs with Convex
- Falls back to local storage when not authenticated
- Real-time sync of conversations and messages
- Streaming message updates to database

### 5. **App Integration**
- Updated `app/_layout.tsx` to show AuthScreen when not authenticated
- ConvexProvider wraps the entire app
- Authentication flow integrated

## 🚀 Setup Instructions

### Step 1: Install Convex CLI
```bash
npm install -g convex
```

### Step 2: Initialize Convex
```bash
npx convex dev
```

This will:
- Ask you to log in or create a Convex account
- Configure your project
- Generate TypeScript types
- Push your schema and functions

### Step 3: Configure Google OAuth

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your project
3. Go to Settings > Authentication
4. Add Google as an OAuth provider
5. Configure redirect URLs:
   - For web: `http://localhost:8081` (or your dev URL)
   - For production: Your production URL

### Step 4: Environment Variables

Your `.env.local` should have:
```
EXPO_PUBLIC_PROJECT_ID=your_convex_project_id
```

The project ID can be found in your Convex dashboard.

### Step 5: Run the App

```bash
# Terminal 1: Convex dev server (watches for changes)
npx convex dev

# Terminal 2: Expo dev server
npm start
```

## 📱 How It Works

### Authentication Flow
1. User opens app → sees AuthScreen if not logged in
2. User clicks "Sign in with Google"
3. Redirects to Google OAuth
4. After authentication, user is created in Convex database
5. App shows chat interface

### Data Sync Flow
1. **When authenticated:**
   - Conversations load from Convex database
   - New conversations saved to Convex
   - Messages synced in real-time
   - Updates propagate to all devices

2. **When not authenticated:**
   - Falls back to local storage (AsyncStorage/localStorage)
   - Data persists locally only
   - Can migrate to Convex after login

### Message Streaming
- User message saved immediately
- Assistant message created with `isStreaming: true`
- Content updated in batches during streaming
- Final message saved with `isStreaming: false`

## 🔧 Key Files

- `convex/schema.ts` - Database schema definition
- `convex/auth.ts` - Authentication functions
- `convex/conversations.ts` - Conversation CRUD
- `convex/messages.ts` - Message operations
- `providers/AuthProvider.tsx` - Auth context
- `providers/ChatProviderWithConvex.tsx` - Chat with Convex sync
- `components/AuthScreen.tsx` - Login UI
- `lib/convex.ts` - Convex client configuration

## 🐛 Troubleshooting

### "Not authenticated" errors
- Make sure `npx convex dev` is running
- Check Convex dashboard for OAuth configuration
- Verify `EXPO_PUBLIC_PROJECT_ID` in `.env.local`

### Type generation errors
- Run `npx convex dev` to regenerate types
- Check that all Convex functions are exported
- Verify `convex/_generated/` folder exists

### Database sync not working
- Check Convex dashboard logs
- Verify schema matches code
- Ensure user is authenticated
- Check network connectivity

### Google OAuth not working
- Verify OAuth is configured in Convex dashboard
- Check redirect URLs match your app URL
- Clear browser cache and try again

## 📝 Next Steps

1. **Run Convex setup:**
   ```bash
   npx convex dev
   ```

2. **Configure OAuth in dashboard**

3. **Test authentication:**
   - Start the app
   - Click "Sign in with Google"
   - Verify user is created in Convex

4. **Test data sync:**
   - Create a conversation
   - Send messages
   - Check Convex dashboard to see data

## 🔐 Security Notes

- All database operations are authenticated
- Users can only access their own conversations
- Convex handles all security automatically
- No API keys exposed to client

## 📚 Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex Authentication](https://docs.convex.dev/auth)
- [Convex React Integration](https://docs.convex.dev/client/react)
