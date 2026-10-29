# Putting Labuta online

Everything here is free to start except the domain. Each step is done once. Keep the keys you copy somewhere safe (a password manager), and never paste the **service role key** into chats or emails.

## 1. Database: Supabase

1. Sign up at supabase.com and create a project. Region: **Frankfurt (eu-central-1)**, the closest to Moldova. Save the database password it shows.
2. Open **SQL Editor → New query**, paste the whole content of `supabase/migrations/0001_init.sql`, press **Run**. It should finish without errors.
3. **Authentication → URL Configuration**:
   - Site URL: `https://labuta.md`
   - Redirect URLs: add `https://labuta.md/auth/callback` (and later your Vercel preview address + `/auth/callback` if you want to test there).
4. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the **service_role** key. You need them in step 2.

Supabase's built-in email sender is limited to a few emails per hour. That's fine for testing; before launch connect your own SMTP under **Authentication → Emails → SMTP** (Resend from step 4 works for this too).

## 2. Hosting: Vercel

1. Sign up at vercel.com **with your GitHub account**.
2. **Add New → Project**, pick `labuta-md/site`, press **Import**. Grant access to the `labuta-md` organization if asked.
3. Before **Deploy**, open **Environment Variables** and add the values from `.env.example`:
   - `NEXT_PUBLIC_SITE_URL` = `https://labuta.md`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from step 1
   - `IP_HASH_SALT` = any long random text
4. **Deploy**. From now on every change pushed to GitHub goes live by itself in a minute or two.

## 3. Domain

1. In Vercel: **Project → Settings → Domains → Add** `labuta.md`. Vercel shows the DNS records to create.
2. At the .md registrar where you bought the domain, add those records. It can take from minutes to a day to start working.

## 4. Email notifications: Resend

1. Sign up at resend.com, **Domains → Add** `labuta.md`, add the DNS records it shows at your registrar.
2. **API Keys → Create**. In Vercel add `RESEND_API_KEY` and `EMAIL_FROM` = `Labuta <noreply@labuta.md>`. Redeploy.

## 5. Telegram notifications

1. In Telegram open **@BotFather**, send `/newbot`, choose a name (Labuta) and a username ending in `bot`, e.g. `labuta_md_bot`.
2. In Vercel add `TELEGRAM_BOT_TOKEN` (from BotFather), `TELEGRAM_BOT_USERNAME` (without @) and `TELEGRAM_WEBHOOK_SECRET` (any long random text, letters and digits only). Redeploy.
3. Open this address once in a browser, with your values filled in:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://labuta.md/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>`
   It should answer `"ok":true`.

## 6. Make yourself a moderator

1. Sign in on the live site with your email.
2. In Supabase **SQL Editor** run (with your email):
   ```sql
   update profiles set role = 'moderator' where email = 'you@example.com';
   ```
3. Other moderators: once you are one, change roles from the site under **Moderation → Users**.

## Later

- **SMS**: the place for it is `sendSms` in `src/lib/notify.ts`. It needs a paid provider and abuse limits first.
- **Personal data**: check with the National Center for Personal Data Protection (NCPDP) whether the project must register as a data operator before collecting real owners' data.
