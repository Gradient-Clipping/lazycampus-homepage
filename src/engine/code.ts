import { clamp } from "./math";

export type Token = { text: string; color: string };
const plain = "#dce3ee",
  keyword = "#c792ea",
  name = "#82aaff",
  string = "#c3d98b",
  call = "#ffcb8b";
const token = (text: string, color = plain): Token => ({ text, color });
/** Short executable TypeScript example. Tokens and typing positions are source data. */
export const CODE_LINES: readonly Token[][] = [
  [
    token("import ", keyword),
    token("{ serve } ", name),
    token("from ", keyword),
    token("'@hono/node-server'", string),
  ],
  [
    token("import ", keyword),
    token("{ Hono } ", name),
    token("from ", keyword),
    token("'hono'", string),
  ],
  [],
  [
    token("const ", keyword),
    token("app ", name),
    token("= "),
    token("new ", keyword),
    token("Hono", call),
    token("()"),
  ],
  [
    token("app", name),
    token("."),
    token("get", call),
    token("("),
    token("'/'", string),
    token(", (c) "),
    token("=> ", keyword),
    token("c."),
    token("text", call),
    token("("),
    token("'Hello, cloud.'", string),
    token("))"),
  ],
  [],
  [
    token("serve", call),
    token("({ "),
    token("fetch", name),
    token(": app.fetch, "),
    token("port", name),
    token(": "),
    token("3000", "#f78c6c"),
    token(" })"),
  ],
];
export const CODE_LENGTH = CODE_LINES.reduce(
  (n, line) => n + line.reduce((sum, t) => sum + t.text.length, 0),
  0,
);
const TYPING_WINDOWS = [
  [0.65, 1.95],
  [2.12, 3.05],
  [3.05, 3.05],
  [3.35, 3.9],
  [4.05, 5.15],
  [5.15, 5.15],
  [5.35, 6.0],
];
export function codeCharacters(time: number, start = 0) {
  const age = time - start;
  return CODE_LINES.reduce((count, line, i) => {
    const length = line.reduce((n, token) => n + token.text.length, 0);
    if (!length) return count;
    const [a, b] = TYPING_WINDOWS[i];
    return count + Math.floor(length * clamp((age - a) / (b - a)) + 1e-8);
  }, 0);
}
