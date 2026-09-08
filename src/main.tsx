import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./refinement.css";
import "./editorial.css";

let resolve!: () => void;
let reject!: (reason: unknown) => void;
window.__ready = new Promise<void>((yes, no) => {
  resolve = yes;
  reject = no;
});
window.__ready.catch(() => {});
const ready = { resolve, reject };
createRoot(document.getElementById("root")!).render(<App ready={ready} />);
