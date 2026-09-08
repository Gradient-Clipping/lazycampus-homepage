import { useSyncExternalStore } from "react";
import { isPlaying, pause, play, subscribe } from "../engine/timeline";
import { DURATION } from "../engine/constants";

const chapters = [
  { t: 3, label: "代码" },
  { t: 8, label: "部署" },
  { t: 13, label: "扩容" },
  { t: 17, label: "自愈" },
  { t: 25, label: "回滚" },
];

function downloadRecording() {
  const data = new Blob(
    [JSON.stringify(window.__timeline.recording, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(data),
    link = document.createElement("a");
  link.href = url;
  link.download = "lazycampus-interactions.json";
  link.click();
  URL.revokeObjectURL(url);
}

export function Playback({ hud = false }: { hud?: boolean }) {
  const playing = useSyncExternalStore(subscribe, isPlaying);
  return (
    <div className={hud ? "playback playback-hud" : "playback"}>
      <button
        className="play-toggle"
        type="button"
        aria-label={playing ? "暂停品牌动效" : "播放品牌动效"}
        onClick={() => (playing ? pause() : play())}
      >
        {playing ? (
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m5 3 8 5-8 5z" fill="currentColor" />
          </svg>
        )}
      </button>
      {hud ? (
        <>
          <div className="hud-time">
            <span data-hud-time>0.000 s</span>
            <small>/ {DURATION}.000 s</small>
          </div>
          <label className="sr-only" htmlFor="timeline-scrubber">
            动画时间（秒）
          </label>
          <input
            id="timeline-scrubber"
            type="range"
            min="0"
            max={DURATION}
            step="0.001"
            defaultValue={0}
            onChange={(e) => window.__seek(Number(e.target.value))}
          />
          <div className="hud-chapters">
            {chapters.map((c) => (
              <button key={c.t} onClick={() => window.__seek(c.t)}>
                {c.label}
              </button>
            ))}
          </div>
          <span className="hud-tech">240 Hz · Canvas 2D</span>
          <button className="hud-recording" onClick={downloadRecording}>
            导出交互记录
          </button>
        </>
      ) : (
        <>
          <span>{playing ? "轻松，正在发生" : "感受一点轻松"}</span>
          <span className="playback-progress" aria-hidden="true">
            <i data-playback-progress />
          </span>
          <span className="playback-time" data-playback-time>
            00 / {DURATION}
          </span>
        </>
      )}
    </div>
  );
}
