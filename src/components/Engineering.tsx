import { Arrow, TechIcon } from "./Icons";

const principles = [
  {
    number: "01",
    kind: "git" as const,
    title: "每次改变，都有来路。",
    text: "用 Git 记录意图，用声明描述期望。构建、交付与回滚围绕同一份代码展开，让变化清晰可见。",
    label: "DECLARATIVE BY DEFAULT",
  },
  {
    number: "02",
    kind: "cluster" as const,
    title: "各自独立，一起生长。",
    text: "以容器封装服务，以 Kubernetes 编排运行。把产品与运行环境解耦，让新想法拥有一致的起点。",
    label: "OPEN BY DESIGN",
  },
  {
    number: "03",
    kind: "shield" as const,
    title: "长期运行，从第一天算起。",
    text: "把统一身份、最小权限、审计与备份放进日常工程。关心交付的那一刻，也关心之后的每一天。",
    label: "OPERATED WITH CARE",
  },
];

export function Engineering() {
  return (
    <section id="approach" className="engineering-section">
      <div className="editorial-section">
        <div className="chapter-line">
          <span>
            <i /> THE WAY WE BUILD
          </span>
          <span>02 / 轻松背后，是认真</span>
        </div>
        <div className="engineering-heading">
          <h2>
            轻盈体验的
            <br />
            <span>另一面。</span>
          </h2>
          <div>
            <span className="editorial-kicker">
              THE QUIET WORK BEHIND IT ALL.
            </span>
            <p>
              用户看见的是顺畅。
              <br />
              我们关心的，是让这份顺畅持续发生。
            </p>
            <a href="#platform" className="editorial-link">
              走进技术底座 <Arrow diagonal />
            </a>
          </div>
        </div>
        <figure className="platform-blueprint" id="platform">
          <figcaption className="platform-intro">
            <div>
              <span className="technical-label">
                LaZy / THE SHARED FOUNDATION
              </span>
              <h3>
                一套底座，<span>各自生长。</span>
              </h3>
            </div>
            <p>
              把共性的复杂留在平台，
              <br />
              把独特的价值留给产品。
            </p>
          </figcaption>
          <ol className="platform-stack" aria-label="技术底座的三个层级">
            <li className="platform-row">
              <div className="stratum-label">
                <span>01</span>
                <div>
                  <h4>产品应用</h4>
                  <small>CREATE</small>
                </div>
              </div>
              <div className="stratum-content application-cells">
                <div className="platform-item">
                  <strong>Web 应用</strong>
                  <span>面向用户的体验</span>
                  <Arrow diagonal />
                </div>
                <div className="platform-item">
                  <strong>API 服务</strong>
                  <span>连接数据与业务</span>
                  <Arrow diagonal />
                </div>
                <div className="platform-item">
                  <strong>新的想法</strong>
                  <span>预留更多可能</span>
                  <Arrow diagonal />
                </div>
              </div>
              <div className="platform-bus" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </li>
            <li className="platform-row">
              <div className="stratum-label">
                <span>02</span>
                <div>
                  <h4>平台能力</h4>
                  <small>CONNECT</small>
                </div>
              </div>
              <div className="stratum-content capability-cells">
                <div className="platform-item">
                  <TechIcon kind="flow" />
                  <strong>持续交付</strong>
                  <span className="platform-function">
                    <span>GitOps</span>
                    <span>自动同步</span>
                  </span>
                </div>
                <div className="platform-item">
                  <TechIcon kind="shield" />
                  <strong>统一身份</strong>
                  <span className="platform-function">
                    <span>OIDC</span>
                    <span>角色权限</span>
                  </span>
                </div>
                <div className="platform-item">
                  <TechIcon kind="cloud" />
                  <strong>平台治理</strong>
                  <span className="platform-function">
                    <span>审计与备份</span>
                    <span>日常维护</span>
                  </span>
                </div>
              </div>
              <div className="platform-bus bus-merge" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </li>
            <li className="platform-row">
              <div className="stratum-label">
                <span>03</span>
                <div>
                  <h4>运行环境</h4>
                  <small>RUN</small>
                </div>
              </div>
              <div className="platform-runtime">
                <div className="runtime-brand">
                  <TechIcon kind="cluster" />
                  <div>
                    <strong>Kubernetes</strong>
                    <span>承载每一种可能的共同底座</span>
                  </div>
                </div>
                <div className="runtime-detail">
                  <span>容器编排</span>
                  <span>一致的运行环境</span>
                </div>
                <span className="runtime-label">
                  <i /> BUILT TO KEEP GOING.
                </span>
              </div>
            </li>
          </ol>
          <div className="platform-footnote">
            <span>共用能力，独立创造。</span>
            <span>应用之下，始终有序。</span>
          </div>
        </figure>
        <div className="engineering-principles">
          {principles.map((principle) => (
            <article key={principle.number}>
              <div className="principle-top">
                <span>{principle.number}</span>
                <TechIcon kind={principle.kind} />
              </div>
              <h3>{principle.title}</h3>
              <p>{principle.text}</p>
              <span className="technical-label">{principle.label}</span>
            </article>
          ))}
        </div>
        <div className="engineering-signoff">
          <span>复杂被妥善安放，创造才能自由发生。</span>
          <span>
            ENGINEERED TO FEEL EFFORTLESS. <Arrow />
          </span>
        </div>
      </div>
    </section>
  );
}
