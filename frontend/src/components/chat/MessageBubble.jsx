import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import SourceCard from "./SourceCard";

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false);
  const sources = message.sources || [];

  return (
    <div className="mb-6 space-y-3">
      {/* User question */}
      <div className="flex justify-end">
        <div className="bubble-user max-w-[80%] px-4 py-2.5 text-sm text-text-main">
          {message.question}
        </div>
      </div>

      {/* AI answer */}
      <div className="flex justify-start">
        <div className="bubble-ai max-w-[85%] px-4 py-3">
          <div className="answer-md text-sm leading-relaxed text-text-main">
            <ReactMarkdown>{message.answer}</ReactMarkdown>
          </div>

          {sources.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary"
              >
                {showSources ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <FileText size={13} />
                {sources.length} source{sources.length > 1 ? "s" : ""}
              </button>
              {showSources && (
                <div className="mt-3 space-y-2">
                  {sources.map((s) => (
                    <SourceCard key={s.chunk_id} source={s} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
