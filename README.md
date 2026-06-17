# Couples Connect

Static PWA for GitHub + Cloudflare Pages.

## What changed
- Removed the phrase “Long distance made closer”.
- Added required private profile setup with 40+ background questions.
- Added multiple local partner profiles and dashboard filtering by linked/visible partners.
- Added personal and shared album sections with photo upload, view and download.
- Added iOS/Android friendly responsive layout and installable PWA manifest.
- Added biometric/passkey unlock where supported, with fallback PIN.
- Added browser video/voice call tools using WebRTC manual offer/answer exchange.
- Added local call recording using MediaRecorder.

## Important limitations of a static GitHub/Cloudflare Pages app
This version has no database, authentication server, file storage bucket or signalling server. Data is stored in the browser on the device. Export/import is provided for backup.

For real multi-device partner syncing, shared albums visible across phones, automatic partner linking, private user accounts, cloud call recording storage and seamless call connection, add:
- Cloudflare Workers for API/auth/signalling
- Cloudflare D1 for profiles, links, prompts and metadata
- Cloudflare R2 for album images and call recordings
- A TURN provider for reliable WebRTC behind strict mobile networks

## Deployment
1. Create a GitHub repository.
2. Upload all files in this folder to the repo root.
3. In Cloudflare Pages, connect the GitHub repo.
4. Build command: leave blank.
5. Output directory: `/` or leave default.
6. Deploy.

Biometrics/passkeys, camera, microphone and service workers require HTTPS. Cloudflare Pages provides HTTPS automatically.
