# AI Debate Arena – Project Specification

## 1. Project Overview

AI Debate Arena is a web application where two AI agents debate a topic.
Users can assist either side by providing arguments via text or voice.
The AI incorporates the user’s argument into its next response.

The system demonstrates **multi-agent AI interaction + human collaboration with AI**.

Primary goal: **Deliver an interactive demo within 2 hours for a hackathon.**

---

# 2. Core Features (MVP)

## 2.1 Topic Based Debate

User enters a debate topic.

Example:

```
Should AI replace human programmers?
```

The system generates:

* Opening argument (Pro)
* Opening argument (Against)

---

## 2.2 Two AI Debate Agents

Agent A → Supports topic
Agent B → Opposes topic

Both use Gemini API.

Each round:

1. AI A responds
2. AI B responds

Debate history is preserved.

---

## 2.3 Human Assisted Argument

User can support either side.

User selects:

```
Support Side: PRO or AGAINST
```

User provides argument:

* text input
* voice input (optional)

Example:

```
AI struggles with large-scale architecture decisions.
```

The system injects this argument into the prompt so the chosen AI agent uses it in the next response.

---

## 2.4 Debate Rounds

Simple round structure:

Round 1

* AI Pro opening
* AI Against response

Round 2+

* AI Pro response
* AI Against response

User arguments influence future rounds.

Limit: 5 rounds.

---

# 3. Non Goals (To Save Time)

These features are intentionally excluded:

* authentication
* database
* real-time websockets
* user accounts
* persistent debates
* complex UI styling

Everything runs **in memory**.

---

# 4. Tech Stack

Frontend

* Next.js (App Router)
* React
* TailwindCSS (optional but quick)

Backend

* Next.js API routes

AI

* Gemini API (Google AI Studio)

Voice Input

* Web Speech API (browser built-in)

Deployment

* Localhost only (hackathon demo)

---

# 5. System Architecture

```
User
 ↓
Frontend (React)

Topic Input
Debate UI
Argument Input

 ↓

API Route

/debate

 ↓

Gemini API

 ↓

Response returned to UI
```

State is stored in **frontend memory**.

---

# 6. UI Layout

Single page interface.

Sections:

1. Topic Input
2. Debate Window
3. User Argument Panel
4. Control Buttons

Layout example:

```
---------------------------------
AI Debate Arena

Topic: [ input field ] [Start]

---------------------------------
Debate

PRO AI:
message...

AGAINST AI:
message...

---------------------------------
Support Side:
( ) PRO
( ) AGAINST

Argument:
[ textarea ]

[ Submit Argument ]

---------------------------------
[ Next Round ]
```

---

# 7. API Design

Single API endpoint.

POST `/api/debate`

Request body:

```
{
  topic: string,
  side: "pro" | "against",
  debateHistory: string[],
  userArgument: string | null
}
```

Response:

```
{
  proResponse: string,
  againstResponse: string
}
```

---

# 8. Prompt Design

## System Prompt

```
You are participating in a debate.

Topic:
{topic}

You must argue for the following side:
{pro or against}

Debate history:
{history}

Human supporter argument:
{user_argument}

Use the human argument if it strengthens your position.
Respond with a clear and persuasive debate statement.
Limit response to 120 words.
```

---

# 9. Debate State

Stored in React state.

Example:

```
topic
roundNumber
debateHistory[]
selectedSide
userArgument
```

debateHistory format:

```
[
"PRO: argument...",
"AGAINST: argument..."
]
```

---

# 10. Voice Input (Optional Feature)

Use browser speech recognition.

```
window.SpeechRecognition
```

Flow:

User clicks microphone
Speech → text
Text inserted into argument box

Fallback: manual typing.

---

# 11. Implementation Steps (2 Hour Plan)

### Step 1 (15 min)

Create Next.js project.

```
npx create-next-app ai-debate-arena
```

Install Gemini SDK.

---

### Step 2 (20 min)

Create UI:

* topic input
* debate display
* argument input
* next round button

---

### Step 3 (30 min)

Create API route `/api/debate`.

Integrate Gemini API.

Implement prompt template.

---

### Step 4 (30 min)

Implement debate logic:

* store history
* call API each round
* append responses

---

### Step 5 (15 min)

Add support side selector.

Inject user argument.

---

### Step 6 (10 min)

Optional voice input.

---

# 12. Demo Flow

Demo script for judges:

1. Enter topic

```
Should AI replace software engineers?
```

2. Click Start Debate

3. Show AI arguments

4. Add human argument

Example:

```
AI still struggles with complex system architecture
```

5. Click Next Round

6. AI incorporates argument.

Explain:
“Humans can collaborate with AI during debates.”

---

# 13. Stretch Features (Only If Time Remains)

* audience voting
* argument strength scoring
* AI personalities
* animated debate UI

---

# 14. Success Criteria

Project is successful if:

* topic input works
* two AI responses appear
* user argument influences debate
* at least 3 rounds of debate run

---

# 15. Folder Structure

```
/app
  page.tsx
/api
  debate/route.ts
/components
  DebatePanel.tsx
  ArgumentInput.tsx
/lib
  gemini.ts
```

---

# 16. Environment Variables

```
GEMINI_API_KEY=your_api_key
```

---

# 17. Future Improvements

* multi user debate
* AI judging system
* live audience chat
* persistent debate rooms

---

END OF SPEC
