"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const TARGETS: { key: string; label: string; required?: boolean }[] = [
  { key: "startedAt",       label: "STARTED AT (date)", required: true },
  { key: "endedAt",         label: "ENDED AT" },
  { key: "durationMinutes", label: "DURATION (MIN)" },
  { key: "tokensIn",        label: "TOKENS IN" },
  { key: "tokensOut",       label: "TOKENS OUT" },
  { key: "linesAdded",      label: "LINES ADDED" },
  { key: "linesRemoved",    label: "LINES REMOVED" },
  { key: "tool",            label: "TOOL" },
  { key: "model",           label: "MODEL" },
  { key: "projectSlug",     label: "PROJECT" },
];

const TOOLS = ["CLAUDE_CODE", "CURSOR", "WINDSURF", "COPILOT", "MANUAL"];

export function CsvUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultTool, setDefaultTool] = useState("MANUAL");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onPick = async (f: File) => {
    setFile(f);
    setMsg(null);
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    const hs = parseHeader(lines[0] ?? "");
    setHeaders(hs);
    // Read up to 5 data rows so the user can see what they're about to upload.
    setPreviewRows(lines.slice(1, 6).map((l) => parseHeader(l)));
    const auto: Record<string, string> = {};
    for (const t of TARGETS) {
      const found = hs.find((h) => h.toLowerCase().replace(/[_\s-]/g, "") === t.key.toLowerCase());
      if (found) auto[t.key] = found;
    }
    setMapping(auto);
  };

  const submit = () =>
    start(async () => {
      if (!file || !mapping.startedAt) {
        setMsg("ERROR: pick a file and map STARTED AT first");
        return;
      }
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mapping", JSON.stringify(mapping));
      fd.set("defaultTool", defaultTool);
      const res = await fetch("/api/sessions/upload-file", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`ERROR ${res.status}: ${json.error ?? "upload failed"}`);
        return;
      }
      setMsg(`UPLOADED ${json.inserted} / ${json.received}${json.warnings?.length ? ` · ${json.warnings.length} WARNINGS` : ""}`);
      router.refresh();
    });

  return (
    <div className="space-y-5 font-mono text-sm">
      <label className="block">
        <span className="spec-label text-ink/60">CSV FILE</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          className="block w-full mt-1 file:bg-ink file:text-hazard file:border-0 file:px-3 file:py-1 file:mr-3 file:font-mono file:text-xs file:cursor-pointer border border-ink/30 p-2"
        />
      </label>

      {headers.length > 0 && (
        <>
          <div>
            <span className="spec-label text-ink/60">DEFAULT TOOL (when not in CSV)</span>
            <select
              value={defaultTool}
              onChange={(e) => setDefaultTool(e.target.value)}
              className="block mt-1 border border-ink bg-bone px-2 py-1 font-mono text-sm"
            >
              {TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="border border-ink/30">
            <div className="bg-ink text-hazard spec-label font-bold px-3 py-2">COLUMN MAPPING</div>
            <table className="w-full text-xs">
              <tbody>
                {TARGETS.map((t) => (
                  <tr key={t.key} className="border-b border-ink/10 last:border-b-0">
                    <td className="p-2 spec-label text-ink/70">
                      {t.label}{t.required && <span className="text-hazard"> *</span>}
                    </td>
                    <td className="p-2">
                      <select
                        value={mapping[t.key] ?? ""}
                        onChange={(e) =>
                          setMapping((m) => ({ ...m, [t.key]: e.target.value }))
                        }
                        className="border border-ink/30 bg-bone px-2 py-1 font-mono text-xs w-full"
                      >
                        <option value="">(skip)</option>
                        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sample preview: show the first N raw rows so the user sees
              what they're about to commit. Updates instantly as they re-map. */}
          {previewRows.length > 0 && (
            <div className="border border-ink/30">
              <div className="bg-ink text-hazard spec-label font-bold px-3 py-2 flex items-center justify-between">
                <span>PREVIEW · FIRST {previewRows.length} ROWS</span>
                <span className="text-bone/60">RAW</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-bone-soft">
                      {headers.map((h) => (
                        <th key={h} className="px-2 py-1 spec-label text-ink/70 text-left border-r border-ink/10 last:border-r-0">
                          {h}
                          {Object.entries(mapping).find(([_, v]) => v === h)?.[0] && (
                            <div className="text-hazard normal-case text-[10px] font-bold">
                              → {Object.entries(mapping).find(([_, v]) => v === h)?.[0]}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-t border-ink/10">
                        {headers.map((_, ci) => (
                          <td key={ci} className="px-2 py-1 border-r border-ink/10 last:border-r-0 text-ink/80">
                            {row[ci] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-3 py-2 spec-label text-ink/60 border-t border-ink/20">
                Hazard arrows show how each column will map. Re-pick above to change.
              </p>
            </div>
          )}

          <button
            onClick={submit}
            disabled={pending || !mapping.startedAt}
            className="bg-ink text-hazard spec-label font-bold px-4 py-2 border border-ink hover:bg-hazard hover:text-ink disabled:opacity-50"
          >
            {pending ? "UPLOADING…" : "UPLOAD CSV →"}
          </button>
        </>
      )}

      {msg && <div className="spec-label border-l-2 border-hazard pl-3 text-ink/70">{msg}</div>}
    </div>
  );
}

function parseHeader(line: string): string[] {
  const out: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter((s) => s.length);
}
