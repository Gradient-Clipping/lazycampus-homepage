/** An unprojected rectangular deck. CSS projects the complete plane once;
 * keys, speakers and trackpad share exactly the same perspective. */
type Key = [label: string, units: number];
const singles = (labels: string): Key[] =>
  labels.split(" ").map((label) => [label, 1]);
const rows: Key[][] = [
  [...singles("~ 1 2 3 4 5 6 7 8 9 0 − ="), ["delete", 2]],
  [["tab", 1.5], ...singles("Q W E R T Y U I O P [ ]"), ["|", 1.5]],
  [["caps", 1.75], ...singles("A S D F G H J K L ; '"), ["return", 2.25]],
  [["shift", 2.25], ...singles("Z X C V B N M , . /"), ["shift", 2.75]],
  [
    ["fn", 1],
    ["ctrl", 1],
    ["opt", 1],
    ["cmd", 1.25],
    ["", 4.75],
    ["cmd", 1.25],
    ["opt", 1],
    ["←", 1.25],
    ["↕", 1.25],
    ["→", 1.25],
  ],
];
const keyGeometry = rows.flatMap((row, r) => {
  let offset = 0;
  return row.map(([label, units]) => {
    const key = {
      label,
      x: 50 + offset * 35,
      y: 46 + r * 27,
      w: units * 35 - 3,
    };
    offset += units;
    return key;
  });
});
export function KeyboardDeck() {
  return (
    <div className="laptop-deck-plane">
      <svg
        className="laptop-deck"
        viewBox="0 0 624 310"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="deck-titanium"
            x1="312"
            y1="0"
            x2="312"
            y2="310"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#b0b5bd" />
            <stop offset=".08" stopColor="#e3e6ea" />
            <stop offset=".68" stopColor="#d2d6dc" />
            <stop offset="1" stopColor="#f0f1f3" />
          </linearGradient>
          <linearGradient id="deck-edge">
            <stop stopColor="#8d949e" />
            <stop offset=".45" stopColor="#e8ecf0" />
            <stop offset="1" stopColor="#979ea8" />
          </linearGradient>
        </defs>
        <rect
          x="1"
          y="1"
          width="622"
          height="308"
          rx="12"
          fill="url(#deck-titanium)"
          stroke="#a8afb9"
          strokeWidth="1.1"
        />
        <rect x="45" y="21" width="534" height="166" rx="8" fill="#818995" />
        <g fontFamily="Arial, sans-serif" fontSize="6.7" textAnchor="middle">
          {[
            "esc",
            ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
            "◯",
          ].map((label, i) => (
            <g key={label}>
              <rect
                x={50 + i * 37.5}
                y="27"
                width="34.5"
                height="14"
                rx="2.4"
                fill="#343c49"
              />
              <text x={67.25 + i * 37.5} y="36.5" fill="#b9c3d1" fontSize="5.4">
                {label}
              </text>
            </g>
          ))}
          {keyGeometry.map((key, i) => (
            <g key={i}>
              <rect
                x={key.x}
                y={key.y}
                width={key.w}
                height="23"
                rx="3"
                fill="#343c49"
                stroke="#252c37"
                strokeWidth=".7"
              />
              <text
                x={key.x + key.w / 2}
                y={key.y + 14.5}
                fill="#b9c3d1"
                fontSize={key.label.length > 1 ? 5 : 6.7}
              >
                {key.label}
              </text>
            </g>
          ))}
        </g>
        <g fill="#89929e">
          {Array.from({ length: 24 }, (_, r) =>
            Array.from({ length: 4 }, (_, col) => (
              <g key={`${r}-${col}`}>
                <circle cx={16 + col * 4.5} cy={29 + r * 6.2} r=".8" />
                <circle cx={594 + col * 4.5} cy={29 + r * 6.2} r=".8" />
              </g>
            )),
          )}
        </g>
        <rect
          x="192"
          y="201"
          width="240"
          height="91"
          rx="6"
          fill="#d9dde3"
          stroke="#a2aab6"
          strokeWidth=".9"
        />
        <path
          d="M5 304H619Q618 309 610 309H14Q6 309 5 304Z"
          fill="url(#deck-edge)"
        />
        <path
          d="M268 304H356Q354 308 346 308H278Q270 308 268 304"
          fill="#a1a9b6"
        />
        <path d="M16 303H608" stroke="#ffffffb0" strokeWidth="1" />
      </svg>
      <i className="deck-probe back-left" />
      <i className="deck-probe back-right" />
      <i className="deck-probe front-left" />
      <i className="deck-probe front-right" />
    </div>
  );
}
