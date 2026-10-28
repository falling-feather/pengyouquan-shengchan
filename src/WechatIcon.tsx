import type { SVGProps } from "react";

export type IconName =
  | "back"
  | "more"
  | "more-small"
  | "heart"
  | "comment"
  | "smile"
  | "image"
  | "microphone"
  | "pin"
  | "people"
  | "trash"
  | "menu"
  | "home"
  | "return"
  | "moon"
  | "alarm"
  | "mute"
  | "wifi"
  | "plane"
  | "plus"
  | "up"
  | "down"
  | "upload"
  | "download";

export function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    "data-icon": name,
  };
  switch (name) {
    case "back":
      return (
        <svg {...common} {...props}>
          <path d="M15.5 3.5 7 12l8.5 8.5" />
        </svg>
      );
    case "more":
      return (
        <svg {...common} {...props} fill="currentColor" stroke="none">
          <circle cx="4" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="20" cy="12" r="1.7" />
        </svg>
      );
    case "more-small":
      return (
        <svg {...common} {...props} fill="currentColor" stroke="none">
          <circle cx="8" cy="12" r="2.2" />
          <circle cx="16" cy="12" r="2.2" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} {...props}>
          <path d="M20.5 5.7a5.3 5.3 0 0 0-7.5 0l-1 1-1-1a5.3 5.3 0 0 0-7.5 7.5L12 21l8.5-7.8a5.3 5.3 0 0 0 0-7.5Z" />
        </svg>
      );
    case "comment":
      return (
        <svg {...common} {...props}>
          <path d="M5 4.5h14A2.5 2.5 0 0 1 21.5 7v9.1A2.4 2.4 0 0 1 19 18.5h-7.4L7 21v-2.5H5A2.4 2.4 0 0 1 2.5 16V7A2.5 2.5 0 0 1 5 4.5Z" />
        </svg>
      );
    case "smile":
      return (
        <svg {...common} {...props} strokeWidth="1.7">
          <circle cx="12" cy="12" r="10" />
          <circle cx="8.4" cy="9" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15.6" cy="9" r="1.1" fill="currentColor" stroke="none" />
          <path d="M7.5 14.5c.9 2.4 2.4 3.5 4.5 3.5s3.6-1.1 4.5-3.5Z" />
        </svg>
      );
    case "image":
      return (
        <svg {...common} {...props}>
          <rect x="2.5" y="3.5" width="19" height="17" rx=".5" />
          <path d="m3 16 5.2-4.7 4.1 3.5 3.1-2.6 5.8 5.2" />
        </svg>
      );
    case "microphone":
      return (
        <svg {...common} {...props}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-3 0h6" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common} {...props} fill="currentColor" stroke="none">
          <path d="M4 3h16v2H4zM12 6l6 6h-3v8H9v-8H6z" />
        </svg>
      );
    case "people":
      return (
        <svg {...common} {...props} fill="currentColor" stroke="none">
          <path d="M9.5 3.5a4.2 4.2 0 0 1 2.6 7.5c2.5.7 4.7 2.7 5.6 5.9.2.7-.3 1.3-1 1.3H2.2c-.7 0-1.2-.6-1-1.3.9-3.2 3.1-5.2 5.6-5.9a4.2 4.2 0 0 1 2.7-7.5Zm7.6 1a3.3 3.3 0 0 1 1.6 6.2c1.8.6 3.3 2 4 4.2.3.8-.1 1.4-.8 1.4h-3.1c-.7-2.3-2-4-3.7-5a4.4 4.4 0 0 0 2-6.8Z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common} {...props} fill="currentColor" stroke="none">
          <path d="M8 3h8l1 2h4v2H3V5h4l1-2Zm-2.5 5h13l-1 12.5c-.1.8-.7 1.5-1.5 1.5H8c-.8 0-1.4-.7-1.5-1.5L5.5 8Z" />
          <path d="M10 11v7m4-7v7" stroke="white" strokeWidth="1.3" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common} {...props} strokeWidth="2.5">
          <path d="M4 5h16M4 12h16M4 19h16" />
        </svg>
      );
    case "home":
      return (
        <svg {...common} {...props} strokeWidth="2.3">
          <path d="m3 11 9-7.5 9 7.5M5.5 10.5V20h13v-9.5" />
        </svg>
      );
    case "return":
      return (
        <svg {...common} {...props} strokeWidth="2.3">
          <path d="M8 6 4 10l4 4M5 10h11a4 4 0 0 1 4 4v5h-9" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common} {...props} fill="currentColor" stroke="none">
          <path d="M20 15a8.6 8.6 0 0 1-11-11A8.8 8.8 0 1 0 20 15Z" />
        </svg>
      );
    case "alarm":
      return (
        <svg {...common} {...props} strokeWidth="2.2">
          <circle cx="12" cy="13" r="7" />
          <path d="M12 9v4l3 2M5 3 2.5 5.5M19 3l2.5 2.5M6.5 19.5 5 21m12.5-1.5L19 21" />
        </svg>
      );
    case "mute":
      return (
        <svg {...common} {...props} strokeWidth="2">
          <path d="M4 4 20 20M7 10a5 5 0 0 1 8.5-4.5M17 9v4l2 3H8M10 20h4" />
        </svg>
      );
    case "wifi":
      return (
        <svg {...common} {...props} strokeWidth="2.3">
          <path d="M2.5 8.5a14 14 0 0 1 19 0M5.8 12a9 9 0 0 1 12.4 0M9.3 15.5a4 4 0 0 1 5.4 0" />
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "plane":
      return (
        <svg {...common} {...props} fill="currentColor" stroke="none">
          <path d="m3 14 7 1 6.5 5 1.5-1-3.5-5L21 9c1.2-1 1-2 .1-2.5-.5-.2-1.1 0-1.8.3l-7.7 3.4-5-3L5 8l3.6 4-5 2Z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "up":
      return (
        <svg {...common} {...props}>
          <path d="m6 14 6-6 6 6" />
        </svg>
      );
    case "down":
      return (
        <svg {...common} {...props}>
          <path d="m6 10 6 6 6-6" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common} {...props}>
          <path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4" />
        </svg>
      );
    case "download":
      return (
        <svg {...common} {...props}>
          <path d="M12 4v12m-4-4 4 4 4-4M4 18v3h16v-3" />
        </svg>
      );
  }
}
