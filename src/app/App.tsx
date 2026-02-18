import { useState, useCallback, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { UploadZone } from "./components/UploadZone";
import { TimelineView, type AnalysisResultData } from "./components/TimelineView";

type AppState = "idle" | "loading" | "result" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResultData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("theme") === "dark";
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const handleFileSelected = useCallback(async (file: File) => {
    setFileName(file.name);
    setState("loading");
    setErrorMessage("");

    try {
      const form = new FormData();
      form.append("file", file);
      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiBase}/analyze/deep`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "API error");
      }
      const data: AnalysisResultData = await res.json();
      setAnalysis(data);
      setState("result");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.";
      setErrorMessage(msg);
      setState("error");
    }
  }, []);

  const handleReset = () => {
    setState("idle");
    setAnalysis(null);
    setFileName("");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0F172A] flex flex-col transition-colors duration-200">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white dark:bg-[#1E293B] border-b border-[#E4E7EC] dark:border-[#334155] shadow-sm transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[#101828] dark:text-white"
                style={{ fontWeight: 700, letterSpacing: "-0.01em" }}
              >
                LexTimeline
              </span>
              <span
                className="text-xs bg-[#EEF4FF] dark:bg-[#1E3A5F] text-[#3538CD] dark:text-[#93C5FD] rounded-full px-2 py-0.5"
                style={{ fontWeight: 500 }}
              >
                v1.1 · Deep Analysis
              </span>
            </div>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-lg hover:bg-[#F2F4F7] dark:hover:bg-[#334155] text-[#667085] dark:text-[#94A3B8] transition-colors"
            aria-label="Karanlık mod değiştir"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {state === "result" && analysis ? (
          <TimelineView data={analysis} fileName={fileName} onReset={handleReset} />
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Hero */}
            <div className="space-y-4 text-center pt-4">
              <div
                className="inline-flex items-center gap-2 bg-[#EEF4FF] dark:bg-[#1E3A5F] text-[#3538CD] dark:text-[#93C5FD] rounded-full px-4 py-1.5 text-sm"
                style={{ fontWeight: 500 }}
              >
                Hukuki Belge Analizi &bull; GPT-4.1 Structured Outputs
              </div>
              <h1
                className="text-[#101828] dark:text-white"
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Belgelerinizi zaman çizelgesine dönüştürün,{" "}
                <span className="text-[#DC2626]">çelişkileri</span> tespit edin,{" "}
                <span className="text-[#7C3AED]">ilişkileri</span> haritalandırın
              </h1>
              <p className="text-[#667085] dark:text-[#94A3B8]" style={{ lineHeight: 1.7 }}>
                PDF'inizi yükleyin. GPT-4.1'in üç aşamalı analizi ile kronolojik olay
                çizelgesi, çelişki dedektifi ve otomatik düzenlenmiş ilişki haritası —
                hepsi tek bir arayüzde.
              </p>
            </div>

            {/* Upload zone */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E4E7EC] dark:border-[#334155] shadow-sm p-6 transition-colors duration-200">
              <UploadZone
                onFileSelected={handleFileSelected}
                isLoading={state === "loading"}
              />
            </div>

            {/* Error message */}
            {state === "error" && (
              <div className="rounded-xl bg-[#FEF3F2] dark:bg-[#450A0A] border border-[#FECDCA] dark:border-[#7F1D1D] px-5 py-4 text-sm text-[#B42318] dark:text-[#FCA5A5]">
                <strong>Hata:</strong> {errorMessage}
              </div>
            )}


          </div>
        )}
      </main>

    </div>
  );
}

