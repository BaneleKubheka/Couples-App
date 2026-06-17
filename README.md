# Couples Connect clean deployment

This package removes old versioned JavaScript files and restores correct filenames. Upload these files to the GitHub repo root and redeploy with `npx wrangler deploy`.

Expected structure:

```
assets/index.html
assets/app.js
assets/styles.css
assets/sw.js
assets/manifest.json
assets/icon.png
worker.js
wrangler.jsonc
supabase-schema.sql
```
