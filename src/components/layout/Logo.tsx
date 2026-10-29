export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
      <rect width="32" height="32" rx="8" fill="rgb(var(--accent))" />
      <g stroke="#fff" strokeLinecap="round" strokeWidth="2">
        <path d="M11 7v18" />
        <path d="M21 9v14" />
      </g>
      <rect x="8.5" y="12" width="5" height="9" rx="1.2" fill="#fff" />
      <rect x="18.5" y="13" width="5" height="6" rx="1.2" fill="#fff" fillOpacity=".55" />
    </svg>
  );
}
