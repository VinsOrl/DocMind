import { useDropzone } from "react-dropzone";
import { FileText, UploadCloud } from "lucide-react";

export default function UploadDropzone({ onFileAccepted, uploading, progress, file }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled: uploading,
    onDrop: (accepted, rejected) => {
      if (rejected.length) {
        const err = rejected[0].errors[0];
        onFileAccepted(null, err.code === "file-too-large" ? "File exceeds 50MB" : "Only PDF files are allowed");
        return;
      }
      if (accepted.length) onFileAccepted(accepted[0]);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`grain-heavy card flex min-h-64 cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-colors ${
        isDragActive ? "border-primary" : "border-border hover:border-primary/60"
      }`}
    >
      <input {...getInputProps()} />
      <div className="relative z-10 w-full text-center">
        {file ? (
          <>
            <FileText className="mx-auto mb-3 text-primary" size={40} />
            <p className="text-text-main">{file.name}</p>
            <p className="mt-1 text-sm text-text-muted">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </>
        ) : (
          <>
            <UploadCloud className="mx-auto mb-3 text-primary" size={40} />
            <p className="text-text-main">Drop your PDF here</p>
            <p className="mt-1 text-sm text-text-muted">or click to browse</p>
            <p className="mt-3 text-xs text-text-faint">PDF only · max 50MB</p>
          </>
        )}

        {uploading && (
          <div className="mx-auto mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
