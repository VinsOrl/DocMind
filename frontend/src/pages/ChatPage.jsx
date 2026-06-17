import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2, MessageSquare } from "lucide-react";
import api from "../api/client";
import ChatWindow from "../components/chat/ChatWindow";
import ChatInput from "../components/chat/ChatInput";

export default function ChatPage() {
  const { documentId, sessionId } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(sessionId ? Number(sessionId) : null);
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);

  const docId = Number(documentId);

  // Load document + its sessions; auto-create a session if none exist
  const loadSessions = useCallback(async () => {
    const { data } = await api.get("/chat/sessions");
    const mine = data.filter((s) => s.document_id === docId);
    setSessions(mine);
    return mine;
  }, [docId]);

  useEffect(() => {
    (async () => {
      try {
        const { data: d } = await api.get(`/documents/${docId}`);
        setDoc(d);
        const mine = await loadSessions();
        if (sessionId) {
          setActiveId(Number(sessionId));
        } else if (mine.length > 0) {
          setActiveId(mine[0].id);
        } else {
          // auto-create first session
          const { data: s } = await api.post("/chat/sessions", {
            document_id: docId,
            title: "New Chat",
          });
          setSessions([s]);
          setActiveId(s.id);
        }
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to load chat");
        navigate("/");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // Load messages when the active session changes
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const { data } = await api.get(`/chat/sessions/${activeId}`);
        setMessages(data.messages || []);
      } catch {
        setMessages([]);
      }
    })();
  }, [activeId]);

  const newSession = async () => {
    const { data: s } = await api.post("/chat/sessions", {
      document_id: docId,
      title: "New Chat",
    });
    setSessions([s, ...sessions]);
    setActiveId(s.id);
    setMessages([]);
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat session?")) return;
    await api.delete(`/chat/sessions/${id}`);
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null);
      setMessages([]);
    }
  };

  const ask = async (question) => {
    if (!activeId) return;
    setAsking(true);
    // optimistic: show the question immediately
    const optimistic = { id: `tmp-${Date.now()}`, question, answer: "", sources: [] };
    setMessages((m) => [...m, optimistic]);
    try {
      const { data } = await api.post(`/chat/sessions/${activeId}/ask`, {
        question,
      });
      setMessages((m) =>
        m.map((msg) =>
          msg.id === optimistic.id
            ? {
                id: data.message_id,
                question: data.question,
                answer: data.answer,
                sources: data.sources,
              }
            : msg
        )
      );
      loadSessions(); // refresh titles (auto-naming)
    } catch (err) {
      setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
      toast.error(err.response?.data?.detail || "Failed to get an answer");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-53px)]">
      {/* Sidebar */}
      <aside className="grain-layer flex w-70 flex-col border-r border-border bg-surface">
        <div className="relative z-10 flex flex-1 flex-col">
          <div className="border-b border-border p-3">
            <button
              onClick={() => navigate("/")}
              className="mb-3 flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main"
            >
              <ArrowLeft size={15} />
              Documents
            </button>
            <button
              onClick={newSession}
              className="btn-primary flex w-full items-center justify-center gap-1.5 text-sm"
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeId === s.id
                    ? "bg-raised text-text-main"
                    : "text-text-muted hover:bg-raised/60"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate">{s.title}</span>
                </span>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={14} className="text-error" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex flex-1 flex-col">
        <div className="relative z-10 border-b border-border bg-surface px-5 py-3">
          <h2 className="truncate font-medium text-text-main">
            {doc?.original_name || "Loading…"}
          </h2>
          {doc && (
            <p className="text-xs text-text-faint">
              {doc.page_count} pages · {doc.chunk_count} chunks
            </p>
          )}
        </div>
        <ChatWindow messages={messages} isLoading={asking} />
        <ChatInput onSubmit={ask} disabled={asking || !activeId} />
      </div>
    </div>
  );
}
