# Cloudflare Worker Deployment

This package is configured for Cloudflare Workers with static assets.

Files added:

- `worker.js` - serves the app files through Workers Assets.
- `wrangler.jsonc` - Cloudflare Worker deployment configuration.
- `package.json` - optional npm deployment script.

Use this Cloudflare deploy command:

```bash
npx wrangler deploy
```

Keep all app files in the repository root, not inside a subfolder.
