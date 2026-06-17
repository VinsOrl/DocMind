import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, FileText } from "lucide-react";
import api from "../api/client";
import useDocumentStore from "../store/documentStore";
import DocumentCard from "../components/document/DocumentCard";

export default function DashboardPage() {
  const { documents, setDocuments } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get("/documents");
      setDocuments(data.documents);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Poll while any document is still processing
    const interval = setInterval(async () => {
      const stillProcessing = useDocumentStore
        .getState()
        .documents.some((d) => d.status === "processing");
      if (stillProcessing) load();
    }, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.original_name}"?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      setDocuments(documents.filter((d) => d.id !== doc.id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-text-main">
          My Documents
        </h1>
        <button
          onClick={() => navigate("/upload")}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus size={18} />
          Upload New
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-44 rounded-xl" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="card grain-light relative flex flex-col items-center justify-center py-20">
          <div className="relative z-10 text-center">
            <FileText className="mx-auto mb-4 text-text-faint" size={48} />
            <p className="mb-1 text-text-main">No documents yet</p>
            <p className="mb-5 text-sm text-text-muted">
              Upload your first PDF to start asking questions.
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="btn-primary"
            >
              Upload your first PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
