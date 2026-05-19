"use client";

import * as React from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadedFileInfo {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  chunkCount: number;
}

interface FileUploadProps {
  /** Called with the uploaded file info after successful processing. */
  onFileUploaded: (file: UploadedFileInfo) => void;
  /** Called when the user wants to remove an attached file. */
  onFileRemoved: (fileId: string) => void;
  attachedFiles: UploadedFileInfo[];
  disabled?: boolean;
}

export function FileUpload({
  onFileUploaded,
  onFileRemoved,
  attachedFiles,
  disabled,
}: FileUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    if (disabled || uploading) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Upload failed");
      }

      const data = (await response.json()) as { document: UploadedFileInfo };
      onFileUploaded(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    // Reset so the same file can be re-selected
    event.target.value = "";
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence>
        {uploading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
          >
            <Loader2 className="size-3.5 animate-spin" />
            Processing...
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <span className="truncate text-xs text-destructive">{error}</span>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Attach file"
      >
        <Paperclip className="size-4" />
      </Button>
    </div>
  );
}

/** Renders attached file chips below the file upload button area. */
export function AttachedFiles({
  files,
  onRemove,
}: {
  files: UploadedFileInfo[];
  onRemove: (id: string) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {files.map((file) => (
        <motion.span
          key={file.id}
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
        >
          <FileText className="size-3.5 shrink-0" />
          <span className="max-w-[160px] truncate">{file.filename}</span>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="ml-0.5 flex size-4 items-center justify-center rounded-sm hover:bg-muted-foreground/20 hover:text-foreground"
            aria-label={`Remove ${file.filename}`}
          >
            <X className="size-3" />
          </button>
        </motion.span>
      ))}
    </div>
  );
}
