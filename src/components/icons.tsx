import type { SVGProps } from "react";

const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="4.5" rx="2" />
      <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  orders: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  products: (
    <>
      <path d="M12 3c3 2.4 5 5 5 8.2A5 5 0 0 1 7 11.2C7 8 9 5.4 12 3Z" />
      <path d="M12 21v-7" />
      <path d="M9.5 17.5 12 21l2.5-3.5" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 14.4c2 .6 3.4 2.4 3.4 4.6" />
    </>
  ),
  services: (
    <>
      <path d="M12 3c1.5 3-1.5 4.2-1.5 6.6A2.6 2.6 0 0 0 13 12c0-1 .5-1.6 1-2 1.8 1.7 3 3.6 3 5.5a5 5 0 0 1-10 0C7 11.4 10.5 8 12 3Z" />
    </>
  ),
  reports: (
    <>
      <path d="M3.5 20.5h17" />
      <rect x="5" y="11" width="3.5" height="6.5" rx="1.2" />
      <rect x="10.2" y="7" width="3.5" height="10.5" rx="1.2" />
      <rect x="15.4" y="3.8" width="3.5" height="13.7" rx="1.2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a7.7 7.7 0 0 0 .1-1.4 7.7 7.7 0 0 0-.1-1.4l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.4-1.4L14.4 3h-4l-.4 2.4A7.6 7.6 0 0 0 7.6 6.8l-2.3-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2.8l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2.4 1.4l.4 2.4h4l.4-2.4a7.6 7.6 0 0 0 2.3-1.4l2.3 1 2-3.4Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7" />
      <path d="M6 7l1 12.2A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.8L18 7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20H14" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m14 6-6 6 6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />,
  pin: (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h10v10h-10z" />
      <path d="M12.5 9.5h4l3 3.2v3.8h-7z" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="16.5" cy="18" r="1.8" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  sparkles: (
    <>
      <path d="M12 3.5 13.6 8 18 9.6 13.6 11.2 12 15.7 10.4 11.2 6 9.6 10.4 8Z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />
      <path d="M5 15l.6 1.6 1.6.6-1.6.6L5 19.4l-.6-1.6-1.6-.6 1.6-.6Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16.5 14.5h1.5" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2Z" />
      <path d="m4 7.2 8 4.3 8-4.3M12 21v-9.5" />
    </>
  ),
  filter: <path d="M4 6h16l-6 7v6l-4-2v-4Z" />,
  crown: <path d="m3 8 4 3 5-6 5 6 4-3-2 11H5Z" />,
  star: <path d="m12 3.5 2.6 5.6 6.1.8-4.5 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.3 9.9l6.1-.8Z" />,
  fire: <path d="M12 3c1.5 3.4-1.8 4.8-1.8 7.4a2.9 2.9 0 0 0 2.8 2.9c0-1.1.5-1.8 1.1-2.3 2 1.9 3.4 4 3.4 6.1a5.5 5.5 0 0 1-11 0C6.5 12.6 10.5 8.8 12 3Z" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  utensils: (
    <>
      <path d="M6 3v7a2.5 2.5 0 0 0 5 0V3M8.5 12.5V21" />
      <path d="M17.5 3c-1.7 1.5-2.5 3.5-2.5 6 0 2 .9 3.3 2.5 3.8V21" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.7,
  ...rest
}: { name: IconName; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
