import { useState } from 'react';

interface TextPromptProps {
  x: number;
  y: number;
  containerWidth: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

/** Small input that appears on the chart where the text tool was clicked. */
export function TextPrompt({ x, y, containerWidth, onSubmit, onCancel }: TextPromptProps) {
  const [text, setText] = useState('');
  const width = Math.min(260, containerWidth - 16);
  const submit = () => (text.trim() ? onSubmit(text.trim().slice(0, 80)) : onCancel());

  return (
    <div
      style={{ left: Math.min(Math.max(8, x), Math.max(8, containerWidth - width - 8)), top: y + 8, width }}
      className="absolute z-30 flex animate-pop-in gap-1.5 rounded-xl border border-line bg-surface p-1.5 shadow-overlay"
    >
      <input
        autoFocus
        value={text}
        maxLength={80}
        placeholder="Add a note…"
        aria-label="Annotation text"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
          if (event.key === 'Escape') onCancel();
        }}
        className="h-9 min-w-0 flex-1 rounded-lg bg-raised px-2.5 text-sm text-ink outline-none placeholder:text-ink-subtle coarse:h-11 coarse:text-base"
      />
      <button type="button" onClick={submit} className="h-9 rounded-lg bg-accent px-3 text-[13px] font-medium text-accent-ink coarse:h-11">
        Add
      </button>
    </div>
  );
}
