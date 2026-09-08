# LaZy Campus · 云原生品牌主页

`lazycampus.com` 与 `www.lazycampus.com` 的主页源码，采用 React + TypeScript + CSS3 + Canvas 2D + SVG。源码仓库为 [Gradient-Clipping/lazycampus-homepage](https://github.com/Gradient-Clipping/lazycampus-homepage)。

LaZy Campus 是对外品牌；法定主体和商务邮箱在 `src/config.ts` 配置。联系邮箱为 `support@lazycampus.com`。当前页面强调云原生、GitOps、平台工程、统一身份，以及 Easy Campus 和 Smart Shop 的产品实践。

## 生产发布

`main` 提交通过物理与交互状态测试、生产容器验证和 Playwright 浏览器检查后，GitHub Actions 将镜像发布到 `ccr.ccs.tencentyun.com/lazycampus/lazycampus-homepage`。版本标签为 `1.0.<github.run_number>`，同时保留 `sha-<git_commit_sha>` 追溯源码。Pull Request 只验证；仅 `main` 可以发布。

Flux 自动写回 [server-gitops](https://github.com/Gradient-Clipping/server-gitops) 的 `clusters/easy-platform/apps/lazycampus-site/` 并滚动发布。生产 Namespace、Deployment、Service 和 Ingress 继续使用 `lazycampus-site` 名称；域名仍走现有 EdgeOne → Nginx → Traefik 链路。

旧 [lazycampus-site](https://github.com/Gradient-Clipping/lazycampus-site) 仓库保留历史页面，其工作流只验证，不再发布镜像。主页的新镜像名称使两个仓库的发布来源独立。

新仓库需要配置 Repository Secrets `TCR_USERNAME` 和 `TCR_PASSWORD`；实际值只保存在凭据存储中。健康检查为 `/healthz`，容器监听 8080，使用非 root 用户，支持只读根文件系统与可写 `/tmp`。HTML 和未指纹化资源按请求重新验证缓存；Vite 指纹资源长期缓存，JS / CSS 启用 gzip。

```sh
docker build --tag lazycampus-homepage:local .
docker run --rm --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m \
  --cap-drop ALL --security-opt no-new-privileges \
  --memory 64m --cpus 0.1 -p 127.0.0.1:8080:8080 lazycampus-homepage:local
```

回滚通过 GitOps 提交执行：先在 `image-automation.yaml` 暂停该应用的 `ImageUpdateAutomation`，再在 `deployment.yaml` 固定已验证镜像；确认恢复后再调整镜像策略并恢复自动更新。不要直接修改集群 Deployment。

## 运行与预览

Node.js 22.12+，无 Python 依赖。

```sh
npm ci
npm run dev
```

- `http://127.0.0.1:4173/`：默认连续播放轻量动效。
- `http://127.0.0.1:4173/?play`：同样使用实时预览。
- `http://127.0.0.1:4173/?t=8.5&hud`：冻结在指定时间，显示调试面板。
- `http://127.0.0.1:4173/?paused`：静态浏览，仍可点击播放。
- `http://127.0.0.1:4173/?render&t=3.2`：确定性导出模式。

`t` 优先于自动播放。系统启用“减少动态效果”时，默认显示稳定的完整页面。

```sh
npm run build
npm run preview
```

开发和默认生产预览都使用 4173，不能同时占用。需要同时运行时使用 `npm run preview -- --port 4174`。本次验收使用 4174 的生产构建。

## 版式与内容（v8）

首屏保留交互笔记本。下半页按「云原生 → 工程底座 → 产品实践 → 品牌理念 → 联系」组织：

- `CloudNative.tsx`：大字号 CLOUD NATIVE 主视觉、放大的 GitOps 交付路径与开放标准。
- `Engineering.tsx`：三层对齐的深色架构图，说明应用、共享平台能力与 Kubernetes 运行环境的关系，并展开交付、开放标准与长期治理。
- `CaseStudies.tsx`：左右错落的大幅概念图、产品名称和功能说明；Easy Campus 位于 Smart Shop 上方。
- `Philosophy.tsx`：透明莫比乌斯环与品牌文字融入同一版面，以品牌橙色联系区收尾。
- `editorial.css`：独立负责上述版式与响应式样式；不添加新动画时钟、渲染循环或动效依赖。

## 动效与性能

首屏为 CSS / SVG 金属笔记本。Canvas 先显示无侧栏的 VS Code 简化界面，逐字输入有语法高亮的 TypeScript 服务代码；提交后完成输入、构建镜像，并自然过渡到运行状态。运行界面只保留版本、实例、就绪状态与四个操作：部署更新、3 ↔ 5 副本扩缩容、模拟故障并自动补齐、回滚上一版本。点击实例可查看状态，查看期间正在进行的发布会继续完成。所有行为均为本地概念演示。

屏幕为 668 × 376.752 CSS px，边框左右各约 5 px；屏幕轻微向外倾斜，键盘采用低视角的单一透视平面。手机端直接操作屏幕中的按钮，已删除电脑下方重复的快捷操作栏。笔记本、按钮和实例只作轻微弹性位移。交付流程图采用 SVG 原生 CSS 像素坐标，箭头和单向传递指示共享中线；圆点固定为 6 px 正圆，不随容器长宽比拉伸。

About 区的 Möbius 环带围绕自身中线缓慢卷动，并叠加整体逆时针旋转。中心线在内禀卷动中保持不动，每个截面绕其切线旋转，曲面法线和光照同步变化。卷动周期 72 秒，整体旋转周期 96 秒。Canvas 透明，没有独立底板，柔和投影直接融入页面。减少动态效果时曲面静止。页面内部锚点平滑滚动；减少动态效果和导出模式直接定位。

性能处理：

- 弹簧解析状态转移矩阵初始化编译，避免每个质点反复计算三角函数。
- 主场景使用 240 Hz Float32Array：默认 32 秒缓存为 614,480 字节；每次有效操作按剩余步骤长度预计算接续片段。软环与绳索原语保留但不加载到首页。
- 屏幕的静态文字与底色缓存到 OffscreenCanvas，逐帧绘制实例、操作状态与指针。连续曲面预建共享顶点网格，Canvas 2D 使用扫描线与深度缓冲绘制平滑光照，每帧仅上传一次像素，避免大量渐变路径造成的绘制开销。
- Canvas 按实际显示尺寸 × DPR 栅格化，避免移动端重复绘制桌面尺寸的像素。
- Easy Campus 图片一次解码；Smart Shop 静态概念图只绘制一次；可选序列只在素材帧变化时重绘。
- 时间轴直接同步更新 DOM / SVG / Canvas；React 只在播放状态变化时更新，不逐帧重渲染组件。

## 唯一时间入口

```js
await window.__ready;
window.__seek(7.83127);
// 返回前已完成 DOM、Canvas、SVG 和时间控件更新，可立即截图。
```

`__seek(t)` 接受有限浮点秒数，负数取 0，NaN / Infinity 抛错。默认电脑演示以 `t % 32` 查询物理缓存，环带卷动和整体旋转分别使用 72 / 96 秒周期，初次入场只发生一次。未交互的完整页面共同周期为 288 秒。外部寻道立即停止全部实时预览。

`__ready`、`__timeline`、`__frame` 仅提供就绪和诊断信息，不提供额外时间输入。

在固定布局、DPR、素材、物理参数、交互记录和浏览器环境下，动画画面是时间的纯函数。唯一引导坐标使用闭合 C1 三次 Hermite 样条；仿真外力来自它的位置和解析速度。屏幕内保留圆角、沿 y=x 轴对称、指向左上的凹四边形指针；凹角骨架内角为 240°。指针依次经历行进、减速、停留、点击和观察，笔记本及按钮只作克制的受力响应。环状软体和 Verlet 绳索继续作为可选组件原语保留在工程内。实时预览的可取消 rAF 适配器仅计算 `startTime + (timestamp - epoch) / 1000` 并调用 `__seek`，没有 `t += dt`、CSS keyframes、异步缓动或逐帧物理积分。

手动操作记录 `{time, action, target?}`，保留当前指针位置、解析速度和弹簧状态。指针直接观察已完成点击的结果，再接续下一个有效步骤，不会重新点击用户刚操作的按钮，也没有固定的左上角停靠点。`action` 为 `deploy`、`scale`、`fault`、`rollback` 或 `inspect`；实例索引为 0–4。查看实例不打断运行中的发布或修复；再次介入会替换未执行的后续步骤。整个接续结束后指针停留，结果保持，环带继续转动。“重新演示”清空记录并恢复默认路线。v7 接续语义见架构文档，旧 `{time, view}` 格式不支持。

交互记录是可序列化的输入素材：同一条记录对应确定的 `f(t)`；不同用户选择可以生成不同记录，不能把这称为无条件独立于输入的纯时间函数。`?hud` 中“导出交互记录”下载 JSON，`window.__timeline.recording` 提供只读记录。可在页面初始化前设置 `window.__initialRecording` 重放。普通锚点、菜单、悬停与键盘焦点由浏览器处理。具体模型见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 图标与产品概念素材

用户提供的三个根目录 SVG 已重命名并移动：

| 原文件                          | 当前文件                      |
| ------------------------------- | ----------------------------- |
| `Kubernetes图标_1788800088.svg` | `public/icons/kubernetes.svg` |
| `Git分支_1788800174.svg`        | `public/icons/git-branch.svg` |
| `flux-cd.svg`                   | `public/icons/flux.svg`       |

这些原始 SVG 用于技术栈、GitOps 流程和工程能力。原文件内容保持不变；深色区域使用浅色图标底座，保留内部线条与原始颜色，不再使用会冲淡细节的亮度滤镜。

下载目录中的 `Visual Studio Code 图标_1788840845.svg` 已重命名并移动到 `public/icons/visual-studio-code.svg`，用于笔记本编辑器标题栏。保留原始 SVG 的颜色、渐变和阴影，初始化时一次性生成 Canvas 缓存，避免每帧解码。

Easy Campus 使用内置 **image_gen** 生成的概念图，放在 Smart Shop 上方。已阅读 `ystemsrx/easy-campus` 的首页 WXML / TypeScript、日程页、主题变量与页面配置，参考提交 `1fad03a9163b99e994468b4af194add1ab3297c5`。概念图使用真实功能结构与配色，界面数据为虚构示例。

- 图片：`public/media/easy-campus-concept.png`
- 代码依据与完整提示词：`public/media/easy-campus-concept.prompt.md`

Smart Shop 使用内置 **image_gen** 生成的概念图，明确标注为概念视觉。没有使用实际网站截图。

- 图片：`public/media/smart-shop-concept.png`
- 完整生成提示词与出处：`public/media/smart-shop-concept.prompt.md`
- 默认配置：`public/media/product/manifest.json`，`enabled:false`

此前截图与采集脚本已移出公开资源目录，保留在被 Git 忽略的 `renders/archive-v1/`。页面和生产构建不会加载它们。

Easy Campus 链接为 `https://github.com/ystemsrx/easy-campus`。

## 无损导出

启动生产预览后运行。需要 FFmpeg 在 PATH 中，或设置 `FFMPEG_PATH`。浏览器优先使用 Playwright 已安装的 Chromium，其次使用系统 Chrome；也可配置 `PLAYWRIGHT_CHANNEL` 或 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`。

```sh
# 单帧、整页
npm run render -- --time 8.5 --out renders/still
npm run render -- --time 3.2 --full-page --dpr 1 --out renders/full-page

# 32 秒电脑演示，60 fps，DPR 2，无损 PNG + FFV1
npm run render -- --fps 60 --dpr 2 --duration 32 --out renders/master

# 重放手动操作，仍由固定帧时间截屏
npm run render -- --recording lazycampus-interactions.json --start 2 --duration 6 --out renders/interactive

# 定位到产品展示区，或跨越循环接缝
npm run render -- --section products --duration 3 --out renders/product
npm run render -- --start 31 --duration 3 --out renders/loop-seam

# 莫比乌斯环两个运动的完整共同周期
npm run render -- --section about --duration 288 --out renders/mobius

# 使用第二个预览端口
npm run render -- --url http://127.0.0.1:4174 --start 7 --duration 3 --out renders/sample
```

默认视口 1440 × 960 CSS px、DPR 2，对应 2880 × 1920 PNG。采样严格使用 `start + frameIndex / fps`，区间左闭右开。每次使用新的输出目录，脚本拒绝混合旧帧。

输出包含逐帧 PNG、`master-ffv1.mkv`、带每帧 SHA-256 与环境信息的 `manifest.json`。FFV1 使用 level 3 / BGR0；编码后将视频和 PNG 都解码为 RGB24，逐帧比较 framemd5，一致后才报告无损成功。也可用 `--encode h264rgb` 输出无损 RGB H.264，或用 `--encode none` 只保存 PNG。

导出固定 sRGB、字体与软件光栅化；实时预览保留正常浏览器加速。这里的无损指页面像素到输出文件不再引入损失，不代表跨操作系统、浏览器和字体环境的像素天然一致。

## 可选的录屏帧映射接口

默认始终使用生成的概念图。若以后提供真实产品录屏，可启用原有确定性序列接口：

```sh
npm run extract -- --input "path/to/recording.mp4" --out public/media/my-recording --fps 30 --duration 6 --width 720 --format png --label "产品演示"
```

把生成的 manifest 内容复制到 `public/media/product/manifest.json`。支持 PNG / JPEG、`startTime`、`fps`、`startNumber` 与六位 `{frame}` 模板。图像在 `__ready` 前解码，选帧为 `floor((t-startTime)*fps)`，末帧保持。限制为 900 帧 / 512 MiB 解码预算，并发解码数 6。

## 验证

```sh
npm test
npm run verify
node scripts/performance.mjs
```

浏览器验证默认使用 4173，可通过 `VERIFY_URL` 指定地址。性能脚本默认测量 4174 的生产构建。本版功能检查与截图在 `renders/v8.1/verification/`，此前性能采样在 `renders/v8/performance.json`，最新验收记录见 [VALIDATION.md](VALIDATION.md)。

主要实现：`src/engine/math.ts`、`constants.ts`、`code.ts`、`cloud.ts`、`experience.ts`、`pointer.ts`、`workspace.ts`、`sculpture.ts`、`sequence.ts`、`timeline.ts`、`mount.ts`。`draw.ts` 保留软环与绳索组件的可选渲染实现，当前首页不加载它。导出工具为 `scripts/render.mjs`；素材生成提示词随 PNG 一同保留。
