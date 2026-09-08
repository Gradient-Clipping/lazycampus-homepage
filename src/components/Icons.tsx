import type { CSSProperties } from "react";

export function Mark({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width="36"
      height="36"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d="M20 3v12"
          transform={`rotate(${i * 45} 20 20)`}
          stroke="currentColor"
          strokeWidth="5.3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** Small, optically aligned duotone illustrations; no font glyphs or external sprites. */
export function TechIcon({
  kind,
  className = "",
}: {
  kind: "cluster" | "git" | "flow" | "shield" | "cloud" | "bag" | "campus";
  className?: string;
}) {
  const supplied = { cluster: "kubernetes", git: "git-branch", flow: "flux" };
  if (kind === "cluster" || kind === "git" || kind === "flow") {
    return (
      <span
        className={`tech-icon supplied-icon icon-${kind} ${className}`}
        data-supplied-icon={supplied[kind]}
        aria-hidden="true"
      />
    );
  }
  const paths = {
    shield:
      "M20 5 32 10v9c0 8-7 13-12 16-5-3-12-8-12-16v-9L20 5ZM15 20l4 4 7-8",
    cloud:
      "M12 29a8 8 0 0 1-1-16 10 10 0 0 1 19 2 7 7 0 0 1-1 14H12ZM15 22h10M20 17v10",
    bag: "M9 14h22l2 20H7l2-20ZM14 15V11a6 6 0 0 1 12 0v4M15 23c2 4 8 4 10 0",
    campus:
      "m5 15 15-8 15 8-15 8-15-8ZM11 19v10c5 5 13 5 18 0V19M35 15v13M33 30h4",
  };
  return (
    <svg
      className={`tech-icon ${className}`}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="34"
        height="34"
        rx="12"
        fill="currentColor"
        opacity=".065"
      />
      <path
        d={paths[kind]}
        fill="currentColor"
        fillOpacity=".08"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Arrow({
  diagonal = false,
  className = "",
}: {
  diagonal?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SmallIcon({
  kind,
}: {
  kind: "calendar" | "chart" | "grid" | "bag" | "check" | "chat" | "layers";
}) {
  const paths = {
    calendar: "M5 5h14v15H5zM8 3v4m8-4v4M5 10h14M9 14h2m3 0h1m-6 3h2",
    chart: "M4 4v16h17M8 16v-5m5 5V7m5 9v-8",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    bag: "M5 8h14l1 12H4L5 8ZM8 8V6a4 4 0 0 1 8 0v2",
    check: "m5 12 4 4L19 6",
    chat: "M20 11a8 8 0 0 1-8 8H4l1.5-4A8 8 0 1 1 20 11ZM8 10h8m-8 4h5",
    layers: "m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5",
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={paths[kind]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
