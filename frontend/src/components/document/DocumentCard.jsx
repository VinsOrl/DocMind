import { useNavigate } from "react-router-dom";
import { FileText, MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLES = {
  ready: { label: "Ready", cls: "bg-success/15 text-success border-success/30" },
  processing: {
    label: "Processing",
    cls: "bg-warning/15 text-warning border-warning/30",
  },
  pending: {
    label: "Pending",
    cls: "bg-warning/15 text-warning border-warning/30",
  },
  failed: { label: "Failed", cls: "bg-error/15 text-error border-error/30" },
};

export default function DocumentCard({ document: doc, onDelete }) {
  const navigate = useNavigate();
  const status = STATUS_STYLES[doc.status] || STATUS_STYLES.pending;

  const created = doc.created_at
    ? formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })
    : "";

  return (
    <div className="card grain-light relative flex flex-col p-5">
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-3 flex items-start justify-between">
          <FileText className="text-primary" size={30} />
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs ${status.cls}`}
          >
            {doc.status === "processing" && (
              <span className="mr-1 inline-block animate-spin">◐</span>
            )}
            {status.label}
          </span>
        </div>
        <h3
          className="mb-1 line-clamp-2 font-medium text-text-main"
          title={doc.original_name}
        >
          {doc.original_name}
        </h3>
        <p className="mb-4 text-xs text-text-faint">
          {doc.page_count} pages · {doc.chunk_count} chunks · {created}
        </p>
        <div className="mt-auto flex items-center gap-2">
          <button
            disabled={doc.status !== "ready"}
            onClick={() => navigate(`/chat/${doc.id}`)}
            className="btn-primary flex flex-1 items-center justify-center gap-1.5 text-sm"
          >
            <MessageSquare size={15} />
            Start Chat
          </button>
          <button
            onClick={() => onDelete(doc)}
            className="btn-outline px-2.5"
            title="Delete document"
          >
            <Trash2 size={16} className="text-error" />
          </button>
        </div>
      </div>
    </div>
  );
}
