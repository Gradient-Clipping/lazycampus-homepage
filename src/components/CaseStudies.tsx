import { Arrow, TechIcon } from "./Icons";
import { site } from "../config";
import campusConcept from "../assets/easy-campus-concept.webp";

export function CaseStudies() {
  return (
    <section className="editorial-section case-studies" id="products">
      <div className="chapter-line">
        <span>
          <i /> FROM CLOUD TO LIFE
        </span>
        <span>03 / 技术的落点，是日常</span>
      </div>
      <div className="case-section-heading">
        <h2>
          云端的能力，
          <br />
          <em>日常的答案。</em>
        </h2>
        <p>
          从校园的一天，到生活中的一次选择。
          <br />
          技术的意义，落在每一个具体的人、
          <br />
          每一件被轻松完成的小事里。
        </p>
      </div>
      <article className="product-story easy-campus-story">
        <div className="case-heading">
          <span className="case-number">01</span>
          <div>
            <span className="technical-label">CAMPUS, CONNECTED.</span>
            <h3>Easy Campus</h3>
          </div>
          <a
            className="case-open"
            href={site.products.easy.href}
            target="_blank"
            rel="noreferrer"
            aria-label="了解 Easy Campus，打开 GitHub 项目"
          >
            <Arrow diagonal />
          </a>
        </div>
        <div className="case-body">
          <figure className="case-art campus-concept">
            <img
              id="easy-campus-concept"
              src={campusConcept}
              loading={new URLSearchParams(location.search).has("render") ? "eager" : "lazy"}
              decoding="async"
              width="1536"
              height="1024"
              alt="Easy Campus 小程序概念图：暖色首页展示今日课程、成绩、电费，旁侧手机展示每周课表"
            />
            <figcaption>
              <span>EASY CAMPUS / 微信小程序</span>
              <span>基于真实功能的概念视觉</span>
            </figcaption>
          </figure>
          <div className="case-copy">
            <span className="case-symbol">
              <TechIcon kind="campus" />
            </span>
            <h4>
              校园里的事，
              <br />
              轻松安排。
            </h4>
            <p>
              从今天的第一节课，到下一场考试。把课表、成绩与校园服务收在一处，让时间留给更值得的大学生活。
            </p>
            <dl className="case-details">
              <div>
                <dt>连接</dt>
                <dd>课表 · 成绩 · 考试</dd>
              </div>
              <div>
                <dt>发现</dt>
                <dd>空教室 · 校园服务</dd>
              </div>
              <div>
                <dt>照顾</dt>
                <dd>寝室电费查询</dd>
              </div>
            </dl>
            <a
              className="editorial-link"
              href={site.products.easy.href}
              target="_blank"
              rel="noreferrer"
            >
              走进 Easy Campus <Arrow diagonal />
            </a>
          </div>
        </div>
      </article>
      <article className="product-story smart-shop-story">
        <div className="case-heading">
          <span className="case-number">02</span>
          <div>
            <span className="technical-label">GOOD THINGS, WITHIN REACH.</span>
            <h3>Smart Shop</h3>
          </div>
          <a
            className="case-open"
            href={site.products.shop.href}
            target="_blank"
            rel="noreferrer"
            aria-label="体验 Smart Shop 智慧零售"
          >
            <Arrow diagonal />
          </a>
        </div>
        <div className="case-body">
          <div className="case-copy">
            <span className="case-symbol">
              <TechIcon kind="bag" />
            </span>
            <h4>
              日常所需，
              <br />
              自然抵达。
            </h4>
            <p>
              一份喜欢的零食，一次轻松的选择。从浏览商品到完成订单，让技术退到幕后，让每一份日常所需，都有简单的体验。
            </p>
            <dl className="case-details">
              <div>
                <dt>浏览</dt>
                <dd>清晰的商品呈现</dd>
              </div>
              <div>
                <dt>选择</dt>
                <dd>顺畅的下单体验</dd>
              </div>
              <div>
                <dt>连接</dt>
                <dd>零售服务与日常生活</dd>
              </div>
            </dl>
            <a
              className="editorial-link"
              href={site.products.shop.href}
              target="_blank"
              rel="noreferrer"
            >
              体验 LaZy 零食 <Arrow diagonal />
            </a>
          </div>
          <figure className="case-art shop-concept">
            <div className="product-browser">
              <canvas
                id="product-canvas"
                width="1000"
                height="667"
                role="img"
                aria-label="Smart Shop 概念视觉：简洁的零食购物界面，展示桌面与移动端体验"
              />
              <p className="sequence-error" id="sequence-error" hidden />
            </div>
            <figcaption>
              <span>SMART SHOP / 智慧零售</span>
              <span id="sequence-label">Smart Shop · 概念视觉</span>
            </figcaption>
          </figure>
        </div>
      </article>
      <div className="case-closing">
        <span>
          从真实需求出发，<strong>回到真实生活。</strong>
        </span>
        <a className="editorial-link" href="#about">
          认识 LaZy Campus <Arrow diagonal />
        </a>
      </div>
    </section>
  );
}
