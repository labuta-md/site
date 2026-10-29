# Labuta

A free, volunteer-run registry for dogs and cats in Moldova (labuta.md).

- Owners register a pet and get a QR code for the collar.
- Whoever finds the animal scans the code and messages the owner without seeing their contacts. The message goes by email and Telegram.
- Volunteers, shelters, vets and organizations register street animals in their care and animals looking for a home.
- A shared lost-and-found board, including animals found without a tag.
- Moderators see owner contacts only with a logged reason, and pass on a phone number only if the owner allowed it.

Languages: Romanian, Russian, English.

## How it's built

- Next.js (App Router) for the site.
- Supabase for the database, sign-in by email link, and photo storage. Privacy rules live in the database itself (row level security), see `supabase/migrations/0001_init.sql`.
- Without Supabase keys the site runs in **demo mode** with test data stored in `.data/`, so it can be tried before any accounts exist.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. In demo mode, sign in on the login page by picking a test user.

## Going live

See [SETUP.md](SETUP.md).

## Code map

| Where | What |
| --- | --- |
| `src/app/[lang]/` | Pages, one folder per screen |
| `src/lib/i18n/` | All texts in `ro.ts`, `ru.ts`, `en.ts` |
| `src/lib/store/` | Data access: `supabase.ts` (real) and `demo.ts` (test data) |
| `src/lib/actions.ts` | Everything forms do on the server |
| `src/lib/notify.ts` | Email and Telegram delivery; SMS placeholder |
| `src/lib/qr.ts` | QR codes and the printable tag |
| `supabase/migrations/` | Database schema and privacy rules |
