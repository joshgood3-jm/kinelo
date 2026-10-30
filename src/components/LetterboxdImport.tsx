"use client";
import { useState, useRef } from "react";
import { X, Download, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  total: number;
  message?: string;
  error?: string;
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function LetterboxdImport({ onClose, onImported }: Props) {
  const [tab, setTab] = useState<"username" | "csv">("username");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function importByUsername() {
    if (!username.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/letterboxd/rss?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();
      setResult(data);
      if (data.imported > 0) onImported();
    } catch {
      setResult({ imported: 0, skipped: 0, failed: 0, total: 0, error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function importCsv(file: File) {
    setLoading(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/letterboxd/csv", { method: "POST", body: form });
      const data = await res.json();
      setResult(data);
      if (data.imported > 0) onImported();
    } catch {
      setResult({ imported: 0, skipped: 0, failed: 0, total: 0, error: "Upload failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg">Import from Letterboxd</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add your watched films with ratings</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["username", "csv"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setResult(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "username" ? "By Username" : "CSV Upload"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === "username" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Imports your recent diary entries (up to ~200 films). Your Letterboxd profile must be public.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && importByUsername()}
                  placeholder="letterboxd username"
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
                <button
                  onClick={importByUsername}
                  disabled={loading || !username.trim()}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity flex items-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Import
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Export your full ratings history from{" "}
                <span className="text-foreground font-medium">letterboxd.com/settings/data</span>{" "}
                and upload the <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">ratings.csv</span> file. Includes your complete history.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="w-full border-2 border-dashed border-border hover:border-primary rounded-xl p-8 flex flex-col items-center gap-3 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                ) : (
                  <Upload size={24} className="text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {loading ? "Importing…" : "Click to upload ratings.csv"}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importCsv(file);
                  e.target.value = "";
                }}
              />
            </>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 text-sm ${result.error ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
              {result.error ? (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={16} />
                  <span>{result.error}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-medium">
                    <CheckCircle size={16} />
                    <span>Import complete</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{result.imported}</div>
                      <div className="text-xs text-muted-foreground">Added</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{result.skipped}</div>
                      <div className="text-xs text-muted-foreground">Already in list</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{result.failed}</div>
                      <div className="text-xs text-muted-foreground">Not found</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {result && !result.error && (
          <div className="px-5 pb-5">
            <button onClick={onClose} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
