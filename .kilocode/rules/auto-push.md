# Auto-Push Rule

After finishing ANY task that changes project files, and after `npm run build` passes, always automatically run:

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