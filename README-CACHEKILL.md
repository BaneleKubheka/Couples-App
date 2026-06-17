# Cache-kill no-calls/admin-unlink deployment

This package disables Worker/browser asset caching and clears old service-worker caches.

After uploading to GitHub and redeploying, open DevTools Console and confirm:

`Couples Connect app version: cachekill-no-calls-admin-unlink-20260617`

If the console still shows `app-v17.js`, the Worker deployment is not serving this package.
