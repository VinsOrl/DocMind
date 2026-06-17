import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import api from "../api/client";
import UploadDropzone from "../components/document/UploadDropzone";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleFile = (accepted, error) => {
    if (error) {
      toast.error(error);
      return;
    }
    setFile(accepted);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setProgress(100);
      toast.success("Uploaded — processing started");
      navigate(`/chat/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <button
        onClick={() => navigate("/")}
        className="mb-5 flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main"
      >
        <ArrowLeft size={16} />
        Back to Documents
      </button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-main">
        Upload a PDF
      </h1>

      <UploadDropzone
        onFileAccepted={handleFile}
        uploading={uploading}
        progress={progress}
        file={file}
      />

      {file && !uploading && (
        <div className="mt-5 flex gap-3">
          <button onClick={handleUpload} className="btn-primary flex-1">
            Upload & Process
          </button>
          <button onClick={() => setFile(null)} className="btn-outline">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
