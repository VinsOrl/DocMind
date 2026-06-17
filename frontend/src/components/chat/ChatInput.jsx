import { useState } from "react";
import { Send } from "lucide-react";

const MAX = 500;

export default function ChatInput({ onSubmit, disabled }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-surface p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            rows={1}
            value={value}
            maxLength={MAX}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this document…"
            className="input-field max-h-32 resize-none"
            style={{ minHeight: "44px" }}
          />
          <div className="mt-1 text-right text-xs text-text-faint">
            {value.length}/{MAX}
          </div>
        </div>
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="btn-primary flex h-11 w-11 items-center justify-center p-0"
          title="Send (Enter)"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
