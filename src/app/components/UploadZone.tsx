import { useState, useCallback, useRef } from "react";
import { Upload, AlertCircle, Loader2 } from "lucide-react";
import { LEX_AI_MODEL } from "../constants/ai";

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
    [onFileSelected],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
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
            ? "border-border-accent bg-surface-soft scale-[1.01]"
            : "border-border-default bg-surface-page hover:border-border-accent hover:bg-surface-soft"
          }
          ${isLoading ? "pointer-events-none opacity-70" : ""}
        `}
        role="button"
        tabIndex={0}
        aria-label="PDF dosyası yükleyin"
        onKeyDown={(e) => {
          if (!isLoading && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
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
            ${isDragging ? "bg-accent-primary" : "bg-surface-soft"}
          `}
        >
          {isLoading ? (
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" strokeWidth={1.5} />
          ) : (
            <Upload
              className={`w-8 h-8 transition-colors ${
                isDragging ? "text-text-inverse" : "text-accent-primary"
              }`}
              strokeWidth={1.5}
            />
          )}
        </div>

        <div className="text-center space-y-1" aria-live="polite">
          {isLoading ? (
            <>
              <p className="text-text-primary" style={{ fontWeight: 600 }}>
                Belge analiz ediliyor...
              </p>
              <p className="text-sm text-text-muted">
                {LEX_AI_MODEL} hukuki olayları çıkarıyor. Lütfen bekleyin.
              </p>
            </>
          ) : (
            <>
              <p className="text-text-primary" style={{ fontWeight: 600 }}>
                PDF dosyanızı buraya sürükleyin
              </p>
              <p className="text-sm text-text-muted">
                veya{" "}
                <span className="text-text-accent" style={{ fontWeight: 500 }}>
                  dosya seçmek için tıklayın
                </span>
              </p>
              <p className="text-xs text-text-subtle pt-1">Yalnızca PDF • Maksimum 50 MB</p>
            </>
          )}
        </div>

        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-accent-primary/5 pointer-events-none" />
        )}
      </div>

      {error && (
        <div
          className="mt-3 flex items-center gap-2 text-sm text-text-danger bg-surface-danger border border-border-danger rounded-lg px-4 py-3"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
