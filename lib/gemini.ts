import {
  formatHistoryEntry,
  type DebateApiResponse,
  type DebateRequestBody,
  type DebateSide,
} from "@/lib/debate";

type GenerateStatementOptions = {
  topic: string;
  side: DebateSide;
  debateHistory: string[];
  userArgument: string | null;
};

type GenerateStatementResult = {
  text: string;
  usedFallback: boolean;
  fallbackReason?: string;
};

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponsePayload = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ROUND_ANGLES: Record<DebateSide, string[]> = {
  pro: [
    "speed, scale, and throughput",
    "consistency under repetition and lower error variance",
    "processing more information at once",
    "cost efficiency and nonstop availability",
    "future growth as systems improve",
  ],
  against: [
    "judgment, context, and nuance",
    "creativity, values, and ethical responsibility",
    "flexibility in ambiguous real-world situations",
    "trust, empathy, and human connection",
    "adaptation when rules are unclear or changing",
  ],
};

type TopicFraming = {
  kind: "comparison" | "motion";
  primary: string;
  secondary: string | null;
};

type TopicLens = {
  proAngles: string[];
  againstAngles: string[];
};

type ComparisonAngleSet = {
  pro: string[];
  against: string[];
};

const COMPARISON_ANGLE_PROFILES: Record<string, ComparisonAngleSet> = {
  "pen|pencil": {
    pro: [
      "pen leaves permanent marks, which makes it better for final writing and signatures",
      "pen writes smoothly without sharpening, which helps in fast note-taking",
      "pen produces darker, cleaner text for polished work",
      "pen is stronger when commitment matters more than constant correction",
    ],
    against: [
      "pencil can be erased the moment ideas change, which matters in drafting and rough work",
      "pencil gives better control for sketching, shading, and careful drafting",
      "pencil keeps working without leaking or drying out",
      "pencil is better when flexibility matters more than permanence",
    ],
  },
  "computer|human": {
    pro: [
      "computer processes information faster and at a far larger scale",
      "computer stays consistent under repetition without fatigue",
      "computer searches, calculates, and stores far more than human memory can hold",
      "computer can keep working continuously without rest or distraction",
    ],
    against: [
      "human understands meaning and context instead of only processing inputs",
      "human adapts when goals are unclear or changing",
      "human brings judgment, empathy, and values into decisions",
      "human can redefine the problem instead of only optimizing a task",
    ],
  },
  "website|app": {
    pro: [
      "a website opens instantly without installation or app-store friction",
      "a website works across devices from one URL instead of separate downloads",
      "a website is easier to update because users always see the latest version",
      "a website is better when reach and accessibility matter more than device integration",
    ],
    against: [
      "an app feels faster and more tailored because it is built for the device",
      "an app works better with notifications, offline use, and phone hardware",
      "an app keeps users engaged because it lives directly on the home screen",
      "an app is stronger when performance and deeper user experience matter most",
    ],
  },
};

const ENTITY_ANGLE_PROFILES: Record<string, string[]> = {
  pen: [
    "pen leaves a permanent mark and feels stronger for final work",
    "pen writes quickly without sharpening",
    "pen gives cleaner, darker writing for everyday notes",
  ],
  pencil: [
    "pencil can be erased when ideas change",
    "pencil is better for sketching, drafting, and rough work",
    "pencil gives more control through pressure and shading",
  ],
  computer: [
    "computer handles scale, speed, and repetition better",
    "computer calculates and searches faster than people",
    "computer performs continuously without fatigue",
  ],
  human: [
    "human handles context, meaning, and ambiguity better",
    "human can improvise when rules are unclear",
    "human judgment matters when values and responsibility are involved",
  ],
  website: [
    "website opens instantly without installation",
    "website reaches every device through a browser",
    "website updates immediately without forcing downloads",
  ],
  app: [
    "app feels more native and optimized on the device",
    "app supports notifications, offline use, and hardware features",
    "app keeps users engaged through a dedicated mobile experience",
  ],
  ai: [
    "AI handles repetition, pattern matching, and large-scale output quickly",
    "AI can process and generate far more content in less time",
    "AI becomes attractive when cost and speed drive the decision",
  ],
};

