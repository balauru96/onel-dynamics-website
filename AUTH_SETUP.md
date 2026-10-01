# Website accounts (Supabase)

The website stays on GitHub Pages. Accounts use Supabase Auth, never DroneOS
or a drone-control API. No accounts or passwords are stored locally.

## Activate

1. Create or select a Supabase project; review terms and free-tier limits.
2. Enable email/password authentication and **Confirm email**. Set the
   provider's minimum password length to 12 characters.
3. Set the Auth Site URL to
   `https://balauru96.github.io/onel-dynamics-website/account.html`.
   Configure email delivery for real users and review rate limits.
4. Fill `supabaseUrl` and `publishableKey` in `assets/js/auth-config.js` with
   the public project URL and publishable key (or legacy anon key).
   Never use a service-role or secret key. Public settings are browser-visible.
5. Verify real registration, delivery of the confirmation email, confirmation,
   sign-in, wrong-password rejection and sign-out on the hosted website.

No custom database table is needed. Future customer data needs its own
authorization and row-level security. Website accounts grant no DroneOS access.

## Sessions and current status

Tokens stay in memory, never browser storage. Reloading or closing the page
requires signing in again. After following an email confirmation link, sign
in with your password. The page does not consume tokens from the callback URL.
Password recovery and profile management are outside this change.

Without configuration registration is visibly unavailable and no authentication
requests are sent. Mocked tests verify frontend behavior; real accounts and
email delivery need the owner's project configuration and end-to-end check.
