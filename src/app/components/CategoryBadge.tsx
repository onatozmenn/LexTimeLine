interface CategoryBadgeProps {
  category: string;
  size?: "sm" | "md";
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "Mahkeme İşlemi": { bg: "bg-surface-soft", text: "text-text-accent", dot: "bg-accent-primary" },
  "Tanık İfadesi": { bg: "bg-severity-none-bg", text: "text-severity-none-text", dot: "bg-severity-none-solid" },
  "Olay Anı": { bg: "bg-severity-high-bg", text: "text-severity-high-text", dot: "bg-severity-high-solid" },
  "Sözleşme / Anlaşma": { bg: "bg-severity-medium-bg", text: "text-severity-medium-text", dot: "bg-severity-medium-solid" },
  "Dilekçe / Başvuru": { bg: "bg-surface-info", text: "text-text-accent", dot: "bg-accent-primary" },
  "Karar / Hüküm": { bg: "bg-surface-soft", text: "text-text-accent", dot: "bg-accent-primary-subtle" },
  "Tebligat / Bildirim": { bg: "bg-severity-medium-bg", text: "text-severity-medium-text", dot: "bg-severity-medium-solid" },
  "İdari İşlem": { bg: "bg-severity-none-bg", text: "text-severity-none-text", dot: "bg-severity-none-solid" },
  "İcra Takibi": { bg: "bg-severity-high-bg", text: "text-severity-high-text", dot: "bg-severity-high-solid" },
  "Diğer": { bg: "bg-surface-page", text: "text-text-secondary", dot: "bg-text-secondary" },
};

const DEFAULT_STYLE = { bg: "bg-surface-page", text: "text-text-secondary", dot: "bg-text-secondary" };

export function CategoryBadge({ category, size = "md" }: CategoryBadgeProps) {
  const style = CATEGORY_STYLES[category] ?? DEFAULT_STYLE;
  const padding = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full
        ${padding} ${style.bg} ${style.text} ${textSize}
      `}
      style={{ fontWeight: 500, whiteSpace: "nowrap" }}
    >
      <span className={`rounded-full flex-shrink-0 ${dotSize} ${style.dot}`} />
      {category}
    </span>
  );
}
