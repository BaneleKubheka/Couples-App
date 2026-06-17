# Couples Connect - full Worker web-app

Deploy with Cloudflare Workers using static assets. The app embeds the Supabase project URL/key and never asks for cloud setup on launch.

## Important
Run `supabase-schema.sql` in Supabase SQL Editor before testing albums, messages, recordings and syncing.

## Repository layout
Upload these files/folders to GitHub root:

- assets/
- worker.js
- wrangler.jsonc
- package.json
- .wranglerignore
- supabase-schema.sql
- README.md

The Worker only uploads files in `assets/`, so `node_modules` will not be deployed as static assets.

## Deploy command
npx wrangler deploy

## Profile persistence
Profiles are saved in Supabase. A user can sign in on another browser using profile code + recovery passcode.
