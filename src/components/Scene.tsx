import { Mark } from "./Icons";
import { KeyboardDeck } from "./KeyboardDeck";
import { resetDemo, performAction } from "../engine/timeline";
import { CONTROLS } from "../engine/cloud";

export function Scene() {
  return (
    <div className="scene-viewport" aria-label="可操作的 LaZy 概念笔记本">
      <div className="scene" id="physics-scene">
        <div className="studio-light" />
        <div className="studio-heading">
          <span>LaZy / STUDIO</span>
          <span>IDEAS, IN THEIR ELEMENT.</span>
        </div>
        <canvas
          id="world-canvas"
          className="world-canvas"
          width="760"
          height="640"
          aria-hidden="true"
        />
        <svg className="filter-definitions" aria-hidden="true">
          <defs>
            <filter
              id="card-directional-blur"
              x="-20%"
              y="-20%"
              width="140%"
              height="160%"
            >
              <feGaussianBlur id="card-blur-node" stdDeviation="0 0" />
            </filter>
          </defs>
        </svg>
        <div id="card-motion" className="card-motion laptop-motion">
          <div id="campus-card" className="laptop">
            <div className="laptop-lid">
              <span className="webcam">
                <i />
              </span>
              <div className="laptop-display">
                <canvas
                  id="workspace-canvas"
                  width="1000"
                  height="564"
                  role="img"
                  aria-label="从高亮代码逐行输入到提交部署、扩缩容、故障自愈与回滚的云原生工作区"
                />
                <div
                  className="screen-controls"
                  role="group"
                  aria-label="笔记本工作台"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      className="screen-hit pod-hit"
                      data-pod-index={i}
                      aria-label={`查看实例 ${String(i + 1).padStart(2, "0")}`}
                      onClick={() => performAction("inspect", i)}
                    >
                      <span className="sr-only">实例 {i + 1}</span>
                    </button>
                  ))}
                  {CONTROLS.map((control, i) => (
                    <button
                      key={control.action}
                      id={i === 2 ? "magnetic-button" : undefined}
                      className="screen-hit concept-control"
                      data-cloud-action={control.action}
                      data-control-index={i}
                      style={{
                        left: `${control.x / 10}%`,
                        top: `${control.y / 5.64}%`,
                        width: `${control.w / 10}%`,
                        height: `${control.h / 5.64}%`,
                      }}
                      aria-label={`云原生：${control.label}`}
                      onClick={() => performAction(control.action)}
                    >
                      <span className="sr-only">{control.label}</span>
                    </button>
                  ))}
                </div>
                <div className="screen-glass" />
              </div>
            </div>
            <div className="laptop-hinge" />
            <KeyboardDeck />
          </div>
        </div>
        <div className="studio-caption">
          <Mark />
          <div>
            <strong>一个提交，持续向前。</strong>
            <span>从一行代码开始，试试提交与部署。</span>
          </div>
          <button
            className="replay-demo"
            onClick={resetDemo}
            aria-label="重新播放电脑演示"
          >
            重新演示 ↻
          </button>
        </div>
        <p id="workspace-status" className="sr-only" aria-live="polite" />
      </div>
    </div>
  );
}
