import { splitCitedText } from '../../utils/research';
import type { SourceRecord } from '../../types/sources';

export default function CitedText({
  text,
  sources,
  onCitationClick,
  className = '',
}: {
  text: string;
  sources?: SourceRecord[];
  onCitationClick?: (citation: number, source?: SourceRecord) => void;
  className?: string;
}) {
  if (!text) return null;
  const parts = splitCitedText(String(text));

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') return <span key={index}>{part.value}</span>;
        const source = sources?.find(s => s.citationNumber === part.n);
        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (part.n != null) {
                onCitationClick?.(part.n, source);
                const el = document.getElementById(`source-cite-${part.n}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }}
            className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary-50 px-1 align-super text-[10px] font-bold text-primary-700 hover:bg-primary-100"
            title={source ? source.title : `Citation ${part.n}`}
          >
            {part.n}
          </button>
        );
      })}
    </span>
  );
}
