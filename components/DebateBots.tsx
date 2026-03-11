import { sideLabel, type DebateMessage, type DebateSide } from "@/lib/debate";

type DebateBotsProps = {
  activeSpeaker: DebateSide | null;
  isLoading: boolean;
  isSpeaking: boolean;
  messages: DebateMessage[];
};

function getLatestMessage(messages: DebateMessage[], side: DebateSide): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].side === side) {
      return messages[index].text;
    }
  }

  return null;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function getBubbleText(
  side: DebateSide,
  activeSpeaker: DebateSide | null,
  isSpeaking: boolean,
  isLoading: boolean,
  messages: DebateMessage[],
): string {
  const latestMessage = getLatestMessage(messages, side);

  if (activeSpeaker === side) {
    return latestMessage
      ? truncate(latestMessage, 150)
      : side === "pro"
        ? "Opening the debate with the first claim."
        : "Preparing the first rebuttal.";
  }

  if (isLoading) {
    return side === "pro"
      ? "Analyzing the topic and building the next point."
      : "Reviewing the latest claim and shaping a rebuttal.";
  }

  if (isSpeaking) {
    return activeSpeaker
      ? "Listening and preparing the next response."
      : "Finishing the last spoken point.";
  }

  if (latestMessage) {
    return truncate(latestMessage, 120);
  }

  return "Waiting for the topic to begin.";
}

export default function DebateBots({
  activeSpeaker,
  isLoading,
  isSpeaking: isRoundSpeaking,
  messages,
}: DebateBotsProps) {
  return (
    <div className="bot-stage">
      {(["pro", "against"] as const).map((side) => {
        const isBotSpeaking = activeSpeaker === side;
        const isThinking = isLoading && activeSpeaker === null;

        return (
          <article
            className={`bot-card bot-card-${side} ${isBotSpeaking ? "is-speaking" : ""} ${
              isThinking ? "is-thinking" : ""
            }`}
            key={side}
          >
            <div className="bot-card-top">
              <span className={`pill ${side === "pro" ? "pill-pro" : "pill-against"}`}>
                {sideLabel(side)}
              </span>
              <span className="subtle">
                {isBotSpeaking
                  ? "Speaking"
                  : isThinking
                    ? "Thinking"
                    : activeSpeaker
                      ? "Listening"
                      : "Idle"}
              </span>
            </div>

            <div className="robot-scene">
              <div
                className={`robot ${side === "pro" ? "robot-standing" : "robot-sitting"} ${
                  isBotSpeaking ? "robot-speaking" : ""
                } ${isThinking ? "robot-thinking" : ""}`}
              >
                <div className="robot-antenna" />
                <div className="robot-head">
                  <span className="robot-eye robot-eye-left" />
                  <span className="robot-eye robot-eye-right" />
                  <span className="robot-mouth" />
                </div>
                <div className="robot-neck" />
                <div className="robot-torso" />
                <span className="robot-arm robot-arm-left" />
                <span className="robot-arm robot-arm-right" />
                {side === "pro" ? (
                  <>
                    <span className="robot-leg robot-leg-left" />
                    <span className="robot-leg robot-leg-right" />
                  </>
                ) : (
                  <>
                    <span className="robot-chair-seat" />
                    <span className="robot-chair-back" />
                    <span className="robot-leg robot-leg-left robot-leg-seated" />
                    <span className="robot-leg robot-leg-right robot-leg-seated" />
                  </>
                )}
              </div>

              <div className={`speech-bubble ${isBotSpeaking ? "speech-bubble-live" : ""}`}>
                {getBubbleText(side, activeSpeaker, isRoundSpeaking, isLoading, messages)}
              </div>

              <div className="sound-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
