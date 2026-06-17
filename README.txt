This build fixes the sign-in button issue by removing the JavaScript startup crash source and forcing a new cache/app.js version.

Deploy steps:
1. Replace index.html, app.js, styles.css, sw.js, and supabase-schema.sql in your repo.
2. Commit and redeploy the Worker.
3. Open DevTools > Application > Service Workers > Unregister old service worker.
4. Clear site data or reinstall the PWA if mobile still shows old behavior.
5. Confirm Console shows no SyntaxError before testing Sign in.
