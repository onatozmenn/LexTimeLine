interface CategoryBadgeProps {
  category: string;
  size?: "sm" | "md";
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "Mahkeme İşlemi":     { bg: "bg-[#EEF4FF]", text: "text-[#3538CD]", dot: "bg-[#3538CD]" },
  "Tanık İfadesi":      { bg: "bg-[#F0FDF4]", text: "text-[#15803D]", dot: "bg-[#15803D]" },
  "Olay Anı":           { bg: "bg-[#FEF3F2]", text: "text-[#B42318]", dot: "bg-[#B42318]" },
  "Sözleşme / Anlaşma": { bg: "bg-[#FFFAEB]", text: "text-[#B45309]", dot: "bg-[#B45309]" },
  "Dilekçe / Başvuru":  { bg: "bg-[#F5F3FF]", text: "text-[#6D28D9]", dot: "bg-[#6D28D9]" },
  "Karar / Hüküm":      { bg: "bg-[#F0F9FF]", text: "text-[#0369A1]", dot: "bg-[#0369A1]" },
  "Tebligat / Bildirim":{ bg: "bg-[#FFF7ED]", text: "text-[#C2410C]", dot: "bg-[#C2410C]" },
  "İdari İşlem":        { bg: "bg-[#F0FDF4]", text: "text-[#166534]", dot: "bg-[#166534]" },
  "İcra Takibi":        { bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#991B1B]" },
  "Diğer":              { bg: "bg-[#F9FAFB]", text: "text-[#374151]", dot: "bg-[#374151]" },
};

const DEFAULT_STYLE = { bg: "bg-[#F9FAFB]", text: "text-[#374151]", dot: "bg-[#374151]" };

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
