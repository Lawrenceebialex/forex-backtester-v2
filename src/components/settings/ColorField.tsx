import { useEffect, useState } from 'react';
import { normalizeHex } from '@/domain/candleColors';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

/** Native color picker plus an editable hex field. Invalid hex input snaps back on blur. */
export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const hex = normalizeHex(draft);
    if (hex) onChange(hex);
    else setDraft(value);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-raised p-1.5 transition-colors focus-within:border-accent">
      <label
        className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line-strong coarse:h-10 coarse:w-10"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} color picker`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <input
        type="text"
        value={draft}
        maxLength={7}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-label={`${label} hex value`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && commit()}
        className="w-full min-w-0 bg-transparent font-mono text-xs uppercase text-ink outline-none coarse:text-base"
      />
    </div>
  );
}
