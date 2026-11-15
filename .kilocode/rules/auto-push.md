# Auto-Push Rule

Before EVERY commit, run:

```
npm run build
npm run test:e2e
```

Fix any failures (max 3 tries). Never push a failing build, and never commit `.env.local` or any secret key.

After `npm run build` and `npm run test:e2e` pass, always automatically run:

```
git status
```

to check that no secret files are included. Then:

```
git add .
git commit -m "<short clear message about what changed>"
git push origin main
```

Never commit `.env.local` or any secret key. Do not ask me for permission — just do it. If the push fails, show me the error.