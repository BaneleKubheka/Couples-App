# Couples Connect

A mobile-friendly long-distance couples PWA for GitHub + Cloudflare Pages.

## What is included

- Removed the previous tagline/description text.
- Five-question profile setup.
- No biometric lock.
- Profile-based dashboards.
- Private partner cards.
- Consent-based profile linking using a profile/link code.
- Real-time cloud sync through Supabase Realtime.
- Interactive dashboard with moods, public notes and quick shared prompts.
- Personal and shared albums with image upload, viewing and download.
- Browser video/voice calls using WebRTC signalling through Supabase.
- Call recording using MediaRecorder, including local and remote media tracks where supported.
- Install-app banner before profile setup.
- iOS/Android browser responsive layout.

## Important limits

This is still a static web app. GitHub and Cloudflare Pages can host it for free, but true cross-device syncing requires a real-time backend. This package uses Supabase because it has a free tier and works with static hosting.

Call recording depends on browser support. Android Chrome generally supports MediaRecorder well. iOS Safari support varies by iOS version and may restrict mixed remote/local recording. The app saves recordings as `.webm`; iOS playback support may vary.

For large albums and many recordings, do not store files directly in database rows in production. This demo stores image/recording data as base64 to keep setup simple. For production, use Supabase Storage and store only file URLs in the `photos` and `recordings` tables.

## Deploy on Cloudflare Pages

1. Upload this folder to a GitHub repository.
2. Go to Cloudflare Pages.
3. Create a new project from the GitHub repository.
4. Build command: leave blank.
5. Output directory: `/` or leave as default for a static repo.
6. Deploy.
7. Open the deployed HTTPS URL on your phone.
8. Tap **Install app** or use the browser menu to add it to the home screen.

## Supabase setup

1. Create a free Supabase project.
2. Open the SQL editor.
3. Run the SQL in `supabase-schema.sql`.
4. Go to Project Settings > API.
5. Copy the Project URL and anon public key.
6. The supplied `index.html` already has the Supabase URL and publishable key embedded, so users will not be asked for backend details on launch.

## How linking works

Each profile has a profile ID/link code. To sync between two people/devices:

1. Person A creates a profile.
2. Person B creates a profile.
3. Person A copies their link code and gives it to Person B.
4. Person B pastes the code in **Partners > Profile linking**.
5. Each dashboard will show linked profile content.

Private partner cards remain private to the owner profile. They do not reveal anything to the other person.

## Production recommendations

For a serious public app, add:

- Proper authentication using Supabase Auth.
- Row-level security policies per user account.
- Supabase Storage for photos and recordings.
- TURN server for more reliable calls across restrictive mobile networks.
- Consent notice before recording calls.
- A recording indicator visible to every participant.
- Push notifications.
- Encrypted messages and private media storage.


## Embedded Supabase configuration

This build has the Supabase Project URL and publishable key embedded directly in `index.html`, using:

```js
window.SUPABASE_URL = "https://cmdylttzutpbaovxcfll.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_LPi4xeUUk-InGxknaiqJkw_mn4BvnNc";
```

The previous cloud setup screen has been removed. The app now launches directly to the profile setup screen, or to the saved active profile if one already exists in that browser.
