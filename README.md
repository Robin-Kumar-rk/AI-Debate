# AI Debate Arena

Minimal Next.js hackathon demo where two AI agents debate a topic, animated robots act out each round, and the user can help either side with text or voice input.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash
```

3. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes

- The app stores debate state entirely in memory on the client.
- Debate rounds advance manually, one round at a time, so the app does not burn through API quota automatically.
- The backend sends only a rolling recent history window to Gemini so long debates can keep running.
- Robot voices use the browser Speech Synthesis API, and the UI includes a replay button for the latest round.
- If Gemini is unavailable, the API route falls back to local demo responses and surfaces that state in the UI.
