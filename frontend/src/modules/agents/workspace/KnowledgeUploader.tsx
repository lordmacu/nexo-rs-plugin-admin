// Upload + list knowledge documents (.txt, .md, .pdf). The backend
// extracts text on upload and stores everything as MD under
// `<workspace>/knowledge/<slug>.md`, then appends to the agent's
// `extra_docs` so the framework injects each one into the system
// prompt next turn.

import { useCallback, useEffect, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import {
  deleteKnowledge,
  listKnowledge,
  uploadKnowledge,
  type KnowledgeListResponse,
} from "../../../api/workspace";
import { KNOWLEDGE_INTRO } from "./templates";
import { Button, Spinner } from "../../../components/ui";
import { useT } from "../../../i18n";

interface Props {
  agent_id: string;
}

const ACCEPTED_EXT = ".md,.txt,.pdf";

export default function KnowledgeUploader({ agent_id }: Props) {
  const t = useT();

  function formatSize(bytes: number): string {
    if (bytes < 1024) return t("agents.knowledge.size_b", { size: bytes });
    if (bytes < 1024 * 1024)
      return t("agents.knowledge.size_kb", {
        size: (bytes / 1024).toFixed(1),
      });
    return t("agents.knowledge.size_mb", {
      size: (bytes / (1024 * 1024)).toFixed(1),
    });
  }

  const [data, setData] = useState<KnowledgeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await listKnowledge(agent_id);
      setData(r);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [agent_id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleFiles(files: FileList | File[]) {
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadKnowledge(agent_id, file);
      }
      await refresh();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function remove(filename: string) {
    setDeletingFile(filename);
    try {
      await deleteKnowledge(agent_id, filename);
      await refresh();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingFile(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">{KNOWLEDGE_INTRO}</p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files.length) {
            void handleFiles(e.dataTransfer.files);
          }
        }}
        className={`block border-2 border-dashed rounded p-6 text-center cursor-pointer transition ${
          dragActive ? "border-accent bg-accent/5" : " hover:border-accent/60"
        } ${uploading ? "opacity-60" : ""}`}
      >
        <input
          type="file"
          accept={ACCEPTED_EXT}
          multiple
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) {
              void handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
          className="sr-only"
        />
        <div className="flex flex-col items-center gap-2 text-text-secondary">
          {uploading ? <Spinner size="lg" /> : <Upload size={28} />}
          <div className="text-sm">
            {uploading
              ? t("agents.knowledge.processing")
              : t("agents.knowledge.dropzone_hint")}
          </div>
          <div className="text-xs">{t("agents.knowledge.accepted_formats")}</div>
        </div>
      </label>

      {uploadError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {uploadError}
        </div>
      )}

      {loadError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {t("agents.knowledge.list_error", { error: loadError })}
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-medium text-text-primary">
              {t("agents.knowledge.uploaded_count", { count: data.files.length })}
            </h4>
            <span className="text-xs text-text-secondary">
              {t("agents.knowledge.tokens_per_turn", {
                count: data.total_est_tokens.toLocaleString(),
              })}
            </span>
          </div>
          {loading && (
            <div className="text-xs text-text-secondary flex items-center gap-2">
              <Spinner size="md" /> {t("agents.knowledge.refreshing")}
            </div>
          )}
          {data.files.length === 0 && !loading && (
            <div className="text-sm text-text-secondary italic">
              {t("agents.knowledge.empty")}
            </div>
          )}
          <ul className="divide-y divide-border-DEFAULT border  rounded">
            {data.files.map((f) => (
              <li
                key={f.filename}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <FileText size={16} className="text-text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono truncate text-text-primary">
                    {f.filename}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {t("agents.knowledge.size_tokens", {
                      size: formatSize(f.size_bytes),
                      tokens: f.est_tokens.toLocaleString(),
                    })}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => void remove(f.filename)}
                  disabled={deletingFile === f.filename}
                  aria-label={t("agents.knowledge.delete_aria", {
                    filename: f.filename,
                  })}
                >
                  {deletingFile === f.filename ? (
                    <Spinner size="md" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
