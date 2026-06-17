import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="grain-layer flex-1 overflow-y-auto bg-base p-4">
      <div className="relative z-10 mx-auto max-w-3xl">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MessageSquare className="mb-3 text-text-faint" size={40} />
            <p className="text-text-main">Ask your first question</p>
            <p className="mt-1 text-sm text-text-muted">
              Answers are grounded in this document, with cited sources.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={m.id ?? `msg-${i}`} message={m} />
        ))}

        {isLoading && (
          <div className="mb-6 flex justify-start">
            <div className="bubble-ai px-4 py-3">
              <div className="flex gap-1.5 text-primary">
                <span className="dot">●</span>
                <span className="dot">●</span>
                <span className="dot">●</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
