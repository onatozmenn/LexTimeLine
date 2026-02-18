import { useState, useCallback, useRef } from "react";
import { Upload, AlertCircle, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export function UploadZone({ onFileSelected, isLoading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Yalnızca PDF dosyaları kabul edilmektedir.";
    }
    if (file.size > 50 * 1024 * 1024) {
      return "Dosya boyutu 50 MB sınırını aşıyor.";
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isLoading && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-5
          rounded-2xl border-2 border-dashed p-16 cursor-pointer
          transition-all duration-200 select-none
          ${isDragging
            ? "border-[#2D6BE4] bg-[#EEF4FF] dark:bg-[#1E3A5F] scale-[1.01]"
            : "border-[#D0D5DD] dark:border-[#475569] bg-[#F9FAFB] dark:bg-[#0F172A] hover:border-[#2D6BE4] hover:bg-[#EEF4FF] dark:hover:bg-[#1E3A5F]"
          }
          ${isLoading ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onInputChange}
          disabled={isLoading}
        />

        <div
          className={`
            flex items-center justify-center w-16 h-16 rounded-full
            transition-colors duration-200
            ${isDragging ? "bg-[#2D6BE4]" : "bg-[#EEF4FF] dark:bg-[#1E3A5F]"}
          `}
        >
          {isLoading ? (
            <Loader2
              className="w-8 h-8 text-[#2D6BE4] animate-spin"
              strokeWidth={1.5}
            />
          ) : (
            <Upload
              className={`w-8 h-8 transition-colors ${
                isDragging ? "text-white" : "text-[#2D6BE4]"
              }`}
              strokeWidth={1.5}
            />
          )}
        </div>

        <div className="text-center space-y-1">
          {isLoading ? (
            <>
              <p className="text-[#101828] dark:text-white" style={{ fontWeight: 600 }}>
                Belge analiz ediliyor…
              </p>
              <p className="text-sm text-[#667085] dark:text-[#94A3B8]">
                GPT-4o hukuki olayları çıkarıyor. Lütfen bekleyin.
              </p>
            </>
          ) : (
            <>
              <p className="text-[#101828] dark:text-white" style={{ fontWeight: 600 }}>
                PDF dosyanızı buraya sürükleyin
              </p>
              <p className="text-sm text-[#667085] dark:text-[#94A3B8]">
                veya{" "}
                <span className="text-[#2D6BE4]" style={{ fontWeight: 500 }}>
                  dosya seçmek için tıklayın
                </span>
              </p>
              <p className="text-xs text-[#98A2B3] dark:text-[#64748B] pt-1">
                Yalnızca PDF &bull; Maksimum 50 MB
              </p>
            </>
          )}
        </div>

        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-[#2D6BE4]/5 pointer-events-none" />
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[#D92D20] dark:text-[#FCA5A5] bg-[#FEF3F2] dark:bg-[#450A0A] border border-[#FECDCA] dark:border-[#7F1D1D] rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
}
