export type DebateSide = "pro" | "against";

export type DebateMessage = {
  id: string;
  round: number;
  side: DebateSide;
  text: string;
};

export type PendingArgument = {
  side: DebateSide;
  text: string;
};

export type DebateRequestBody = {
  topic: string;
  side: DebateSide;
  debateHistory: string[];
  userArgument: string | null;
};

export type DebateApiResponse = {
  proResponse: string;
  againstResponse: string;
  usingFallback?: boolean;
  fallbackReason?: string;
};

export const PROMPT_HISTORY_WINDOW = 12;

export function sideLabel(side: DebateSide): string {
  return side === "pro" ? "PRO" : "AGAINST";
}

export function formatHistoryEntry(side: DebateSide, text: string): string {
  return `${sideLabel(side)}: ${text}`;
}

export function limitPromptHistory(history: string[]): string[] {
  return history.slice(-PROMPT_HISTORY_WINDOW);
}
