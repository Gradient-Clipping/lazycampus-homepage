import { AboutArt } from "./AboutArt";
import { Arrow, Mark } from "./Icons";
import { site } from "../config";

export function Philosophy() {
  return (
    <section id="about" className="philosophy-section">
      <div className="editorial-section">
        <div className="chapter-line">
          <span>
            <i /> A LITTLE ABOUT US
          </span>
          <span>04 / 在轻松与认真之间</span>
        </div>
        <div className="philosophy-heading">
          <h2>
            少一点摩擦。
            <br />
            <em>多一点可能。</em>
          </h2>
          <span className="philosophy-note">
            一条连续的曲面。
            <br />
            一种持续构建的态度。
          </span>
        </div>
        <div className="philosophy-layout">
          <div className="philosophy-art">
            <span className="continuity-word" aria-hidden="true">
              KEEP
              <br />
              BUILDING.
            </span>
            <AboutArt />
          </div>
          <div className="philosophy-copy">
            <Mark />
            <h3>
              LaZy，留给体验。
              <br />
              认真，留给每个细节。
            </h3>
            <p>
              我们从校园与日常出发，用产品发现真实需求，用工程把想法变成可以持续运行的服务。
            </p>
            <p>
              LaZy Campus
              是我们的对外品牌。我们期待的轻松，来自对复杂的理解、对细节的耐心，以及一次又一次认真完成的迭代。
            </p>
            <div className="philosophy-principles">
              <div>
                <span>01 / HUMAN</span>
                <strong>先看见人，再开始构建。</strong>
              </div>
              <div>
                <span>02 / OPEN</span>
                <strong>保持开放，让想法相遇。</strong>
              </div>
              <div>
                <span>03 / CONTINUOUS</span>
                <strong>持续改进，让简单发生。</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const contact = site.email ? `mailto:${site.email}` : site.contactUrl;
  return (
    <section id="contact" className="next-chapter">
      <div className="editorial-section">
        <div className="chapter-line">
          <span>LET'S BUILD SOMETHING GOOD.</span>
          <span>05 / 下一个可能</span>
        </div>
        <div className="contact-composition">
          <div>
            <h2>
              从下一行代码，
              <br />
              到下一个<em>可能。</em>
            </h2>
            <p>云原生平台、数字产品，或者一个值得实现的想法。</p>
          </div>
          <a
            className="contact-arrow"
            href={contact}
            aria-label="邮件联系 support@lazycampus.com"
          >
            <Arrow diagonal />
            <span>聊聊你的想法</span>
          </a>
        </div>
        <div className="contact-address">
          <span>从一次对话开始</span>
          <a href={contact}>
            {site.email}
            <Arrow diagonal />
          </a>
        </div>
        <div className="contact-signature" aria-hidden="true">
          <span>LaZy Campus</span>
          <Mark />
        </div>
      </div>
    </section>
  );
}
