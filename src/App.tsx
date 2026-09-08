import { useLayoutEffect } from "react";
import { Scene } from "./components/Scene";
import { CloudNative } from "./components/CloudNative";
import { Engineering } from "./components/Engineering";
import { CaseStudies } from "./components/CaseStudies";
import { Philosophy, Contact } from "./components/Philosophy";
import { Playback } from "./components/Playback";
import { Arrow, Mark } from "./components/Icons";
import { site } from "./config";
import { mountTimeline, type Ready } from "./engine/mount";

const hud = new URLSearchParams(location.search).has("hud");

export function App({ ready }: { ready: Ready }) {
  useLayoutEffect(() => mountTimeline(ready), [ready]);
  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <header className="site-header">
        <a href="#" className="brand" aria-label="LaZy Campus 首页">
          <Mark />
          <span>LaZy Campus</span>
        </a>
        <nav className="desktop-nav" aria-label="主导航">
          <a href="#capabilities">云原生能力</a>
          <a href="#products">产品实践</a>
          <a href="#about">关于我们</a>
        </nav>
        <a href="#contact" className="header-cta">
          一起创造 <Arrow diagonal />
        </a>
        <details className="mobile-nav">
          <summary aria-label="展开导航">
            <span />
            <span />
          </summary>
          <nav aria-label="移动导航">
            <a href="#capabilities">云原生能力</a>
            <a href="#products">产品实践</a>
            <a href="#about">关于我们</a>
            <a href="#contact">一起创造</a>
          </nav>
        </details>
      </header>
      <main id="main">
        <section className="hero" id="hero">
          <div className="hero-main">
            <div className="hero-copy">
              <div className="hero-eyebrow" data-intro>
                <span className="status-dot" /> CLOUD NATIVE. HUMAN FIRST.
              </div>
              <h1 data-intro>
                让云原生，
                <br />
                <span>轻松发生</span>
                <span className="hero-period">。</span>
              </h1>
              <p className="hero-description" data-intro>
                把复杂留给技术，把可能还给创造。
                <br />
                我们以云原生构建数字产品，
                <br className="mobile-only" />
                连接每一个想法与真实日常。
              </p>
              <div className="hero-actions" data-intro>
                <a className="button-primary" href="#capabilities">
                  探索云原生能力 <Arrow diagonal />
                </a>
                <a className="hero-secondary" href="#products">
                  看看我们的实践 <Arrow />
                </a>
              </div>
              <div className="hero-small-note" data-intro>
                <span className="tiny-cross">✳</span>
                <span>少一点摩擦，多一点可能。</span>
              </div>
            </div>
            <Scene />
          </div>
          <div className="hero-bottom">
            <div className="hero-bottom-left">
              <span className="scroll-symbol">↓</span>
              <span>向下探索</span>
              <span className="hero-bottom-line" />
              <span className="hero-bottom-english">
                ENGINEERED TO FEEL EFFORTLESS.
              </span>
            </div>
            <Playback />
          </div>
        </section>
        <div className="brand-statement">
          <span>复杂的系统，简单的体验。</span>
          <Mark />
          <span>CLOUD NATIVE, LESS FRICTION.</span>
          <Mark />
          <span>让好的想法，轻松生长。</span>
          <Mark />
        </div>
        <CloudNative />
        <Engineering />
        <CaseStudies />
        <Philosophy />
        <Contact />
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <a href="#" className="brand">
            <Mark />
            <span>LaZy Campus</span>
          </a>
          <p>让云原生，轻松发生。</p>
          <a href="#hero">回到顶部 ↑</a>
        </div>
        <div className="footer-bottom">
          <span>
            © {site.copyrightYear} {site.legalName || site.brand}
          </span>
          <span>
            {site.legalName
              ? `${site.brand} · ${site.legalName} 旗下品牌`
              : "LaZy Campus · 品牌展示"}
          </span>
          <a href={site.contactUrl} target="_blank" rel="noreferrer">
            GitHub <Arrow diagonal />
          </a>
          <span>
            BUILT WITH CARE <span className="orange">✳</span>
          </span>
        </div>
      </footer>
      {hud ? <Playback hud /> : null}
    </>
  );
}
