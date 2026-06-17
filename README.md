# Us — Long Distance Couples App

A free static PWA for long-distance couples. It combines:

- Daily relationship prompts
- Private love-note wall
- Mood check-ins
- Shared countdowns and visit planning
- Memory album with photos
- Virtual date ideas
- Compatibility games
- Shared goals
- Offline support
- Export/import backup

## Important limitation

This version is fully static and free. It stores information in the browser using `localStorage`. That means it does not automatically sync between two phones unless you add a backend later. Use **Export Data** and **Import Data** to share or back up your couple space.

For automatic real-time syncing, add one of these later:

- Firebase Firestore free tier
- Supabase free tier
- Cloudflare D1 + Workers
- GitHub Gist / Drive API with OAuth

## Deploy to GitHub

1. Create a new GitHub repository.
2. Upload these files to the root of the repo:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.json`
   - `sw.js`
3. Commit the files.

## Deploy to Cloudflare Pages

1. Go to Cloudflare Dashboard.
2. Open **Workers & Pages**.
3. Select **Create application**.
4. Select **Pages**.
5. Connect your GitHub repository.
6. Use these build settings:
   - Framework preset: `None`
   - Build command: leave blank
   - Build output directory: `/`
7. Deploy.

## Local testing

Open `index.html` directly in a browser, or serve the folder locally:

```bash
npx serve .
```

Service worker/PWA install features work best over HTTPS, which Cloudflare Pages provides automatically.
