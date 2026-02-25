import { useState, useCallback, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { UploadZone } from "./components/UploadZone";
import { TimelineView, type AnalysisResultData } from "./components/TimelineView";
import { LEX_AI_MODEL } from "./constants/ai";
import { DEMO_ANALYSIS } from "./data/demoAnalysis";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const demoEnabled = new URLSearchParams(window.location.search).get("demo") === "1";
    if (!demoEnabled) return;
    setAnalysis(DEMO_ANALYSIS);
    setFileName("lex-sample-case.pdf");
    setState("result");
    setErrorMessage("");
  }, []);

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
    <div className="min-h-screen bg-surface-page flex flex-col transition-colors duration-200">
      <header className="sticky top-0 z-50 bg-surface-header border-b border-border-subtle shadow-sm transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="text-text-primary"
                style={{ fontWeight: 700, letterSpacing: "-0.01em" }}
              >
                LexTimeline
              </span>
              <span
                className="text-xs bg-surface-soft text-text-accent rounded-full px-2 py-0.5"
                style={{ fontWeight: 500 }}
              >
                v1.1 · Deep Analysis
              </span>
            </div>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-lg hover:bg-surface-muted text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            aria-label="Karanlık modu değiştir"
            aria-pressed={dark}
            title={dark ? "Açık moda geç" : "Koyu moda geç"}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {state === "result" && analysis ? (
          <TimelineView data={analysis} fileName={fileName} onReset={handleReset} />
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-4 text-center pt-4">
              <div
                className="inline-flex items-center gap-2 bg-surface-soft text-text-accent rounded-full px-4 py-1.5 text-sm"
                style={{ fontWeight: 500 }}
              >
                Hukuki Belge Analizi • {LEX_AI_MODEL} Structured Outputs
              </div>
              <h1
                className="text-text-primary"
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Belgelerinizi zaman çizelgesine dönüştürün,{" "}
                <span className="text-severity-high-solid">çelişkileri</span> tespit edin,{" "}
                <span className="text-text-accent">ilişkileri</span>{" "}
                haritalandırın
              </h1>
              <p className="text-text-muted" style={{ lineHeight: 1.7 }}>
                PDF&apos;inizi yükleyin. {LEX_AI_MODEL}&apos;in üç aşamalı analizi ile
                kronolojik olay çizelgesi, çelişki dedektifi ve otomatik düzenlenmiş ilişki
                haritası tek bir arayüzde.
              </p>
              <p className="text-xs text-text-subtle">
                Hızlı tanıtım modu: <a className="text-text-accent underline" href="?demo=1">demo ekranını aç</a>
              </p>
            </div>

            <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm p-6 transition-colors duration-200">
              <UploadZone onFileSelected={handleFileSelected} isLoading={state === "loading"} />
            </div>

            {state === "error" && (
              <div
                className="rounded-xl bg-surface-danger border border-border-danger px-5 py-4 text-sm text-text-danger"
                role="alert"
                aria-live="assertive"
              >
                <strong>Hata:</strong> {errorMessage}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
