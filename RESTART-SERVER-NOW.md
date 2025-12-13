# 🚨 IMPORTANT: RESTART THE DEV SERVER NOW! 🚨

## Why?
I just updated `next.config.mjs` to explicitly expose the Google Maps API key to the browser.
Next.js only reads this config file when the server STARTS, not on hot reload.

## How to Restart:

### In Terminal 2 (where npm run dev is running):

1. **Stop the server:**
   Press `Ctrl+C` and wait for it to fully stop

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. **Wait for:**
   ```
   ✓ Ready in XXXXms
   ```

## Then on Mobile:

1. **Clear ALL browser cache** (important!):
   - **iOS**: Settings → Safari → Clear History and Website Data
   - **Android**: Chrome menu → Settings → Privacy → Clear browsing data → Select "Cached images and files" → Clear

2. **Force reload the page:**
   - Close the browser tab completely
   - Open a new tab
   - Go to: `http://homes.kids:3003/contacts/new`

## What Changed:

**Before:** Environment variables were being stripped out during build for mobile browsers
**After:** Explicitly configured Next.js to include `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in the client bundle

The error overlay will now check properly and the API key will be available on mobile!

---

**DO NOT SKIP THE SERVER RESTART - Hot reload won't work for config changes!**

