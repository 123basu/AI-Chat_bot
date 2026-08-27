export default function AIAvatar({ size = 28, className = "" }) {
  return (
    <span
      className={`ai-avatar ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="avatar-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <text x="16" y="22" textAnchor="middle" fill="url(#avatar-grad)" fontSize="22" fontWeight="700">
          ✦
        </text>
      </svg>
    </span>
  );
}