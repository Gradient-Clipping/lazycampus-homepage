import { Arrow, Mark, SmallIcon, TechIcon } from "./Icons";

function FlowConnector() {
  return (
    <svg className="pipeline-connector" aria-hidden="true">
      <path
        className="pipeline-line"
        d="M4 26H90m-7-5 7 5-7 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        className="pipeline-packet"
        cx="4"
        cy="26"
        r="3"
        fill="#ec5936"
        opacity="0"
      />
    </svg>
  );
}

export function CloudNative() {
  return (
    <section id="capabilities" className="editorial-section native-section">
      <div className="chapter-line">
        <span>
          <i /> BUILT CLOUD NATIVE
        </span>
        <span>01 / 从代码，到持续运行</span>
      </div>
      <div className="native-intro">
        <div className="native-type" aria-hidden="true">
          <span>
            CLOUD
            <Mark />
          </span>
          <span>NATIVE.</span>
          <small>DESIGNED FOR CHANGE. BUILT TO KEEP GOING.</small>
        </div>
        <div className="native-copy">
          <span className="editorial-kicker">为变化而生，为创造留白。</span>
          <h2>
            让每次变化，
            <br />
            <em>从容发生。</em>
          </h2>
          <p>
            好的云原生，让复杂有序地发生在背后。从代码提交到服务运行，把交付、扩展与恢复交给系统，让团队把时间留给产品本身。
          </p>
          <a className="editorial-link" href="#approach">
            看见轻盈背后的工程 <Arrow diagonal />
          </a>
        </div>
      </div>
      <div className="delivery-layout" id="gitops">
        <div className="delivery-margin">
          <span className="drawing-number">01—03</span>
          <h3>
            一次提交，
            <br />
            持续抵达。
          </h3>
          <span className="drawing-note">
            THE PATH
            <br />
            FROM IDEA TO LIVE.
          </span>
        </div>
        <div className="delivery-preview">
          <div className="delivery-heading">
            <span>
              <i /> GitOps / 持续交付
            </span>
            <span>EVERY CHANGE HAS A PATH</span>
          </div>
          <div className="pipeline-track">
            <div>
              <span className="pipeline-node">
                <TechIcon kind="git" />
              </span>
              <strong>代码中的意图</strong>
              <small>01 / COMMIT</small>
            </div>
            <FlowConnector />
            <div>
              <span className="pipeline-node">
                <TechIcon kind="flow" />
              </span>
              <strong>可重复的交付</strong>
              <small>02 / BUILD & SYNC</small>
            </div>
            <FlowConnector />
            <div>
              <span className="pipeline-node final-node">
                <TechIcon kind="cluster" />
              </span>
              <strong>持续运行的服务</strong>
              <small>03 / RECONCILE</small>
            </div>
          </div>
          <div className="delivery-state">
            <div className="code-line">
              <span className="code-return">↳</span>
              <span>desired state</span>
              <b>=</b>
              <span>actual state</span>
              <SmallIcon kind="check" />
            </div>
            <span>让系统，持续接近期望。</span>
          </div>
        </div>
      </div>
      <div className="native-footnote">
        <h3>
          让交付，自然而然<span>。</span>
        </h3>
        <p>
          构建镜像、同步配置、协调集群。把每一步纳入代码，让变更有迹可循，也让下一次迭代轻装出发。
        </p>
      </div>
      <div className="native-standards">
        <span>
          基于开放标准
          <br />
          <strong>让能力彼此连接</strong>
        </span>
        <span className="tech-name">
          <TechIcon kind="cluster" /> Kubernetes
        </span>
        <span className="tech-name">
          <TechIcon kind="git" /> GitOps
        </span>
        <span className="tech-name">
          <TechIcon kind="flow" /> Flux
        </span>
        <span className="tech-name">
          <TechIcon kind="shield" /> OpenID Connect
        </span>
      </div>
    </section>
  );
}
