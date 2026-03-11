import DebateBots from "@/components/DebateBots";
import { sideLabel, type DebateMessage, type DebateSide, type PendingArgument } from "@/lib/debate";

type DebatePanelProps = {
  activeSpeaker: DebateSide | null;
  canReplayLatestRound: boolean;
  isLoading: boolean;
  isSpeaking: boolean;
  isSpeechSupported: boolean;
  messages: DebateMessage[];
  onReplayLatestRound: () => void;
  queuedArgument: PendingArgument | null;
  roundNumber: number;
  topic: string;
};

export default function DebatePanel({
  activeSpeaker,
  canReplayLatestRound,
  isLoading,
  isSpeaking,
  isSpeechSupported,
  messages,
  onReplayLatestRound,
  queuedArgument,
  roundNumber,
  topic,
}: DebatePanelProps) {
  return (
    <section className="panel panel-strong debate-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Debate Window</div>
          <h2 style={{ margin: 0 }}>Robot debate arena</h2>
        </div>
        <span className="pill">{roundNumber > 0 ? `Round ${roundNumber}` : "Waiting"}</span>
      </div>

      <DebateBots
        activeSpeaker={activeSpeaker}
        isLoading={isLoading}
        isSpeaking={isSpeaking}
        messages={messages}
      />

      <div className="button-row" style={{ marginBottom: "1rem" }}>
        <button
          className="button button-ghost"
          disabled={!canReplayLatestRound || !isSpeechSupported}
          onClick={onReplayLatestRound}
          type="button"
        >
          Replay Robot Voice
        </button>
      </div>

      {!isSpeechSupported ? (
        <div className="banner banner-warning">
          Browser speech synthesis is unavailable here, so the robots can animate but cannot speak.
        </div>
      ) : null}

      {topic ? (
        <p className="subtle" style={{ marginTop: 0 }}>
          Topic: <strong>{topic}</strong>
        </p>
      ) : null}

      {queuedArgument ? (
        <div className="queue-card">
          <strong>Queued human assist for {sideLabel(queuedArgument.side)}</strong>
          <p>{queuedArgument.text}</p>
        </div>
      ) : null}

      <div className="debate-stream" style={{ marginTop: "1rem" }}>
        {messages.length === 0 ? (
          <div className="empty-state">
            Start the debate to generate the opening pro and against statements.
          </div>
        ) : (
          messages.map((message) => (
            <article className="message-card" key={message.id}>
              <div className="message-header">
                <div className="message-meta">
                  <span
                    className={`pill ${message.side === "pro" ? "pill-pro" : "pill-against"}`}
                  >
                    {sideLabel(message.side)}
                  </span>
                  <span className="subtle">Round {message.round}</span>
                </div>
              </div>
              <p>{message.text}</p>
            </article>
          ))
        )}

        {isLoading ? (
          <div className="message-card">
            <div className="message-meta">
              <span className="loader" aria-hidden="true" />
              <span className="subtle">Generating the next exchange...</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
