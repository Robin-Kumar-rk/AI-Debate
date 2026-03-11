"use client";

import { useEffect, useRef, useState } from "react";

import { sideLabel, type DebateSide, type PendingArgument } from "@/lib/debate";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionAlternativeLike>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type ArgumentInputProps = {
  debateStarted: boolean;
  isBusy: boolean;
  selectedSide: DebateSide;
  onSelectedSideChange: (side: DebateSide) => void;
  argument: string;
  onArgumentChange: (value: string) => void;
  onQueueArgument: () => void;
  onAdvanceRound: () => void;
  onVoiceInputEnd: () => void;
  onVoiceInputStart: () => void;
  roundNumber: number;
  queuedArgument: PendingArgument | null;
};

export default function ArgumentInput({
  debateStarted,
  isBusy,
  selectedSide,
  onSelectedSideChange,
  argument,
  onArgumentChange,
  onQueueArgument,
  onAdvanceRound,
  onVoiceInputEnd,
  onVoiceInputStart,
  roundNumber,
  queuedArgument,
}: ArgumentInputProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const argumentRef = useRef(argument);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    argumentRef.current = argument;
  }, [argument]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const browserWindow = window as WindowWithSpeechRecognition;
    const SpeechRecognitionCtor =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (!transcript) {
        return;
      }

      const nextValue = argumentRef.current
        ? `${argumentRef.current.trim()} ${transcript}`.trim()
        : transcript;

      onArgumentChange(nextValue);
    };
    recognition.onerror = () => {
      setIsListening(false);
      onVoiceInputEnd();
    };
    recognition.onend = () => {
      setIsListening(false);
      onVoiceInputEnd();
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onArgumentChange]);

  function handleVoiceCapture() {
    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      onVoiceInputStart();
      setIsListening(true);
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
      onVoiceInputEnd();
    }
  }

  return (
    <section className="panel argument-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Human Assist</div>
          <h2 style={{ margin: 0 }}>Guide the next response</h2>
        </div>
        <span className="pill">
          {isBusy ? "Round Active" : debateStarted ? "Next Round Ready" : "Waiting"}
        </span>
      </div>

      <div className="support-grid">
        <label className="support-option">
          <input
            checked={selectedSide === "pro"}
            name="support-side"
            onChange={() => onSelectedSideChange("pro")}
            type="radio"
          />
          <div>
            <strong>{sideLabel("pro")}</strong>
            <div className="subtle">Strengthen the supporting case.</div>
          </div>
        </label>

        <label className="support-option">
          <input
            checked={selectedSide === "against"}
            name="support-side"
            onChange={() => onSelectedSideChange("against")}
            type="radio"
          />
          <div>
            <strong>{sideLabel("against")}</strong>
            <div className="subtle">Sharpen the rebuttal.</div>
          </div>
        </label>
      </div>

      <label htmlFor="argument-box" style={{ display: "block", marginBottom: "0.6rem" }}>
        Argument
      </label>
      <textarea
        className="textarea"
        id="argument-box"
        onChange={(event) => onArgumentChange(event.target.value)}
        placeholder="Example: AI still struggles with complex system architecture."
        value={argument}
      />

      <div className="button-row" style={{ marginTop: "1rem" }}>
        <button
          className="button button-secondary"
          disabled={!debateStarted || argument.trim().length === 0}
          onClick={onQueueArgument}
          type="button"
        >
          Queue Argument
        </button>
        <button
          className="button button-ghost"
          disabled={!speechSupported}
          onClick={handleVoiceCapture}
          type="button"
        >
          {isListening ? "Stop Voice Input" : "Use Voice Input"}
        </button>
        <button
          className="button button-warning"
          disabled={!debateStarted || isBusy}
          onClick={onAdvanceRound}
          type="button"
        >
          Next Round
        </button>
      </div>

      <p className="subtle" style={{ marginBottom: 0, marginTop: "0.8rem" }}>
        Voice input uses the browser Speech Recognition API when available. Queued arguments are
        injected into the next round you trigger. Robot voice pauses automatically while the mic is
        listening.
      </p>

      {queuedArgument ? (
        <div className="queue-card">
          <strong>Ready for {sideLabel(queuedArgument.side)}</strong>
          <p>{queuedArgument.text}</p>
        </div>
      ) : !debateStarted ? (
        <div className="queue-card">
          <strong>Start the debate first</strong>
          <p>The first round creates the opening exchange. After that, you can guide either side.</p>
        </div>
      ) : (
        <div className="queue-card">
          <strong>No queued argument yet</strong>
          <p>Submit a text or voice argument and it will be injected into the next round.</p>
        </div>
      )}

      <p className="subtle" style={{ marginBottom: 0, marginTop: "0.8rem" }}>
        Current round: {roundNumber || "Not started"}
      </p>
    </section>
  );
}
