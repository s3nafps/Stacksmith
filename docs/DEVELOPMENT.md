# Development

Use Node.js 22.

```bash
npm ci
copy .env.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Run focused checks while editing and `npm run check` before opening a pull request.

Local demo mode uses demo auth, mock GitHub, and runner simulation. These modes are blocked in production by environment validation.
