"use client";

// Animated text with wave effect on each character
function AnimatedText({
  text,
  animate = true,
}: {
  text: string;
  animate?: boolean;
}) {
  return (
    <span className="inline-flex">
      {text.split("").map((char, i) => (
        <span
          key={i}
          className={animate ? "animate-char-wave" : ""}
          style={animate ? { animationDelay: `${i * 80}ms` } : undefined}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

interface ThinkingIndicatorProps {
  title?: string;
  isThinking?: boolean;
}

export function ThinkingIndicator({
  title = "Thinking",
  isThinking = true,
}: ThinkingIndicatorProps) {
  return (
    <div className="py-4">
      <div className="max-w-[85%] md:max-w-[75%]">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <span className="font-medium">
            <AnimatedText
              text={isThinking ? `${title}...` : title}
              animate={isThinking}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
