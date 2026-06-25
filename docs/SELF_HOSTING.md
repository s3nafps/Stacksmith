# Self-Hosting

## Requirements

- Node.js 22
- npm
- SQLite for local evaluation or small single-instance deployments
- Reverse proxy with HTTPS for production

PostgreSQL is the intended production database, but this repository currently uses SQLite. Do not point `.env.example` at Postgres until Prisma support is implemented.

## Setup

```bash
npm ci
copy .env.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
npm run build
npm run start
```

## Production Checklist

- Use HTTPS behind a reverse proxy.
- Set strong `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, and `TOKEN_ENCRYPTION_KEY`.
- Disable demo auth, runner simulation, mock billing, and mock GitHub.
- Back up the SQLite database file or use a supported production database once available.
- Configure GitHub OAuth credentials and webhook secret.
- Rotate keys if secrets are exposed.
- Monitor application logs without storing sensitive inputs.

## Upgrades

Back up the database, pull the new release, run `npm ci`, `npm run db:generate`, database setup or migration commands documented by the release, then restart.
