# YO Health & Fitness

This is the real app foundation for YO Health & Fitness: a React marketplace app with login, provider listings, booking flow, gym discovery, AI coaching, corporate wellness, admin tools, a Supabase-ready backend layer, and Capacitor packaging for iOS/Android.

For the sales/handoff package, start with `SELLER-PACKAGE-INDEX.md`.

## Run The App

```bash
pnpm install
pnpm dev
```

Open:

```text
http://127.0.0.1:5174/
```

Public pitch page:

```text
http://127.0.0.1:5174/pitch
```

## Demo Login

Client:

```text
demo@yohealthfitness.com
demo12345
```

Admin:

Use the Admin tab on the login screen.

## Backend Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env`.
3. Add your Supabase URL and anon key.
4. Run `docs/supabase-schema.sql` inside Supabase SQL Editor.
5. Replace mock data calls with Supabase queries where needed.

The app currently falls back to demo mode when Supabase keys are not configured.

## Mobile Packaging

Capacitor config and app assets are included.

```bash
pnpm build
pnpm cap:add:ios
pnpm cap:add:android
pnpm cap:sync
pnpm cap:open:ios
pnpm cap:open:android
```

After the native projects exist, use this faster repeat workflow:

```bash
pnpm mobile:prepare
pnpm cap:open:ios
pnpm cap:open:android
```

See `docs/native-build-guide.md`, `docs/mobile-release-checklist.md`, and `docs/store-listing.md`.

## Web Deployment

The app is ready for Vercel or Netlify deployment. Direct routes such as `/pitch` are supported by `vercel.json` and `public/_redirects`.

See `docs/web-deployment-guide.md`.

For an existing Supabase project, run `docs/supabase-live-update-2026-06-30.sql` to add the newest marketplace tables.

## What Is Included

- React/Vite app structure
- Supabase-ready auth and booking layer
- Client dashboard
- Editable profile and health metric logging
- Provider marketplace
- Provider profiles and booking confirmation flow
- Availability-based slot selection
- Hosted checkout preparation and payment records
- Gym marketplace
- AI coaching screen
- Luxury concierge and corporate wellness screens
- Corporate client portal for employees, challenges, screenings, and reports
- Provider portal for listing edits, availability, booking requests, and payouts
- Trust center with privacy, terms, health disclaimer, consent records, and deletion request flow
- Sales package workspace for valuation, acquisition pitch, buyer CRM, and handoff checklist
- Admin dashboard
- PWA manifest and app icons
- iOS/Android Capacitor config
- Backend schema
- Pitch and outreach assets
