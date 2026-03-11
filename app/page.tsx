"use client";

import { useEffect, useRef, useState } from "react";

import ArgumentInput from "@/components/ArgumentInput";
import DebatePanel from "@/components/DebatePanel";
import {
  formatHistoryEntry,
  type DebateApiResponse,
  type DebateMessage,
  type DebateRequestBody,
  type DebateSide,
  type PendingArgument,
} from "@/lib/debate";

const SPEAKER_SPOTLIGHT_DELAY_MS = 900;

function createMessage(side: DebateSide, text: string, round: number): DebateMessage {
  return {
    id: `${side}-${round}-${Math.random().toString(36).slice(2, 10)}`,
    round,
    side,
    text,
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function findLatestRoundMessages(messages: DebateMessage[]) {
  const latestRound = messages[messages.length - 1]?.round;

  if (!latestRound) {
    return null;
  }

  const proMessage = messages.findLast(
    (message) => message.round === latestRound && message.side === "pro",
  );
  const againstMessage = messages.findLast(
    (message) => message.round === latestRound && message.side === "against",
  );

  if (!proMessage || !againstMessage) {
    return null;
  }

  return {
    proMessage,
    againstMessage,
  };
}

type DebateErrorResponse = {
  error?: string;
};

export default function Home() {
  const [topic, setTopic] = useState("");
  const [roundNumber, setRoundNumber] = useState(0);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [selectedSide, setSelectedSide] = useState<DebateSide>("pro");
  const [argumentDraft, setArgumentDraft] = useState("");
  const [queuedArgument, setQueuedArgument] = useState<PendingArgument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<DebateSide | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const presentationRunIdRef = useRef(0);
  const robotVoicePausedByInputRef = useRef(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const debateStarted = roundNumber > 0 || messages.length > 0;
  const isSpeaking = activeSpeaker !== null;
  const roundBusy = isLoading || isSpeaking;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return undefined;
    }

    const synthesis = window.speechSynthesis;

    function updateVoices() {
      voicesRef.current = synthesis.getVoices();
    }

    setSpeechSupported(true);
    updateVoices();
    synthesis.addEventListener("voiceschanged", updateVoices);

    return () => {
      synthesis.cancel();
      synthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      stopPresentation();
    };
  }, []);

  function stopPresentation() {
    presentationRunIdRef.current += 1;
    robotVoicePausedByInputRef.current = false;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setActiveSpeaker(null);
  }

  function handleVoiceInputStart() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synthesis = window.speechSynthesis;

    if (synthesis.speaking && !synthesis.paused) {
      synthesis.pause();
      robotVoicePausedByInputRef.current = true;
    }
  }

  function handleVoiceInputEnd() {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !robotVoicePausedByInputRef.current
    ) {
      return;
    }

    const synthesis = window.speechSynthesis;

    if (synthesis.paused) {
      synthesis.resume();
    }

    robotVoicePausedByInputRef.current = false;
  }

  function pickVoice(side: DebateSide): SpeechSynthesisVoice | null {
    const englishVoices = voicesRef.current.filter((voice) =>
      voice.lang.toLowerCase().startsWith("en"),
    );
    const voicePool = englishVoices.length > 0 ? englishVoices : voicesRef.current;

    if (voicePool.length === 0) {
      return null;
    }

    if (side === "pro") {
      return voicePool[0];
    }

    return voicePool[Math.min(1, voicePool.length - 1)] || voicePool[0];
  }

  function speakSide(
    side: DebateSide,
    text: string,
    runId: number,
    onDone: () => void,
  ) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onDone();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(side);

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = side === "pro" ? 1.02 : 0.96;
    utterance.pitch = side === "pro" ? 1.08 : 0.92;
    utterance.volume = 1;
    utterance.onend = () => {
      if (presentationRunIdRef.current !== runId) {
        return;
      }

      onDone();
    };
    utterance.onerror = () => {
      if (presentationRunIdRef.current !== runId) {
        return;
      }

      onDone();
    };

    setActiveSpeaker(side);
    window.speechSynthesis.speak(utterance);
  }

  async function spotlightRound(runId: number) {
    setActiveSpeaker("pro");
    await sleep(SPEAKER_SPOTLIGHT_DELAY_MS);

    if (presentationRunIdRef.current !== runId) {
      return;
    }

    setActiveSpeaker("against");
    await sleep(SPEAKER_SPOTLIGHT_DELAY_MS);

    if (presentationRunIdRef.current !== runId) {
      return;
    }

    setActiveSpeaker(null);
  }

  function presentRound(proResponse: string, againstResponse: string) {
    stopPresentation();
    const runId = presentationRunIdRef.current;

    if (!speechSupported) {
      void spotlightRound(runId);
      return;
    }

    speakSide("pro", proResponse, runId, () => {
      speakSide("against", againstResponse, runId, () => {
        if (presentationRunIdRef.current !== runId) {
          return;
        }

        setActiveSpeaker(null);
      });
    });
  }

  async function fetchDebateRound(history: string[], pendingArgument: PendingArgument | null) {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const payload: DebateRequestBody = {
      topic: topic.trim(),
      side: pendingArgument?.side ?? selectedSide,
      debateHistory: history,
      userArgument: pendingArgument?.text ?? null,
    };

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = (await response.json()) as DebateApiResponse & DebateErrorResponse;

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate debate responses.");
      }

      return data;
    } finally {
      abortControllerRef.current = null;
    }
  }

  async function runDebateRound(
    history: string[],
    nextRound: number,
    pendingArgument: PendingArgument | null = queuedArgument,
  ) {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchDebateRound(history, pendingArgument);

      setFallbackNotice(
        data.usingFallback ? data.fallbackReason || "Fallback mode is active." : null,
      );
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("pro", data.proResponse, nextRound),
        createMessage("against", data.againstResponse, nextRound),
      ]);
      setRoundNumber(nextRound);

      if (pendingArgument) {
        setQueuedArgument(null);
      }

      presentRound(data.proResponse, data.againstResponse);
    } catch (caughtError) {
      if (!isAbortError(caughtError)) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "The debate round could not be generated.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartDebate() {
    if (!topic.trim()) {
      setError("Enter a topic before starting the debate.");
      return;
    }

    abortControllerRef.current?.abort();
    stopPresentation();

    setError(null);
    setFallbackNotice(null);
    setMessages([]);
    setRoundNumber(0);
    setQueuedArgument(null);
    setArgumentDraft("");

    await runDebateRound([], 1, null);
  }

  async function handleNextRound() {
    if (!debateStarted) {
      setError("Start the debate before requesting another round.");
      return;
    }

    if (roundBusy) {
      return;
    }

    await runDebateRound(
      messages.map((message) => formatHistoryEntry(message.side, message.text)),
      roundNumber + 1,
    );
  }

  function handleQueueArgument() {
    if (!argumentDraft.trim()) {
      setError("Write or dictate an argument before queueing it.");
      return;
    }

    setQueuedArgument({
      side: selectedSide,
      text: argumentDraft.trim(),
    });
    setArgumentDraft("");
    setError(null);
  }

  function handleReplayLatestRound() {
    const latestRoundMessages = findLatestRoundMessages(messages);

    if (!latestRoundMessages) {
      return;
    }

    presentRound(latestRoundMessages.proMessage.text, latestRoundMessages.againstMessage.text);
  }

  function handleStopVoice() {
    stopPresentation();
  }

  function handleReset() {
    abortControllerRef.current?.abort();
    stopPresentation();

    setTopic("");
    setRoundNumber(0);
    setMessages([]);
    setSelectedSide("pro");
    setArgumentDraft("");
    setQueuedArgument(null);
    setIsLoading(false);
    setError(null);
    setFallbackNotice(null);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="eyebrow">Hackathon Demo</div>
        <h1>AI Debate Arena</h1>
        <p>
          Two animated AI robots debate one round at a time, and each round can speak aloud through
          the browser while you guide either side with live arguments.
        </p>
      </section>

      <section className="hero-grid">
        <div className="panel topic-panel panel-strong">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Topic Setup</div>
              <h2 style={{ margin: 0 }}>Choose the motion</h2>
            </div>
            <span className="pill">
              {isLoading
                ? "Generating"
                : isSpeaking
                  ? "Robots Speaking"
                  : debateStarted
                    ? "Ready Next Round"
                    : "Ready"}
            </span>
          </div>

          <div className="topic-row">
            <input
              className="input"
              disabled={isLoading}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Should AI replace human programmers?"
              value={topic}
            />
            <div className="topic-actions">
              <button
                className="button"
                disabled={isLoading || !topic.trim()}
                onClick={handleStartDebate}
                type="button"
              >
                {debateStarted ? "Restart Debate" : "Start Debate"}
              </button>

              {isSpeaking ? (
                <button className="button button-warning" onClick={handleStopVoice} type="button">
                  Stop Voice
                </button>
              ) : null}

              <button className="button button-secondary" onClick={handleReset} type="button">
                Reset
              </button>
            </div>
          </div>
        </div>

        <aside className="panel status-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Session State</div>
              <h2 style={{ margin: 0 }}>Quick status</h2>
            </div>
          </div>

          <div className="status-list">
            <div>
              <strong>Debate engine</strong>
              <span>
                {isLoading
                  ? "Generating next round"
                  : isSpeaking
                    ? "Presenting round audio"
                    : debateStarted
                      ? "Waiting for next round"
                      : "Idle"}
              </span>
            </div>
            <div>
              <strong>Current round</strong>
              <span>{roundNumber || "Not started"}</span>
            </div>
            <div>
              <strong>Robot voice</strong>
              <span>{speechSupported ? (isSpeaking ? "Speaking" : "Ready") : "Unavailable"}</span>
            </div>
            <div>
              <strong>Queued assist</strong>
              <span>
                {queuedArgument ? `Ready for ${queuedArgument.side.toUpperCase()}` : "None queued"}
              </span>
            </div>
          </div>
        </aside>
      </section>

      <div style={{ marginTop: "1.5rem" }}>
        {error ? <div className="banner banner-error">{error}</div> : null}
        {fallbackNotice ? <div className="banner banner-warning">{fallbackNotice}</div> : null}
      </div>

      <section className="content-grid">
        <DebatePanel
          activeSpeaker={activeSpeaker}
          canReplayLatestRound={debateStarted && !isLoading}
          isLoading={isLoading}
          isSpeaking={isSpeaking}
          isSpeechSupported={speechSupported}
          messages={messages}
          onReplayLatestRound={handleReplayLatestRound}
          queuedArgument={queuedArgument}
          roundNumber={roundNumber}
          topic={topic.trim()}
        />

        <ArgumentInput
          argument={argumentDraft}
          debateStarted={debateStarted}
          isBusy={roundBusy}
          onAdvanceRound={handleNextRound}
          onArgumentChange={setArgumentDraft}
          onQueueArgument={handleQueueArgument}
          onSelectedSideChange={setSelectedSide}
          onVoiceInputEnd={handleVoiceInputEnd}
          onVoiceInputStart={handleVoiceInputStart}
          queuedArgument={queuedArgument}
          roundNumber={roundNumber}
          selectedSide={selectedSide}
        />
      </section>
    </main>
  );
}