const ENTITY_ALIASES: Record<string, string> = {
  web: "website",
  website: "website",
  websites: "website",
  "web site": "website",
  site: "website",
  sites: "website",
  app: "app",
  apps: "app",
  application: "app",
  applications: "app",
  "mobile app": "app",
  "mobile apps": "app",
  "native app": "app",
  "native apps": "app",
};

function cleanTopicPart(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim();
}

function normalizeEntityKey(value: string): string {
  const cleaned = cleanTopicPart(value)
    .toLowerCase()
    .replace(/\b(a|an|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (ENTITY_ALIASES[cleaned]) {
    return ENTITY_ALIASES[cleaned];
  }

  if (cleaned.endsWith("s") && !cleaned.endsWith("ss")) {
    const singular = cleaned.slice(0, -1);

    return ENTITY_ALIASES[singular] || singular;
  }

  return cleaned;
}

function parseTopic(topic: string): TopicFraming {
  const parts = topic.split(/\s+(?:vs\.?|versus)\s+/i).map(cleanTopicPart).filter(Boolean);

  if (parts.length === 2) {
    return {
      kind: "comparison",
      primary: parts[0],
      secondary: parts[1],
    };
  }

  return {
    kind: "motion",
    primary: topic.trim(),
    secondary: null,
  };
}

function inferTopicLens(topic: string): TopicLens {
  const lowerTopic = topic.toLowerCase();

  if (/(ai|artificial intelligence)/.test(lowerTopic) && /(job|jobs|employment|worker|workers)/.test(lowerTopic)) {
    return {
      proAngles: [
        "companies use AI to cut labor costs, not just to help staff",
        "repetitive office and support roles are easier to automate than to retrain",
        "entry-level work shrinks when AI drafts, analyzes, and responds faster",
        "one AI system can absorb tasks that once needed multiple people",
      ],
      againstAngles: [
        "AI often automates tasks inside jobs instead of removing entire jobs",
        "new work appears in oversight, integration, compliance, and training",
        "businesses usually redesign roles before they eliminate them",
        "trust and accountability still keep humans in many workflows",
      ],
    };
  }

  if (/(ai|artificial intelligence)/.test(lowerTopic) && /(replace|software engineer|software engineers|programmer|programmers|developer|developers)/.test(lowerTopic)) {
    return {
      proAngles: [
        "routine coding, testing, and debugging are already being automated",
        "companies reduce headcount when delivery becomes cheaper and faster",
        "one engineer using AI can now do work that once needed a larger team",
        "entry-level programming roles are the first to be squeezed",
      ],
      againstAngles: [
        "requirements are ambiguous and still need human interpretation",
        "architecture tradeoffs cannot be reduced to pattern matching alone",
        "engineers remain accountable when systems fail in production",
        "stakeholder communication and product judgment are still human work",
      ],
    };
  }

  if (/\bcomputer\b/.test(lowerTopic) && /\bhuman\b/.test(lowerTopic)) {
    return {
      proAngles: [
        "computers process faster and at a much larger scale",
        "computers stay consistent under repetition without fatigue",
        "computers can calculate and search beyond human capacity",
        "computers operate continuously without rest or distraction",
      ],
      againstAngles: [
        "humans understand meaning instead of only processing symbols",
        "humans improvise when situations are messy or undefined",
        "humans bring empathy, values, and social judgment",
        "humans can redefine the goal instead of only optimizing a task",
      ],
    };
  }

  if (/(ai|artificial intelligence)/.test(lowerTopic)) {
    return {
      proAngles: [
        "AI gains force where speed, scale, and repetition matter most",
        "AI can handle large volumes of work with consistent output",
        "AI improves as more data and feedback become available",
        "AI lowers cost and expands access faster than human-only systems",
      ],
      againstAngles: [
        "AI still struggles when context, values, and judgment dominate",
        "AI does not own responsibility when real-world harm occurs",
        "AI is strongest in narrow tasks, not messy open-ended decisions",
        "AI can imitate patterns without truly understanding stakes or meaning",
      ],
    };
  }

  return {
    proAngles: [
      "the supporting side is stronger where speed, scale, and consistency decide the outcome",
      "the supporting side has the advantage in measurable output and repetition",
      "the supporting side is easier to defend when efficiency drives the decision",
      "the supporting side gains strength when large-scale performance matters most",
    ],
    againstAngles: [
      "the opposing side is stronger when judgment and context decide the outcome",
      "the opposing side has the advantage when the issue is not purely mechanical",
      "the opposing side is harder to dismiss once values and responsibility matter",
      "the opposing side gains force where flexibility and nuance matter more than speed",
    ],
  };
}

function sideMission(topic: string, side: DebateSide): string {
  const framing = parseTopic(topic);

  if (framing.kind === "comparison" && framing.secondary) {
    return side === "pro"
      ? `Argue that ${framing.primary} is stronger, more capable, or more persuasive than ${framing.secondary}.`
      : `Argue that ${framing.secondary} is stronger, more capable, or more persuasive than ${framing.primary}.`;
  }

  return side === "pro"
    ? "Support the topic exactly as written."
    : "Oppose the topic exactly as written.";
}

function getComparisonAngleSet(topic: string): ComparisonAngleSet | null {
  const framing = parseTopic(topic);

  if (framing.kind !== "comparison" || !framing.secondary) {
    return null;
  }

  const primaryKey = normalizeEntityKey(framing.primary);
  const secondaryKey = normalizeEntityKey(framing.secondary);
  const exactKey = `${primaryKey}|${secondaryKey}`;
  const reverseKey = `${secondaryKey}|${primaryKey}`;

  if (COMPARISON_ANGLE_PROFILES[exactKey]) {
    return COMPARISON_ANGLE_PROFILES[exactKey];
  }

  if (COMPARISON_ANGLE_PROFILES[reverseKey]) {
    const reversed = COMPARISON_ANGLE_PROFILES[reverseKey];

    return {
      pro: reversed.against,
      against: reversed.pro,
    };
  }

  const primaryAngles = ENTITY_ANGLE_PROFILES[primaryKey];
  const secondaryAngles = ENTITY_ANGLE_PROFILES[secondaryKey];

  if (!primaryAngles || !secondaryAngles) {
    return null;
  }

  return {
    pro: primaryAngles,
    against: secondaryAngles,
  };
}

function latestPoint(prefix: string, debateHistory: string[]): string | null {
  for (let index = debateHistory.length - 1; index >= 0; index -= 1) {
    const entry = debateHistory[index];

    if (entry.startsWith(prefix)) {
      return entry.replace(prefix, "").trim();
    }
  }

  return null;
}

function inferRoundNumber(debateHistory: string[]): number {
  return Math.floor(debateHistory.length / 2) + 1;
}

function pickFreshAngle(side: DebateSide, roundNumber: number): string {
  const angles = ROUND_ANGLES[side];

  return angles[(roundNumber - 1) % angles.length];
}

function pickTopicAngle(topic: string, side: DebateSide, roundNumber: number): string {
  const comparisonAngles = getComparisonAngleSet(topic);

  if (comparisonAngles) {
    const angles = side === "pro" ? comparisonAngles.pro : comparisonAngles.against;

    return angles[(roundNumber - 1) % angles.length] || pickFreshAngle(side, roundNumber);
  }

  const lens = inferTopicLens(topic);
  const angles = side === "pro" ? lens.proAngles : lens.againstAngles;

  return angles[(roundNumber - 1) % angles.length] || pickFreshAngle(side, roundNumber);
}

function buildPrompt({
  topic,
  side,
  debateHistory,
  userArgument,
}: GenerateStatementOptions): string {
  const history = debateHistory.length > 0 ? debateHistory.join("\n") : "No debate history yet.";
  const latestOpponentStatement =
    latestOpponentPoint(side, debateHistory) || "No opponent statement yet.";
  const latestOwnStatement =
    latestPoint(side === "pro" ? "PRO:" : "AGAINST:", debateHistory) || "No previous statement yet.";
  const turnType = latestOpponentPoint(side, debateHistory) ? "rebuttal" : "opening statement";
  const roundNumber = inferRoundNumber(debateHistory);
  const freshAngle = pickTopicAngle(topic, side, roundNumber);
  const comparisonAngles = getComparisonAngleSet(topic);
  const supporterArgument =
    userArgument && userArgument.trim().length > 0
      ? userArgument.trim()
      : "No human supporter argument provided.";

  return [
    "You are one speaker in a live two-person debate.",
    "",
    `Topic:\n${topic}`,
    "",
    `Your side:\n${side.toUpperCase()}`,
    "",
    `Your mission:\n${sideMission(topic, side)}`,
    "",
    `This turn is a:\n${turnType}`,
    "",
    `Debate round:\n${roundNumber}`,
    "",
    `Most recent opponent statement:\n${latestOpponentStatement}`,
    "",
    `Your previous statement:\n${latestOwnStatement}`,
    "",
    `Fresh angle to emphasize this turn:\n${freshAngle}`,
    ...(comparisonAngles
      ? ["", "Use the concrete object-specific angle above and avoid abstract category language."]
      : []),
    "",
    `Recent debate history:\n${history}`,
    "",
    `Human supporter argument:\n${supporterArgument}`,
    "",
    "Instructions:",
    "- Speak as the debater, not as a narrator or moderator.",
    "- If there is an opponent statement, begin by answering that statement directly.",
    "- Attack one specific claim from the opponent statement instead of restating the whole topic.",
    "- Use direct debate language such as 'That misses the point' or 'Your claim fails because'.",
    "- Do not summarize the topic, do not describe both sides, and do not say 'the pro side argues' or 'the against side argues'.",
    "- Add one new angle or consequence that was not the main focus of your own previous statement.",
    "- Do not closely reuse wording from either the opponent statement or your previous statement.",
    "- Keep the language concrete and tied to the exact topic words.",
    "- Make one sharp rebuttal and one concrete implication.",
    "- Use the human supporter argument only if it genuinely strengthens your side.",
    "- Write exactly 2 sentences and stay under 60 words.",
  ].join("\n");
}

function trimToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return text.trim();
  }

  const limitedText = words.slice(0, maxWords).join(" ").trim();
  const sentenceBoundaries = [...limitedText.matchAll(/[.!?](?=\s|$|["'])/g)];

  if (sentenceBoundaries.length > 0) {
    const lastBoundary = sentenceBoundaries[sentenceBoundaries.length - 1];

    if (typeof lastBoundary.index === "number") {
      const sentenceSafeText = limitedText.slice(0, lastBoundary.index + 1).trim();

      if (sentenceSafeText.split(/\s+/).length >= Math.floor(maxWords * 0.6)) {
        return sentenceSafeText;
      }
    }
  }

  return `${limitedText}...`;
}

function extractCandidateText(payload: GeminiResponsePayload): string {
  if (!Array.isArray(payload.candidates)) {
    return "";
  }

  return payload.candidates
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function latestOpponentPoint(side: DebateSide, debateHistory: string[]): string | null {
  return latestPoint(side === "pro" ? "AGAINST:" : "PRO:", debateHistory);
}

function normalizeOpponentPoint(point: string): string {
  return point
    .trim()
    .replace(/^You say\s+/i, "")
    .replace(/^Your last point leans on\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/\.\./g, ".")
    .trim();
}

function normalizeSupporterText(text: string): string {
  return text.trim().replace(/[.?!\s]+$/g, "");
}

function buildSupporterSentence(text: string | null, lead: string): string {
  if (!text) {
    return "";
  }

  return ` ${lead} ${normalizeSupporterText(text)}.`;
}

function buildFallbackReason(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Gemini is unavailable. Showing local demo responses instead.";
  }

  const message = error.message;
  const retryMatch = message.match(/Please retry in\s+([0-9.]+)s/i);

  if (/quota exceeded|rate limit/i.test(message)) {
    if (retryMatch) {
      const retrySeconds = Math.max(1, Math.ceil(Number(retryMatch[1])));

      return `Gemini quota is temporarily exhausted. Showing local demo responses instead. Try again in about ${retrySeconds} seconds.`;
    }

    return "Gemini quota is temporarily exhausted. Showing local demo responses instead.";
  }

  if (/GEMINI_API_KEY is not configured/i.test(message)) {
    return "Gemini API key is not configured. Showing local demo responses instead.";
  }

  return "Gemini is unavailable right now. Showing local demo responses instead.";
}

function buildFallbackStatement({
  topic,
  side,
  debateHistory,
  userArgument,
}: GenerateStatementOptions): string {
  const supporterSentence = buildSupporterSentence(
    userArgument,
    side === "pro" ? "A useful pro point is that" : "Another point is that",
  );
  const opponentPoint = latestOpponentPoint(side, debateHistory);
  const cleanedOpponentPoint = opponentPoint ? normalizeOpponentPoint(opponentPoint) : null;
  const roundNumber = inferRoundNumber(debateHistory);
  const freshAngle = pickTopicAngle(topic, side, roundNumber);
  const framing = parseTopic(topic);
  const comparisonAngles = getComparisonAngleSet(topic);

  if (framing.kind === "comparison" && framing.secondary && comparisonAngles) {
    const strongerSide = side === "pro" ? framing.primary : framing.secondary;
    const weakerSide = side === "pro" ? framing.secondary : framing.primary;

    if (side === "pro") {
      const statement = cleanedOpponentPoint
        ? `That reply underrates ${strongerSide}: ${freshAngle}. In "${topic}", that still puts ${strongerSide} ahead of ${weakerSide}.${supporterSentence}`
        : `I back ${strongerSide} because ${freshAngle}. In "${topic}", that puts ${strongerSide} ahead of ${weakerSide}.${supporterSentence}`;

      return trimToWordLimit(statement, 60);
    }

    const statement = cleanedOpponentPoint
      ? `That reply overrates ${weakerSide} and ignores ${strongerSide}: ${freshAngle}. In "${topic}", that still puts ${strongerSide} ahead of ${weakerSide}.${supporterSentence}`
      : `I back ${strongerSide} because ${freshAngle}. In "${topic}", that matters more than what ${weakerSide} offers.${supporterSentence}`;

    return trimToWordLimit(statement, 60);
  }

  if (side === "pro") {
    const statement = cleanedOpponentPoint
      ? `That objection misses the mechanism: ${freshAngle}. On "${topic}", that keeps the motion alive because the pressure clearly moves in that direction.${supporterSentence}`
      : `I support the motion because ${freshAngle}. On "${topic}", that makes the pro case direct rather than speculative.${supporterSentence}`;

    return trimToWordLimit(statement, 60);
  }

  const statement = cleanedOpponentPoint
    ? `That claim is too broad because ${freshAngle}. On "${topic}", the change is real, but the conclusion still overreaches.${supporterSentence}`
    : `I reject the motion because ${freshAngle}. On "${topic}", that makes the anti side sharper and more realistic.${supporterSentence}`;

  return trimToWordLimit(statement, 60);
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 320,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as GeminiResponsePayload;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Gemini request failed with status ${response.status}.`,
    );
  }

  const text = extractCandidateText(payload);

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return trimToWordLimit(text, 120);
}

async function generateStatement(
  options: GenerateStatementOptions,
): Promise<GenerateStatementResult> {
  try {
    return {
      text: await callGemini(buildPrompt(options)),
      usedFallback: false,
    };
  } catch (error) {
    return {
      text: buildFallbackStatement(options),
      usedFallback: true,
      fallbackReason: buildFallbackReason(error),
    };
  }
}

export async function generateDebateRound(
  request: DebateRequestBody,
): Promise<DebateApiResponse> {
  const proSupport = request.side === "pro" ? request.userArgument : null;
  const proResult = await generateStatement({
    topic: request.topic,
    side: "pro",
    debateHistory: request.debateHistory,
    userArgument: proSupport,
  });

  const againstSupport = request.side === "against" ? request.userArgument : null;
  const againstResult = await generateStatement({
    topic: request.topic,
    side: "against",
    debateHistory: [...request.debateHistory, formatHistoryEntry("pro", proResult.text)],
    userArgument: againstSupport,
  });

  return {
    proResponse: proResult.text,
    againstResponse: againstResult.text,
    usingFallback: proResult.usedFallback || againstResult.usedFallback || undefined,
    fallbackReason: proResult.fallbackReason || againstResult.fallbackReason,
  };
}
