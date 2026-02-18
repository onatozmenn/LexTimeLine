/**
 * ChatInterface.tsx — LexTimeline Case Assistant
 *
 * A RAG-lite chat UI that lets lawyers "interrogate" the analysed document.
 *
 * How it works (frontend perspective):
 *  1. On send, we attempt a real POST /chat to the FastAPI backend.
 *  2. If the server isn't running (CORS / network error), we fall back to
 *     a rich, context-aware mock response that reads the actual AnalysisResult.
 *  3. Every response is revealed character-by-character (typewriter effect)
 *     to mimic server-sent-event streaming.
 *  4. Any [Olay #N] token in the response is rendered as a clickable citation
 *     badge.  Clicking it fires `onCitationClick(N-1)` which causes
 *     TimelineView to switch to the timeline tab and scroll-highlight that event.
 *
 * Supported mock query patterns (Turkish):
 *  özet / özetle          → Chronological summary with citations
 *  çelişki / tutarsız     → Full contradiction report
 *  <entity name>          → Per-entity event & contradiction list
 *  strateji / öneri       → Recommended legal actions
 *  risk / kritik          → Risk dashboard
 *  tarih / kronoloji      → Formatted chronology
 *  tanık / ifade          → Witness conflict focus
 *  olay #N                → Full detail for that specific event
 *  (default)              → Helpful fallback with relevant citations
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Scale,
  Send,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  FileText,
  User,
  BookOpen,
} from "lucide-react";
import type { AnalysisResultData } from "./TimelineView";
import type { ContradictionData } from "./ContradictionCard";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  data: AnalysisResultData;
  /** Called when user clicks a [Olay #N] citation — idx is 0-based */
  onCitationClick: (eventIdx: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggested questions generator
// ─────────────────────────────────────────────────────────────────────────────

function buildSuggestedQuestions(data: AnalysisResultData): string[] {
  const questions: string[] = [];

  questions.push("Bu davayı ve temel olayları kısaca özetle.");

  const highContra = data.contradictions.find((c) => c.severity === "HIGH");
  if (highContra) {
    const title = highContra.title.length > 42
      ? highContra.title.slice(0, 42) + "…"
      : highContra.title;
    questions.push(`"${title}" çelişkisinin hukuki önemi nedir?`);
  } else if (data.contradictions.length > 0) {
    questions.push(`Tespit edilen ${data.contradictions.length} çelişkiyi açıkla.`);
  }

  // Most-frequent entity
  const freq = new Map<string, number>();
  data.events.forEach((e) =>
    e.entities.forEach((name) => freq.set(name, (freq.get(name) ?? 0) + 1))
  );
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    questions.push(`${top[0]}'nin davadaki rolü ve katıldığı olaylar neler?`);
  }

  questions.push("Hukuki strateji açısından en kritik öncelikler neler?");

  return questions.slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// Context-aware mock response engine
// ─────────────────────────────────────────────────────────────────────────────

function generateMockResponse(query: string, data: AnalysisResultData): string {
  const lower    = query.toLowerCase();
  const events   = data.events;
  const contras  = data.contradictions;

  // Entity frequency map
  const freq = new Map<string, number>();
  events.forEach((e) => e.entities.forEach((n) => freq.set(n, (freq.get(n) ?? 0) + 1)));
  const topEntities = [...freq.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  // Detect mentioned entity (match on any word ≥ 4 chars)
  const mentionedEntity = topEntities.find((name) =>
    name.toLowerCase().split(/\s+/).some((w) => w.length >= 4 && lower.includes(w))
  );

  // Detect specific event number e.g. "olay #3" or "3. olay"
  const evNumMatch = lower.match(/(?:olay\s*#?\s*(\d+))|(?:(\d+)\s*\.?\s*olay)/);
  const specificEvIdx = evNumMatch
    ? parseInt(evNumMatch[1] ?? evNumMatch[2] ?? "-1") - 1
    : -1;

  const cite = (idx: number) => `[Olay #${idx + 1}]`;
  const sevLabel = (s: string) =>
    s === "HIGH" ? "🔴 Yüksek" : s === "MEDIUM" ? "🟡 Orta" : "🔵 Düşük";

  // ── Specific event lookup ────────────────────────────────────────────────
  if (specificEvIdx >= 0 && specificEvIdx < events.length) {
    const ev    = events[specificEvIdx];
    const flags = contras.filter((c) => c.involved_event_ids.includes(specificEvIdx));
    return (
      `**${cite(specificEvIdx)} — Detaylı Analiz**\n\n` +
      `📅 **Tarih:** ${ev.date}  |  📂 **Kategori:** ${ev.category}  |  📄 Sayfa ${ev.source_page}\n\n` +
      `**Açıklama:**\n${ev.description}\n\n` +
      (ev.entities.length > 0 ? `**İlgili Taraflar:** ${ev.entities.join(" · ")}\n\n` : "") +
      (ev.significance        ? `**Hukuki Önem:** ${ev.significance}\n\n`              : "") +
      (flags.length > 0
        ? `**⚠️ Bu olay ${flags.length} çelişkiye konu olmaktadır:**\n` +
          flags.map((c) => `• **${c.title}** — ${sevLabel(c.severity)}`).join("\n")
        : "✅ Bu olayda herhangi bir çelişki tespit edilmemiştir.")
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  if (lower.match(/özet|özetle|genel|anlat|kısaca|ne hakkında|başından/)) {
    const first = events[0];
    const last  = events[events.length - 1];
    const cats  = [...new Set(events.map((e) => e.category))];
    const riskStr =
      data.risk_level === "HIGH"   ? "🔴 Yüksek Risk" :
      data.risk_level === "MEDIUM" ? "🟡 Orta Risk"   : "🟢 Düşük Risk";

    return (
      `**📋 Dava Özeti**\n\n` +
      `Bu belge, **${first?.date}** – **${last?.date}** arasında geçen, ${events.length} kritik olay içeren bir hukuki uyuşmazlığı kapsamaktadır.\n\n` +
      `**Kronolojik Temel Olaylar:**\n` +
      events.slice(0, Math.min(6, events.length)).map((e, i) =>
        `• **${cite(i)}** (${e.date}) — ${e.description.slice(0, 88)}${e.description.length > 88 ? "…" : ""}`
      ).join("\n") +
      (events.length > 6 ? `\n• *...ve ${events.length - 6} olay daha*` : "") +
      `\n\n**Hukuki Kategoriler:** ${cats.join(", ")}\n\n` +
      `**Risk Değerlendirmesi:** ${riskStr} — ${contras.length} çelişki tespit edildi\n\n` +
      `**Başlıca Taraflar:** ${topEntities.slice(0, 5).join(", ")}`
    );
  }

  // ── Contradictions ───────────────────────────────────────────────────────
  if (lower.match(/çelişki|tutarsız|sorun|problem|hata|yanlış|uyuşmaz|çakış/)) {
    if (contras.length === 0) {
      return `Bu davada herhangi bir çelişki tespit edilmemiştir. Tüm **${events.length} olay** birbiriyle tutarlı görünmektedir.`;
    }
    const highC = contras.filter((c) => c.severity === "HIGH");
    const medC  = contras.filter((c) => c.severity === "MEDIUM");
    const lowC  = contras.filter((c) => c.severity === "LOW");
    const riskStr =
      data.risk_level === "HIGH"   ? "🔴 YÜKSEK" :
      data.risk_level === "MEDIUM" ? "🟡 ORTA"   : "🟢 DÜŞÜK";

    let r =
      `**⚠️ Çelişki Analizi Raporu**\n\n` +
      `Analizde **${contras.length} çelişki** tespit edilmiş olup genel risk seviyesi **${riskStr}** olarak değerlendirilmektedir.\n\n`;

    if (highC.length > 0) {
      r += `**🔴 Kritik Çelişkiler (${highC.length} adet):**\n`;
      highC.forEach((c) => {
        const refs = c.involved_event_ids.map((id) => cite(id)).join(" ve ");
        r += `\n• **${c.title}** — ${refs}\n${c.description.slice(0, 155)}${c.description.length > 155 ? "…" : ""}\n`;
        if (c.legal_basis) r += `> *Hukuki dayanak: ${c.legal_basis}*\n`;
      });
    }
    if (medC.length > 0) {
      r += `\n**🟡 Orta Seviyeli Çelişkiler (${medC.length} adet):**\n`;
      medC.forEach((c) => {
        const refs = c.involved_event_ids.map((id) => cite(id)).join(" ve ");
        r += `• **${c.title}** — ${refs}\n`;
      });
    }
    if (lowC.length > 0) {
      r += `\n**🔵 Düşük Öncelikli (${lowC.length} adet):**\n`;
      lowC.forEach((c) => { r += `• ${c.title}\n`; });
    }
    return r;
  }

  // ── Specific entity ──────────────────────────────────────────────────────
  if (mentionedEntity) {
    const evList = events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.entities.includes(mentionedEntity));
    const ecList = contras.filter((c) =>
      c.involved_event_ids.some((id) => events[id]?.entities.includes(mentionedEntity))
    );
    const kindLabel =
      mentionedEntity.toLowerCase().match(/a\.ş|şirketi|ltd|kuruluş/) ? "Kuruluş" :
      mentionedEntity.toLowerCase().match(/mahkeme|daire|yargıtay/)    ? "Mahkeme" : "Taraf";

    let r =
      `**👤 ${mentionedEntity} — ${kindLabel} Analizi**\n\n` +
      `Bu taraf **${evList.length} olayda** aktif rol oynamıştır:\n\n`;
    evList.forEach(({ e, i }) => {
      r += `• **${cite(i)}** (${e.date}): ${e.description.slice(0, 90)}${e.description.length > 90 ? "…" : ""}\n`;
    });
    if (ecList.length > 0) {
      r += `\n**⚠️ Bu tarafla ilgili ${ecList.length} çelişki mevcuttur:**\n\n`;
      ecList.forEach((c) => {
        const refs = c.involved_event_ids.map((id) => cite(id)).join(", ");
        r += `• **${c.title}** (${sevLabel(c.severity)} — ${refs})\n`;
        if (c.recommended_action) {
          r += `> *Tavsiye: ${c.recommended_action.slice(0, 100)}…*\n`;
        }
      });
    } else {
      r += `\n✅ Bu tarafla doğrudan ilişkili herhangi bir çelişki tespit edilmemiştir.`;
    }
    return r;
  }

  // ── Legal strategy ───────────────────────────────────────────────────────
  if (lower.match(/strateji|öneri|tavsiye|savunma|iddia|hukuki|ne yapılmalı|eylem|öncelik/)) {
    const actions = contras.filter((c) => c.recommended_action).slice(0, 4);
    const highC   = contras.filter((c) => c.severity === "HIGH");

    let r =
      `**⚖️ Hukuki Strateji Önerileri**\n\n` +
      `Mevcut dava analizi esas alınarak öncelikli eylemler:\n\n`;

    if (actions.length > 0) {
      actions.forEach((c, i) => {
        const refs = c.involved_event_ids.map((id) => cite(id)).join(", ");
        r += `**${i + 1}. ${c.title}** (${refs})\n${c.recommended_action}\n\n`;
      });
    } else {
      r += `• Tüm çelişkili belgeler için bağımsız inceleme başlatılması\n• Tanık ifadelerinin yeniden değerlendirilmesi\n• Delillerin mahkeme kanalıyla temin edilmesi\n\n`;
    }
    if (highC.length > 0) {
      const top  = highC[0];
      const refs = top.involved_event_ids.map((id) => cite(id)).join(" ve ");
      r += `**⚠️ Öncelikli Dikkat:** ${refs} arasındaki **"${top.title}"** çelişkisi yargılamada belirleyici faktör olabilir.`;
      if (top.legal_basis) r += `\n> *Hukuki dayanak: ${top.legal_basis}*`;
    }
    return r;
  }

  // ── Risk ─────────────────────────────────────────────────────────────────
  if (lower.match(/risk|tehlike|dikkat|kritik|acil|öncelik/)) {
    const highC = contras.filter((c) => c.severity === "HIGH");
    const medC  = contras.filter((c) => c.severity === "MEDIUM");
    const riskStr =
      data.risk_level === "HIGH"   ? "🔴 YÜKSEK — Acil müdahale gerektirebilir"  :
      data.risk_level === "MEDIUM" ? "🟡 ORTA — Yakın takip önerilir"             :
                                     "🟢 DÜŞÜK — Standart takip yeterli";
    return (
      `**🎯 Risk Değerlendirmesi**\n\n` +
      `**Genel Risk Seviyesi:** ${riskStr}\n\n` +
      (highC.length > 0
        ? `**🔴 Kritik Bulgular (${highC.length}):**\n` +
          highC.map((c) => `• **${c.title}** — ${c.involved_event_ids.map((id) => cite(id)).join(", ")}`).join("\n") + "\n\n"
        : "") +
      (medC.length > 0
        ? `**🟡 Orta Riskler (${medC.length}):**\n` +
          medC.map((c) => `• ${c.title}`).join("\n") + "\n\n"
        : "") +
      `**Özet:** ${events.length} olay · ${contras.length} çelişki · ${highC.length} kritik bulgu`
    );
  }

  // ── Chronology ───────────────────────────────────────────────────────────
  if (lower.match(/tarih|ne zaman|kronoloji|sıra|zaman çizelgesi|olay listesi/)) {
    return (
      `**📅 Kronolojik Zaman Çizelgesi**\n\n` +
      events.map((e, i) =>
        `**${cite(i)}** — ${e.date}\n${e.description.slice(0, 80)}${e.description.length > 80 ? "…" : ""}`
      ).join("\n\n")
    );
  }

  // ── Witness conflict ─────────────────────────────────────────────────────
  if (lower.match(/tanık|beyan|ifade|şahit|witness/)) {
    const wc = contras.filter((c) => c.type === "WITNESS_CONFLICT");
    if (wc.length === 0) {
      return (
        `Bu davada kayıtlı bir **WITNESS_CONFLICT** türü çelişki bulunmamaktadır.\n\n` +
        `Mevcut çelişkiler:\n` +
        contras.slice(0, 3).map((c) =>
          `• **${c.title}** — ${c.involved_event_ids.map((id) => cite(id)).join(", ")}`
        ).join("\n")
      );
    }
    return (
      `**👥 Tanık İfadesi Çelişkileri**\n\n` +
      `${wc.length} adet tanık ifadesi çelişkisi tespit edilmiştir:\n\n` +
      wc.map((c) => {
        const refs = c.involved_event_ids.map((id) => cite(id)).join(" ve ");
        return `• **${c.title}** — ${refs}\n${c.description.slice(0, 150)}${c.description.length > 150 ? "…" : ""}`;
      }).join("\n\n")
    );
  }

  // ── Default ──────────────────────────────────────────────────────────────
  const mid   = Math.floor(events.length * 0.4);
  const pivot = events[mid];
  const first = contras[0];

  return (
    `Bu soruyu mevcut dava bağlamında değerlendirdim.\n\n` +
    `Elimdeki veriler: **${events.length} olay** ve **${contras.length} çelişki**.\n\n` +
    (pivot ? `İlgili bir kayıt: **${cite(mid)}** (${pivot.date}) — ${pivot.description.slice(0, 110)}…\n\n` : "") +
    (first
      ? `Öne çıkan çelişki: **${first.title}** (${first.involved_event_ids.map((id) => cite(id)).join(", ")})\n\n`
      : "") +
    `Daha spesifik bir soru sormak ister misiniz?\n` +
    `• "Bu davayı özetle"\n• "En kritik çelişkiyi açıkla"\n• "Hukuki strateji öner"`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API call (with mock fallback)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchChatResponse(
  query: string,
  data: AnalysisResultData,
): Promise<string> {
  try {
    const apiBase = import.meta.env.VITE_API_URL ?? "";
    const res = await fetch(`${apiBase}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, context: data, model: "gpt-4o" }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.answer as string) || generateMockResponse(query, data);
  } catch {
    // Server not running — use the rich mock response engine
    return generateMockResponse(query, data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown + citation renderer
// ─────────────────────────────────────────────────────────────────────────────

function CitationBadge({
  label,
  eventIdx,
  onClick,
}: {
  label: string;
  eventIdx: number;
  onClick: (idx: number) => void;
}) {
  return (
    <button
      onClick={() => onClick(eventIdx)}
      className="
        inline-flex items-center gap-1
        bg-[#EEF4FF] hover:bg-[#2D6BE4]
        text-[#1D4ED8] hover:text-white
        border border-[#BFDBFE] hover:border-[#2D6BE4]
        rounded-md px-1.5 py-0.5 mx-0.5
        transition-all duration-150 cursor-pointer
        align-middle
      "
      title="Zaman çizelgesinde bu olaya git"
    >
      <FileText style={{ width: 9, height: 9 }} />
      <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>
        {label}
      </span>
    </button>
  );
}

function parseInline(
  text: string,
  onCitationClick: (idx: number) => void,
): React.ReactNode {
  const REGEX = /(\*\*[^*]+\*\*|\[(?:Olay|Event) #\d+\])/g;
  const parts = text.split(REGEX);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-[#101828]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        const cit = part.match(/^\[(?:Olay|Event) #(\d+)\]$/);
        if (cit) {
          return (
            <CitationBadge
              key={i}
              label={part}
              eventIdx={parseInt(cit[1]) - 1}
              onClick={onCitationClick}
            />
          );
        }
        return part ? <span key={i}>{part}</span> : null;
      })}
    </>
  );
}

function RichContent({
  text,
  isCursor,
  onCitationClick,
}: {
  text: string;
  isCursor: boolean;
  onCitationClick: (idx: number) => void;
}) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line) return <div key={i} className="h-1.5" />;

        // Bullet
        const bullet = line.match(/^[•\-]\s+(.+)/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[#2D6BE4] font-bold flex-shrink-0 mt-px">•</span>
              <span className="text-sm text-[#344054] leading-relaxed">
                {parseInline(bullet[1], onCitationClick)}
              </span>
            </div>
          );
        }

        // Block quote
        const quote = line.match(/^>\s+(.+)/);
        if (quote) {
          return (
            <div
              key={i}
              className="border-l-2 border-[#FDE68A] pl-3 py-1 my-1 rounded-r text-xs text-[#92400E] italic bg-[#FFFAEB]"
            >
              {parseInline(quote[1], onCitationClick)}
            </div>
          );
        }

        return (
          <p key={i} className="text-sm text-[#344054] leading-relaxed">
            {parseInline(line, onCitationClick)}
          </p>
        );
      })}
      {isCursor && (
        <span
          className="inline-block w-0.5 h-[14px] bg-[#2D6BE4] ml-0.5 align-middle animate-pulse"
          style={{ verticalAlign: "text-bottom" }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI atoms
// ────────────────────────────────────────────────────��────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-[#93AEED]"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#F2F4F7]"
      title="Kopyala"
    >
      {copied
        ? <Check style={{ width: 12, height: 12, color: "#16A34A" }} />
        : <Copy style={{ width: 12, height: 12, color: "#98A2B3" }} />
      }
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ChatInterface component
// ─────────────────────────────────────────────────────────────────────────────

export function ChatInterface({ data, onCitationClick }: ChatInterfaceProps) {
  const suggestedQuestions = buildSuggestedQuestions(data);

  const welcomeMsg: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content:
      `Merhaba! Bu davaya ait **${data.total_events_found} kritik olay** ve ` +
      `**${data.total_contradictions_found} çelişkiyi** içeren belgeyi inceledim. ` +
      `Zaman çizelgesini açıklamak, çelişkileri analiz etmek veya hukuki strateji ` +
      `değerlendirmesi yapmak için sorularınızı yanıtlamaya hazırım.\n\n` +
      `**[Olay #N]** formatındaki referanslara tıklayarak ilgili olayı zaman çizelgesinde görüntüleyebilirsiniz.`,
    timestamp: new Date(),
  };

  const [messages, setMessages]       = useState<ChatMessage[]>([welcomeMsg]);
  const [input, setInput]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [typingId, setTypingId]       = useState<string | null>(null);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, [input]);

  // Cleanup typewriter on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Typewriter: progressively reveal `fullText` into message with id `msgId`
  const startTypewriter = useCallback((fullText: string, msgId: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let idx = 0;
    const CHUNK    = 4;
    const INTERVAL = 16;
    setTypingId(msgId);
    timerRef.current = setInterval(() => {
      idx = Math.min(idx + CHUNK, fullText.length);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: fullText.slice(0, idx) } : m))
      );
      if (idx >= fullText.length) {
        clearInterval(timerRef.current!);
        setTypingId(null);
      }
    }, INTERVAL);
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Thinking delay (800–1600 ms for realism)
    const thinkMs = 800 + Math.random() * 800;
    await new Promise((r) => setTimeout(r, thinkMs));

    const response = await fetchChatResponse(query, data);
    setIsLoading(false);

    const aiMsgId = `a-${Date.now()}`;
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",          // filled by typewriter
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    startTypewriter(response, aiMsgId);
  }, [input, isLoading, data, startTypewriter]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMessages([welcomeMsg]);
    setInput("");
    setIsLoading(false);
    setTypingId(null);
  };

  const hasUserMessages = messages.some((m) => m.role === "user");

  // Risk badge
  const riskColor =
    data.risk_level === "HIGH"   ? "#DC2626" :
    data.risk_level === "MEDIUM" ? "#D97706" : "#16A34A";
  const riskLabel =
    data.risk_level === "HIGH"   ? "Yüksek Risk" :
    data.risk_level === "MEDIUM" ? "Orta Risk"   :
    data.risk_level === "LOW"    ? "Düşük Risk"  : "Risk Yok";

  return (
    <div className="flex flex-col bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E4E7EC] dark:border-[#334155] overflow-hidden shadow-sm transition-colors duration-200"
      style={{ minHeight: 600 }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#1E4B7A] px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Scale className="w-4 h-4 text-white" strokeWidth={1.8} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm" style={{ fontWeight: 700 }}>
                Dava Asistanı
              </span>
              <span className="bg-white/20 text-white/90 text-[10px] rounded-full px-2 py-0.5"
                style={{ fontWeight: 600 }}>
                GPT-4o · RAG-lite
              </span>
            </div>
            <p className="text-white/60 text-[10px] mt-0.5">
              Sağlanan dava bağlamına dayalı yanıtlar verilir
            </p>
          </div>
        </div>

        {/* Context pills */}
        <div className="hidden sm:flex items-center gap-2">
          {[
            { label: `${data.total_events_found} Olay`,    bg: "bg-white/15", text: "text-white" },
            { label: `${data.total_contradictions_found} Çelişki`, bg: "bg-white/15", text: "text-white" },
          ].map((p) => (
            <span key={p.label}
              className={`${p.bg} ${p.text} text-[10px] rounded-full px-2.5 py-1`}
              style={{ fontWeight: 600 }}>
              {p.label}
            </span>
          ))}
          <span
            className="text-[10px] rounded-full px-2.5 py-1"
            style={{ fontWeight: 600, background: `${riskColor}40`, color: "white" }}
          >
            {riskLabel}
          </span>
          <button
            onClick={handleClear}
            className="text-white/60 hover:text-white transition-colors p-1 rounded"
            title="Konuşmayı temizle"
          >
            <RotateCcw style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#F9FAFB] dark:bg-[#0F172A] transition-colors duration-200"
        style={{ minHeight: 380 }}>

        {messages.map((msg) => (
          <AnimatePresence key={msg.id}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {msg.role === "assistant" && (
                <div className="flex items-start gap-2.5 max-w-[84%] group">
                  {/* AI avatar */}
                  <div className="w-7 h-7 rounded-lg bg-[#1E3A5F] flex items-center justify-center flex-shrink-0 mt-1">
                    <Scale style={{ width: 13, height: 13, color: "white" }} strokeWidth={1.8} />
                  </div>

                  <div className="flex flex-col gap-1">
                    {/* Bubble */}
                    <div className="bg-white dark:bg-[#334155] rounded-2xl rounded-tl-md border border-[#E4E7EC] dark:border-[#475569] px-4 py-3 shadow-sm">
                      <RichContent
                        text={msg.content || " "}
                        isCursor={typingId === msg.id}
                        onCitationClick={onCitationClick}
                      />
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-1 pl-1">
                      <span style={{ fontSize: 10, color: "#98A2B3" }}>
                        {msg.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {typingId !== msg.id && <CopyButton text={msg.content} />}
                    </div>
                  </div>
                </div>
              )}

              {msg.role === "user" && (
                <div className="flex items-start gap-2.5 max-w-[78%]">
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className="rounded-2xl rounded-tr-md px-4 py-3 text-sm text-white leading-relaxed"
                      style={{ background: "#1E3A5F" }}
                    >
                      {msg.content}
                    </div>
                    <span style={{ fontSize: 10, color: "#98A2B3", paddingRight: 4 }}>
                      {msg.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-[#E4E7EC] dark:bg-[#475569] flex items-center justify-center flex-shrink-0 mt-1">
                    <User style={{ width: 13, height: 13, color: "#667085" }} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-[#1E3A5F] flex items-center justify-center flex-shrink-0 mt-1">
                <Scale style={{ width: 13, height: 13, color: "white" }} strokeWidth={1.8} />
              </div>
              <div className="bg-white dark:bg-[#334155] rounded-2xl rounded-tl-md border border-[#E4E7EC] dark:border-[#475569] shadow-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggested question chips (only before first user message) */}
        <AnimatePresence>
          {!hasUserMessages && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="pt-1"
            >
              <p style={{ fontSize: 10, color: "#98A2B3", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                <Sparkles style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
                Önerilen Sorular
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="
                      flex items-center gap-1.5 text-left
                      bg-white dark:bg-[#334155] hover:bg-[#EEF4FF] dark:hover:bg-[#1E3A5F] hover:border-[#2D6BE4]
                      border border-[#E4E7EC] dark:border-[#475569] rounded-xl px-3 py-2
                      transition-all duration-150 disabled:opacity-50
                    "
                    style={{ fontSize: 11, color: "#344054", fontWeight: 500, maxWidth: 300 }}
                  >
                    <ChevronRight style={{ width: 11, height: 11, color: "#2D6BE4", flexShrink: 0 }} />
                    {q}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Context info bar ────────────────────────────────────────────── */}
      <div className="px-5 py-2 bg-[#F2F4F7] dark:bg-[#1E293B] border-t border-[#E4E7EC] dark:border-[#334155] flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <BookOpen style={{ width: 11, height: 11, color: "#98A2B3" }} />
          <span style={{ fontSize: 10, color: "#98A2B3" }}>
            Bağlam: {data.total_events_found} olay · {data.total_contradictions_found} çelişki · {data.events.flatMap((e) => e.entities).filter((v, i, a) => a.indexOf(v) === i).length} taraf
          </span>
        </div>
        <span style={{ fontSize: 10, color: "#CBD5E1" }}>·</span>
        <span style={{ fontSize: 10, color: "#98A2B3" }}>
          <span className="text-[#2D6BE4] font-semibold">[Olay #N]</span> etiketlerine tıklayarak zaman çizelgesine gidebilirsiniz
        </span>
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-white dark:bg-[#1E293B] border-t border-[#E4E7EC] dark:border-[#334155]">
        <div className={`
          flex items-end gap-2 rounded-xl border px-3 py-2
          transition-all duration-150
          ${isLoading ? "border-[#E4E7EC] dark:border-[#475569] bg-[#F9FAFB] dark:bg-[#0F172A]" : "border-[#D0D5DD] dark:border-[#475569] bg-white dark:bg-[#0F172A] focus-within:border-[#2D6BE4] focus-within:ring-2 focus-within:ring-[#EEF4FF]"}
        `}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'Hukuki bir soru sorun… (Örn: "En önemli çelişkiyi açıkla")'}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-sm text-[#101828] dark:text-white placeholder-[#98A2B3] disabled:cursor-not-allowed"
            style={{ lineHeight: 1.55, maxHeight: 96, minHeight: 24 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="
              w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5
              transition-all duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
              bg-[#1E3A5F] hover:bg-[#2D6BE4] text-white
            "
          >
            <Send style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <p style={{ fontSize: 9, color: "#CBD5E1", marginTop: 5, paddingLeft: 2 }}>
          Enter ↵ gönder · Shift+Enter yeni satır
        </p>
      </div>
    </div>
  );
}