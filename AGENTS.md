# OfferMap BD — agent rules

- Never print, log or commit secret keys, `.env.local` or `DATABASE_URL`.
- Never run a live scrape unless a task item says so, with its caps.
- Keep code simple: plain functions, small components, edit only what is needed, never rewrite whole files, never remove an existing feature.
- Never claim something is done unless you ran the command in THIS session and pasted its real output.
- Do not use Playwright fixtures. If the same approach fails twice, stop and write `BLOCKED: <reason>`. Never try more than 3 different approaches.
- Do not read `PROGRESS.md` or old report files, they are outdated.
- Before every commit: `npm run build 2>&1 | tail -15` and the full e2e tests must pass; `git status` must not include `.env.local`. Then commit and push (the Vercel deploy follows from the push).
- Save context: grep/search and read only the parts of files you need, limited-output commands.
- Language: reply to the user in short plain English, max 5 lines per finished item.
