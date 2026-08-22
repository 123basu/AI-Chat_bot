let uid = 0;

export function LogoMark({ size = 28, className = "" }) {
  const id = `lg${++uid}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5l2.4 6.9a2 2 0 0 0 1.2 1.2l6.9 2.4-6.9 2.4a2 2 0 0 0-1.2 1.2L12 22.5l-2.4-6.9a2 2 0 0 0-1.2-1.2L1.5 12l6.9-2.4a2 2 0 0 0 1.2-1.2L12 1.5z"
        fill={`url(#${id})`}
      />
      <circle cx="19" cy="5" r="1.6" fill={`url(#${id})`} opacity="0.85" />
      <circle cx="5" cy="18.5" r="1.1" fill={`url(#${id})`} opacity="0.7" />
    </svg>
  );
}

function Svg({ size = 18, className = "", children, ...rest }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (p) => (
  <Svg {...p}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="16" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </Svg>
);

export const CloseIcon = (p) => (
  <Svg {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </Svg>
);

export const PlusIcon = (p) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const SendIcon = (p) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.99.99 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
  </Svg>
);

export const SunIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
  </Svg>
);

export const MoonIcon = (p) => (
  <Svg {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);

export const MonitorIcon = (p) => (
  <Svg {...p}>
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </Svg>
);

export const CopyIcon = (p) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);

export const CheckIcon = (p) => (
  <Svg {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const RefreshIcon = (p) => (
  <Svg {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Svg>
);

export const ThumbUpIcon = (p) => (
  <Svg {...p}>
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
  </Svg>
);

export const ThumbDownIcon = (p) => (
  <Svg {...p}>
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
  </Svg>
);

export const TrashIcon = (p) => (
  <Svg {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);

export const PencilIcon = (p) => (
  <Svg {...p}>
    <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </Svg>
);

export const LogoutIcon = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Svg>
);

export const ChatBubbleIcon = (p) => (
  <Svg {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Svg>
);
