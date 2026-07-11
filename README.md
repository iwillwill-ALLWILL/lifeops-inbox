# LifeOps Inbox

**Drop the paperwork. Get the next actions.**

**Live demo:** [lifeops-inbox.vercel.app](https://lifeops-inbox.vercel.app)

**Demo video:** the final 50.4-second candidate is preview-gated and not public yet.

Paste a bill, itinerary, school/work notice, medical note, or event confirmation. LifeOps Inbox turns it into:

- facts you can click back to the original PDF page when reliable geometry is available, with exact-text proof as the fallback;
- normalized dates, timezones, amounts, locations, and references;
- a Now / This Week / Waiting action board;
- visible conflicts and missing details;
- a downloadable calendar and privacy-safe share card.

Everything in the main workspace is parsed in your browser. No account or API key is required. Three realistic built-in samples are included.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then choose a sample or paste your own text.

## Hand this project to an AI

Give the AI this folder and say:

> Install dependencies, run `npm run test:run`, then run `npm run dev` and tell me the local URL. Do not add an API key; use the built-in deterministic parser.

For the optional browser smoke test, install Chromium once with:

```bash
PLAYWRIGHT_BROWSERS_PATH=.playwright npx playwright install chromium
npm run test:e2e
```

## More details

- [How it works](docs/ARCHITECTURE.md)
- [API and future A2A contract](docs/API.md)
- [Privacy and security model](docs/SECURITY.md)
- [Production validation and interoperability evidence](docs/VALIDATION.md)
- [Hackathon positioning and submission copy](docs/COMPETITION.md)
- [Final post, media and form field pack](docs/SUBMISSION.md)
