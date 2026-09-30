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
