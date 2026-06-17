# Couples Connect — production-features build

This build keeps the Supabase URL and publishable key embedded in `index.html`, so users are not asked for cloud-sync setup on launch.

## Added

- Supabase Storage uploads for photos and call recordings.
- Encrypted media option for albums before upload.
- Encrypted browser-side private messages.
- Embedded WebRTC ICE configuration with STUN plus optional `window.TURN_SERVERS` array.
- Consent checkbox before call recording starts.
- Recording banner visible in the app while any participant marks recording active.
- Browser notifications for real-time updates where supported.
- Push-service-worker hooks and a `push_subscriptions` table for later server-side push delivery.
- New cache version to avoid old mobile PWA screens loading from cache.

## Required Supabase step

Run `supabase-schema.sql` in Supabase SQL Editor before deploying this version. It creates/updates the tables and the `couples-media` Storage bucket.

## TURN server

A real TURN service needs credentials from a provider. To add it, edit this in `index.html`:

```js
window.TURN_SERVERS = [
  { urls: 'turn:your-turn-domain:3478', username: 'USERNAME', credential: 'PASSWORD' }
];
```

The app will run without this using STUN, but some mobile networks will not connect calls reliably without TURN.

## Push notifications

The static app can request browser notification permission and show notifications while the app is open. True background push notifications require a small server/Edge Function to send Web Push messages to the subscriptions table. The client-side pieces and service worker hook are included.

## Security note

This is still a static demo using a publishable key and demo RLS policies. For a public app, add Supabase Auth and replace the demo policies with per-user access rules.
