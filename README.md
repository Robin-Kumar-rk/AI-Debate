# AI Debate Arena

Minimal Next.js hackathon demo where two AI agents debate a topic, animated robots act out each round, and the user can help either side with text or voice input.

## What It Does

- Runs a two-sided AI debate one round at a time.
- Lets the user support either side with typed or spoken arguments.
- Animates two robot debaters and reads each round aloud with browser speech synthesis.
- Replays the latest robot voice round on demand.
- Falls back to local demo debate lines when Gemini is unavailable or quota-limited.

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

Optional production check:

```bash
npm run build
```

## Notes

- The app stores debate state entirely in memory on the client.
- Debate rounds advance manually, one round at a time, so the app does not burn through API quota automatically.
- The backend sends only a rolling recent history window to Gemini so later rounds stay focused.
- Robot voices use the browser Speech Synthesis API, and the UI includes a replay button for the latest round.
- Voice input uses the browser Speech Recognition API when available, and robot speech pauses while the mic is listening.
- Comparison topics such as `pen vs pencil`, `web vs app`, and `computer vs human` use topic-aware fallback angles instead of generic text.
- If Gemini is unavailable or quota-limited, the API route falls back to local demo responses and shows a short warning banner instead of the raw API error.
- Keep `.env.local` local; the repo only includes `.env.example`.
