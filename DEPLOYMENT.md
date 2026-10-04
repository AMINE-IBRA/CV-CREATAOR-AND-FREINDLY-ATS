# Railway deployment

The root Dockerfile explicitly installs server and client dependencies, including TypeScript and Vite, generates Prisma Client, and builds both applications. This fixes the `tsc: not found` failure from installing only the root package.

## Service settings

1. Keep the service root at the repository root. Railway should detect `Dockerfile`; select the Dockerfile builder if an existing builder override prevents detection.
2. Clear any custom Start Command so the image command applies migrations before starting Express.
3. Attach a persistent volume at `/data`.
4. Set `DATABASE_URL=file:/data/cv-creator.db`, `NODE_ENV=production`, and `HOST=0.0.0.0`.
5. Generate a public domain and set `CLIENT_URL` to its full HTTPS origin, without a path.
6. Set `OPENROUTER_API_KEY` privately in Railway Variables if AI is required. Never put it in Git or a client variable.
7. Use Railway's injected `PORT`, with public networking targeting that port. Check `/api/health` after deployment, then test registration, save/reload, and exports.

SQLite migrations run during startup, when the persistent volume is mounted. A fresh volume creates an empty database; local accounts are not uploaded. Keep the volume attached and configure backups before accepting real customer data. Files written without a persistent volume will not survive replacement deployments.

The Docker build excludes local `.env` files, databases, generated output, and dependencies. Production billing and email integrations remain separate setup work.

See [Railway build and start commands](https://docs.railway.com/builds/build-and-start-commands).

## Payments and recovery email

The app supports Lemon Squeezy subscriptions and Resend password recovery. They remain disabled until their environment variables are provided. Never commit credentials.

### Lemon Squeezy

1. Create recurring variants that match the published prices: Pro USD 30/month or USD 300/year; Premium USD 59.99/month or USD 599.90/year. AI allowances reset monthly on either billing interval. The app does not override provider prices.
2. In Railway Variables set `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_PRO_VARIANT_ID`, `LEMONSQUEEZY_PREMIUM_VARIANT_ID`, and `LEMONSQUEEZY_WEBHOOK_SECRET`. Set `LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID` and `LEMONSQUEEZY_PREMIUM_ANNUAL_VARIANT_ID` to enable annual checkout. Missing annual variants disable those buttons.
3. Keep `LEMONSQUEEZY_TEST_MODE=true` while testing, with products/API credentials from the corresponding store mode. Test mode is the default.
4. Create a webhook pointing to `https://YOUR_DOMAIN/api/billing/webhook`, with the same signing secret. Subscribe to `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused`, and `subscription_unpaused`.
5. Test a checkout, verify the account plan changes, then cancel and expire the test subscription. Checkout redirects never grant access: only signed subscription notifications do. Replayed or older notifications do not overwrite newer subscription state.
6. Once the store is activated and testing passes, supply live variant IDs/credentials and set `LEMONSQUEEZY_TEST_MODE=false`. Existing subscribers manage cancellation and payment details through the Pricing page's Manage subscription button. Do not create a second checkout for an existing subscription.

Access is retained for active/trial subscriptions and cancelled subscriptions until `ends_at`; other statuses use the free plan. Configure allowed upgrade variants in the customer portal. Deleted application accounts cannot be matched by later webhooks; cancel billing in the portal before deleting an account.

Official reference: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
Webhook guide: https://docs.lemonsqueezy.com/guides/developer-guide/webhooks

### Resend

Verify a sender domain in Resend using the DNS records shown in its dashboard. Set `RESEND_API_KEY` and `EMAIL_FROM` (for example `CV Creator Pro <support@your-domain.com>`) in Railway. `CLIENT_URL` must be the final HTTPS application origin. Never use an unverified arbitrary sender. Test delivery to an inbox you control, then test reset and one-time token reuse rejection. Production responses never expose reset links, and tokens expire in one hour.

Official reference: https://resend.com/docs/api-reference/emails/send-email

### AI

Set `OPENROUTER_API_KEY` in Railway; `OPENROUTER_MODEL` is optional. Keep provider usage limits appropriate to your budget. A configured key still needs valid provider credit and model access.

### Owner plan previews

After migrations deploy, run `node scripts/owner-account.cjs amineibra555@gmail.com` in the production service console. Set the returned immutable account ID as `OWNER_USER_IDS` in Railway Variables and redeploy. Do not use an email address as this variable. Sign in again and visit Plans to choose Try Free, Try Pro, or Try Premium. End preview restores actual subscription access. Usage is not reset by plan switching.

Only the server environment can assign owner IDs. Removing an ID revokes preview access on the next authenticated request. Do not share the owner account; ordinary accounts cannot call the owner endpoint.
