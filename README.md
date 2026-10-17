# 知图 Knowledge Atlas

一座面向普通知识爱好者与亲子家庭的数字知识图书馆。提供跟随系统的浅色/深色界面、知识领域目录、跨专题人物与事件检索、三国人物关系网、中国历史朝代关系图，以及花园和太阳系基础图谱。

[在线访问](https://zhitu.weiyi.indevs.in) · [GitHub 私有仓库](https://github.com/zaz52/knowledge-atlas)

## 开发记录

### 2026-10-18 06:23（Asia/Shanghai）· Cloudflare正式部署与GitHub首次发布

- 需求：使用weiyi.indevs.in的子域名部署网站，名称由助手确定；部署完成后推送GitHub。
- 部署：Workers Static Assets服务knowledge-atlas，正式地址https://zhitu.weiyi.indevs.in；保留独立专题URL、10个预生成HTML、SPA回退与HTTPS分享。Cloudflare版本a116a5ba-37ac-41e2-a523-f3cf5ea5ab11。
- 配置：新增wrangler.jsonc和公开.env.production，增加固定Wrangler版本的npm run deploy，完善私有环境文件与.wrangler忽略规则。复用工作区已安装的Wrangler 4.150.0完成本次上传；package-lock与业务依赖保持原配置。
- GitHub：已创建zaz52/knowledge-atlas私有仓库；源码、知识JSON、图片与发布配置纳入首次提交。本记录随提交推送；远端main与本地提交的核验结果见outputs/publish-github-verification.json。
- 验证：发布前41项测试、Lint、类型检查与生产构建通过；公网10个路由HTTP200，入口JS/CSS的SHA-256与本地一致；正式站桌面/手机浅深4组完整探索流程、320/768px布局共22项检查通过，浏览器错误0。两专题实际剪贴板复制、浏览器前进后退、直达与刷新通过，均为HTTPS安全上下文。
- 文件：package.json、.gitignore、wrangler.jsonc、.env.production、README.md；新增项目Git元数据。本地发布辅助脚本及证据位于work/publish-*和outputs/publish-*，账号凭据保持在已有本地授权工具中。
- 后续：当前采用手动构建发布；自动部署、按专题分包和真机Safari/安卓复核可后续安排。GitHub为私有仓库，站点公开访问。


### 2026-10-18 06:05（Asia/Shanghai）· 人物与社会背景第二批补充及跨专题同步

- 需求：继续补齐主要人物与社会背景，核对朝代和三国的收录范围，整理清单并解决跨专题资料同步。
- 内容：三国35增至57人物，111节点、369关系、43来源条目、7作品、10背景；朝代61增至136人物，282节点、721关系、168来源条目、33作品、22背景。26个时期/政权各至少3位代表人物；朝代人物总数包含共享的57位三国人物。
- 实现：独立共享导入清单、主数据同步脚本与sharedFrom标记；启动和构建自动同步，测试和数据检查识别资料漂移。时代与生活背景可点击探索，背景关系独立筛选。初次最多8人物、完整人物入口、展开更多人物及多环布局；新节点向四周寻找空位并保留拖动坐标，三国保留时间分行布局。
- 文件：两专题8份JSON；shared/history-imports.json；coverage两份收录文件；sync-history脚本与库；通用类型/模型/画布/详情；校验器及4份测试；package.json、数据README与本记录。
- 验证：41项Node测试、数据校验、TypeScript、Lint通过；完整npm run build成功，最终Vite编译成功并生成10个静态路由HTML。桌面与390px手机浅深4组生产浏览器核心流程通过，320/768px补查覆盖两个专题；控制台错误0。两图原有节点/关系ID保留，花园及太阳系SHA-256不变，10张公共图片校验一致。
- 证据：outputs/content-wave2-交付与验收.md、content-wave2-截图.html、content-wave2-browser.json、content-wave2-data-integrity.json与测试/构建日志。本地4173已更新。
- 边界：代表性选录与背景主题持续扩充，具体候选人物、区域社会史与制度细节见src/data/coverage/README.md；真机Safari/安卓、密集关系与知识数据分包继续复核。本轮本地开发与预览。


### 2026-10-18 05:15:37（Asia/Shanghai）· 东汉末年至西晋统一的三国探索主线

- 需求：三国图谱从东汉末年开始到最后统一，具有前因后果；优先知识网络，人物使用首字。
- 完成：五阶段阅读导航、阶段人物与事件图、事件背景与影响、前事/后续、人物经历和作品。76节点（35人物、27事件、5阶段、5政权/阵营、4作品）、237关系、31来源。原22节点和40关系ID及证据分类保留。
- 实现：通用story/peopleExploration元数据与context引用结构；两个专题复用画布和详情。修复局部初次取景引用隐藏节点、平行边标签重叠、新增节点占用原坐标、隐藏演义后选择状态。三国关闭人物艺术头像显示。
- 涉及：三国四份JSON、通用类型/画布/详情/模型/容器、首页真实预览、样式与主题、数据校验和测试、README与数据说明，共19个项目文件。
- 验证：33项测试、数据校验、Lint、TypeScript、完整生产构建和最终生产编译通过；生成10个路由HTML。生产4组桌面/手机浅深完整流程及320/768px补查通过，浏览器错误0；朝代等6份JSON校验不变、10张公共图片校验一致。
- 证据：outputs/three-history-验收记录.md、three-history-截图.html、浏览器JSON与测试/构建日志。
- 收尾：人物经历按事件年代排序并加入测试，最终生产桌面/手机浅深四组再次核对经历顺序、首字标识和18px正文，见three-history-final-smoke.json。
- 后续：扩充次要人物与社会背景，专业内容审校、密集图取景、数据分包与真机Safari/安卓复核。本轮本地4173。

### 2026-10-18 04:24:45（Asia/Shanghai）· 朝代人物、作品与事迹网络

- 需求：点击朝代显示著名人物图谱，继续查看人物关系、事迹、作品与事件，形成连续探索。
- 完成：元数据配置驱动的朝代局部人物图与返回总览；人物自动展示直接关联、作品节点、独立引用的主要事迹和人生经历；通用组件与JSON分离。朝代专题157节点（26时期/政权、61人物、49事件、21作品）、285关系、87来源。
- 修复：作品/事件排布、长标签、局部标签隐藏、选中透明度，以及切换节点后悬停队列读取旧元素的问题。保持18px阅读正文与手机底部面板。
- 涉及：朝代四份JSON、explorer类型与模型、通用画布/详情/状态组件、graphTheme/graphAppearance、explorer.css、数据校验与测试、数据README和本记录，共17个项目文件。
- 验证：29项Node测试、Lint、TypeScript、完整生产构建通过；最终修复完成Vite生产编译和10个路由页面生成。最终生产桌面/手机浅深4组完整浏览器流程、320/768px补查通过，包含手机双指缩放，错误0；三国及其他原数据6份校验不变，10张公共图片校验一致。
- 证据：outputs/dynasty-people-验收记录.md、dynasty-people-截图.html、浏览器JSON和测试/构建日志。
- 后续：首批人物选录的覆盖与小传继续扩充，密集连线和真机Safari/安卓复核。本轮本地预览4173。

### 2026-10-18 03:43（Asia/Shanghai）· 全站字号与阅读体验调整

- 需求：用户反馈“里面的文字太小了，看着很费劲”。
- 完成：统一字号变量，辅助信息 13–15px、界面正文 17px、阅读正文 18px；同步放大全站首页、目录、搜索、筛选、工具和知识档案的文字及行距。图谱人物名称 24、朝代内名 26、年代 22、关系标签 20 个画布单位，随画布缩放。
- 布局：桌面详情宽度 460px（平板 430px）；手机分类使用两列、目录封面和正文分行排布；事件/阵营节点加大；桌面关系图例改为顶部横向排列。
- 涉及：styles/tokens.css、global.css、library.css、explorer.css；graphTheme.ts、graphAppearance.ts、ExplorerCanvas.tsx、KnowledgeGraph.tsx；README。
- 验证：23 项现有测试、Lint、TypeScript 和 npm run build 通过；最后图例样式完成 Vite 生产构建并生成 10 个路由页面，已更新 4173。桌面/390px/320px、浅深主题共 48 项页面及字号检查通过；最终生产预览在 1440/768/390px 对两专题完成 6 组节点真实点击、检索、展开及重复保护、18px 详情、缩放和适应检查，浏览器错误 0。
- 证据：outputs/readability-browser.json、readability-final-check.json、readability-build.log、readability-final-build.log、readability-tests.log、readability-lint.log 与 readability-字号调整.md。
- 后续：手机验收使用 Chromium 触控仿真，真机 Safari/安卓仍待复核；大范围缩小的图谱可通过放大或搜索定位阅读节点。

### 2026-10-18 03:29（Asia/Shanghai）· 本地预览恢复与收尾确认

- 需求：用户询问“继续做完了吗”，确认改版交付与本地可访问状态。
- 完成：启动 4173 生产预览，使用现有 dist；更新本轮预览验收证据。
- 涉及：README；工作目录新增 reference-v2-preview-smoke.mjs，输出 reference-v2-preview-smoke.json。
- 验证：首页、三国、中国历史朝代三个 URL 返回 HTTP 200；Chromium 实际打开三页，G6 画布均进入 ready，页面标题正常，浏览器错误 0。
- 后续：响应式图片轻量化、密集标签优化与手机真机复核；已有构建与完整回归结果见下条记录。

### 2026-10-18 01:10:51（Asia/Shanghai）· 参考图落实与视觉校正

- 需求：用户反馈“你没有看里面的参考图吗，为什么ui没有给我改”，要求落实资料包中的实际视觉方向。
- 完成：按总览 B、C 重排首页，加入随系统切换的图书馆日景/夜景主视觉、五色分类、两张历史插画封面与独立 G6 探索区；目录同步使用插画索引与真实数量。
- 图谱：六位核心人物艺术肖像、圆形朝代与年代标签、关系图例、肖像知识档案、真实阅读定位导航；打开桌面详情时协调关联取景，抽屉状态下收起静态图例。
- 手机：强化标题底色、搜索输入 16px、分类筛选至少 44px 触控高度；保留底部详情面板及原有触控操作。
- 素材：内置 image_gen 生成 10 项素材；无损 WebP 从约 28.7 MB 降至 19.5 MB，逐张解码像素一致。网页素材位于 public/images/library，原图归档在 work/reference-v2-originals。
- 涉及：新增 visualAssets.ts、library.css 和 10 个 WebP；更新首页、TopicCard、SiteLayout、ExplorerCanvas、KnowledgeExplorer、NodeDetails、tokens/explorer.css 和 README。
- 验证：23 项现有 Node 测试、Lint、类型与生产构建通过；9 组核心浏览器回归、6 组最终双主题/页面检查通过，错误 0；320/390/430/768/1024px、短视口、单指与双指操作检查完成。10 份知识 JSON 校验一致。最终预览 4173 已使用新产物。
- 后续：响应式图片尺寸、密集图标签与 G6 包加载优化；真机 Safari/安卓软键盘复核。
- 证据：outputs/reference-v2-页面对照.html、reference-v2-改造记录.md、reference-v2-素材与提示词.md、回归/主题/数据/图片校验 JSON 与测试/构建日志。

### 2026-10-17 23:32:10（Asia/Shanghai）· 数字图书馆全站 UI 重设计

- 需求：阅读用户提供的 UI 资料包全部文档和图片，重构首页、专题目录、两张图谱、知识档案、检索与筛选，支持系统浅色/深色及手机。
- 参考：完整阅读 6 份 Markdown，逐一查看 14 张参考图片；采用纸色/墨蓝、五领域分类色、图书馆目录版式、真实数据封面与 G6 预览。
- 完成：首页品牌、主标题与知识检索、分类目录、精选馆藏、共读指南；桌面分类索引与手机分类筛选；图谱统一顶部信息、搜索结果、关系浮层与知识档案；桌面默认关闭抽屉，手机保留可收展底部面板。
- 主题：CSS prefers-color-scheme 跟随系统；useSystemTheme 通知 G6 重新应用节点、边与选中样式，保留视口、已展开节点和拖拽坐标；两张主要图谱及花园/太阳系基础图谱同步更新。
- 修复：拱形馆藏区标题裁切、手机品牌换行、专题缩略图与文案交叠、搜索 Esc 原生清空、清除按钮触控尺寸；手机分类与精选专题优先呈现；空检索提交进入目录。
- 文件：新增 domains、systemTheme、LibrarySearch、DomainDirectory、librarySearch、graphAppearance；更新首页、目录、TopicCard、通用图谱及详情/搜索组件、SiteLayout、三份样式、index.html 和 README，共 23 个项目文件。
- 验证：本轮 23 项现有 Node 测试通过；最终 Lint、数据验证、TypeScript、生产构建通过，生成 10 个静态路由 HTML；生产 9 组核心交互回归、6 组双主题/页面检查、2 项检索与导航边界通过，浏览器错误 0。检查 320/390/430/768/1024px、短视口、390px 单指拖动与双向捏合。10 份 JSON 的 SHA-256 与原基线一致。
- 交付：outputs/library-ui-截图索引.html、library-ui-改造与验收.md、library-ui-theme-checks.json、library-regression-browser-production.json、library-ui-navigation.json、library-ui-data-integrity.json 与构建/Lint 日志。当前运行本地开发 5173 与生产预览 4173。
- 后续：iOS Safari、安卓真机软键盘/安全区域与低性能设备复核；朝代全览的标签密度和 G6 共享包加载继续优化。共享图形包 gzip 406.69 KB，构建保留体积提示。本轮范围为本地开发与预览。

### 2026-10-17 22:10:27（Asia/Shanghai）· 深色知识星图 UI

- 需求：按详细 UI 规范实施深色、沉浸式、可持续探索的知识空间，覆盖首页、两张图谱、搜索、工具、详情及手机。
- 完成：集中 CSS Variables 色板；G6 类型配色、首字人物节点与外部标签、尺寸层次、克制光晕、细线与选中高亮；图谱全屏、底部胶囊搜索、右下浮动工具、筛选/图例/节点索引；默认关闭的桌面抽屉与手机可收展底部面板。
- 首页：同一 G6 组件渲染真实三国子图；专题缩略图取自真实 JSON，分类与统计均从数据计算。窄屏人物初始布局紧凑排列，朝代保持时间分支。
- 涉及：tokens.css、graphTheme.ts、ExplorerSearch、HomeAtlasPreview、TopicMiniMap；更新首页、专题画布/容器/详情、SiteLayout、图标、样式、favicon、index.html 和文档。
- 验证：23 项测试、Lint、数据/TypeScript 与生产构建通过；开发实际页面检查完成；最终生产 9 组浏览器流程通过，错误 0；320/390/430/768/1024px 布局无横向溢出，专题无整页滚动；390px 单指拖动与双向捏合、详情收展通过；短视口与原花园/太阳系页面通过。
- 数据：10 份专题 JSON 的 SHA-256 与基线一致，现有路由及纯函数探索模型沿用，依赖列表保持原配置。
- 后续：真机 Safari/安卓软键盘、安全区域和低性能设备复核；密集图的连线与标签继续迭代。G6 共享包 gzip 约 407 KB，首页主包约 120 KB。本轮在本地开发与生产预览完成。
- 证据：outputs/star-界面改造与验收.md、star-browser-production.json、star-data-integrity.json、star-build.log、star-tests.log、star-lint.log 与 star-production 截图。

### 2026-10-17 18:47:38（Asia/Shanghai）· 移动端优化与上线前检查

- 需求：优化手机首页和两张图谱，完善分享与页面元信息，验证生产部署独立性。
- 完成：原生 dialog 底部详情、独立滚动与背景锁定、关闭/遮罩/Escape、展开后回画布；折叠筛选和 44px 工具触控区域；保留桌面侧栏；修复 G6 点选后的兼容点击穿透与手势误触。
- 分享：实际剪贴板复制及受限时可选择的链接；稳定独立 URL；路由标题/描述/canonical/OG/Twitter；生产构建生成 10 个静态路由 HTML，供分享抓取器读取。
- 涉及：NodeDetailsPanel、ShareLinkButton、PageMetadata、pageMetadata、KnowledgeExplorer、ExplorerCanvas、SiteLayout、global/explorer.css、index.html、build-pages、元信息测试、package.json、.env.example、README。
- 验证：23 项测试、Lint、数据/类型检查及生产构建通过；独立 dist 静态服务器的 10 组浏览器验收通过，控制台错误 0；320/390/430/768px 两专题布局与面板交互通过；390px 单指拖动和双指双向缩放通过；桌面两专题核心交互与复制回读、直接打开/刷新/前进/后退通过；关闭 JS 可读取专题元信息。
- 部署：完整 dist 静态部署包已生成；README 补充 Cloudflare Pages 及自有域名配置。账号登录、公开项目创建、上传发布和 DNS 由站点所有者完成。
- 后续：iOS Safari/低配安卓真机、微信/小红书线上分享卡片与公网访问待验证；当前正式域名留空；G6 异步包 gzip 约 411 KB。项目当前无 Git 仓库，建议后续建立 checkpoint。
- 证据：outputs/mobile-launch-交付与部署.md、mobile-launch-browser.json、测试/构建/Lint 日志、手机和桌面截图、knowledge-atlas-static.zip。

### 2026-10-17 18:08:22（Asia/Shanghai）· 第二个独立互动专题

- 需求：新增中国历史朝代关系图，验证跨专题复用，保留三国与现有 UI。
- 完成：4 份独立 JSON；26 个政权或时期、25 位人物、25 个事件、137 条关系、33 份来源；区分更替、承继、分立、并存与时期归纳，注明起讫和延续政权口径。
- 架构：复用通用页面、G6 画布、搜索、详情与展开；增加可选档案字段、人物入口、时期节点、并存区间校验和数据驱动视野。首页通过 catalog 自动增加专题卡片。
- 涉及：朝代专题 JSON、catalog、explorer 类型、KnowledgeExplorer/ExplorerCanvas/NodeDetails、explorer.css、数据校验器、dynasties.test.mjs、package.json、数据文档与 README。
- 验证：20 项测试、Lint、数据与类型检查、生产构建通过；开发环境两专题交互通过，最终生产朝代 6 组与三国 8 组浏览器检查通过，错误 0；朝代全量 76 节点/137 关系可达且 ID 无重复；320/390/768/1024 像素布局无横向溢出；三国 3 份内容 JSON 的 SHA-256 与本轮起点一致。
- 待办：密集总览中的交叉连线；G6 异步包 gzip 约 410 KB，首页包 gzip 约 119 KB；真机 Safari/低配安卓验证。年代间距采用示意布局。
- 证据：工作区 outputs/dynasties-交付说明.md、dynasties-资料与口径.md、生产浏览器 JSON、构建/测试日志与截图。

### 2026-10-17 17:21:21（Asia/Shanghai）· 功能验收与修复

- 需求：完整验收导航、图谱交互、历史数据、布局及通用数据架构，修复发现的问题。
- 完成：修复切换节点后详情滚动和展开状态残留；加入 G6 标签避让；增大手机搜索触控区域；补齐三顾茅庐异说、汉中战事出处与曹魏继位来源；拦截不同 ID 的重复关系。
- 数据：保留 22 个节点、40 条关系，来源增至 10 份；新增专题继续复用通用页面与图谱模块。
- 涉及：图谱画布/容器、explorer.css、三国节点/关系/来源、数据校验器、测试及数据文档。
- 验证：14 项测试、Lint、数据与类型校验、生产构建通过；生产核心 8 组和补充 5 组浏览器检查通过，错误 0；开发补充 6 组通过，全图适配的 28 个可见标签无重叠；320–1440 像素宽度检查通过。
- 待办：密集连线交叉、G6 资源体积与弱网首载、真机 Safari/低配安卓验证。
- 证据：工作区 outputs/acceptance-验收与修复.md、acceptance-数据核验.md、浏览器 JSON、标签边界、构建/测试日志与截图。

### 2026-10-17 16:53:59（Asia/Shanghai）· UI 第一版统一

- 需求：统一首页和图谱页面，优先改善布局比例、空白、文字与节点可读性。
- 完成：共享米白、砖红、鼠尾草绿配色与卡片规范；压紧页头和工具区；扩大有效画布；提高人物、连线标签和详情字号；修正选中节点名称缩小；手机详情提前至图例之前。
- 涉及：src/styles/global.css、src/styles/explorer.css、src/features/graph/KnowledgeExplorer.tsx、src/features/graph/ExplorerCanvas.tsx、README.md。
- 验证：11 项测试、Lint、数据校验、TypeScript 与生产构建通过；最终生产预览 8 组浏览器交互检查通过，错误 0；首页与图谱在 320、390、768、1280、1440 像素宽度均无横向溢出。
- 后续：优化全部展开时的连线标签避让，以及手机首屏筛选区的占用；G6 异步包 gzip 约 410 KB。
- 截图、验收报告和本轮说明位于工作区 outputs，文件名前缀 ui-v1。

### 2026-10-17 16:29:27（Asia/Shanghai）· 三国互动图谱

- 需求：完成第一张可交互的三国人物关系网。
- 完成：22 个节点、40 条关系、9 份来源；独立 JSON、通用图谱组件、详情、关联展开、搜索、筛选、高亮与触控缩放。
- 涉及：专题数据、类型、专题入口、图谱模块、数据校验与测试、使用文档。
- 验证：11 项逻辑测试通过；类型检查、Lint、生产构建通过；开发与生产各 8 组浏览器检查通过，错误记录均为 0。
- 当前限制：图谱异步包 gzip 约 410 KB；布局针对本批 22 节点编排；刷新页面回到初始探索状态。
- 交付与验证记录位于工作区 outputs，包含第二阶段交付说明、浏览器报告、构建日志和截图。

## 启动

要求 Node.js 24 LTS 与 npm，本轮使用 Node.js 24.21.0。项目依赖已安装。

```powershell
cd F:\Codex\2026-10-17\knowledge-atlas-1-knowledge-atlas-2\knowledge-atlas
npm run dev
```

打开终端显示的地址，默认为 `http://localhost:5173`。首次在其他机器获取项目时运行 `npm ci`。

本机还可复用已验证的 D 盘运行环境：

```powershell
$env:PATH = 'D:\Codex\personal-ai-newsroom\runtime\node-v24.21.0-win-x64;' + $env:PATH
npm run dev
```

## 命令

| 命令                 | 用途                                           |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | 同步历史资料并启动开发服务器与热更新           |
| `npm run sync:history` | 将三国共享资料更新到朝代图，保留独立专题数据   |
| `npm run check:data` | 校验 JSON 字段、标识符、关系端点与状态         |
| `npm run typecheck`  | TypeScript 类型检查                            |
| `npm run lint`       | Oxlint 静态检查                                |
| `npm run test`       | 图谱展开、筛选、搜索、证据分类及数据校验测试   |
| `npm run build`      | 校验知识数据、类型检查并输出生产资源至 `dist/` |
| `npm run preview`    | 本地预览生产构建，默认端口 4173                |

## 技术与路由

React + TypeScript + Vite，React Router，AntV G6 v5，本地图标组件，原生 CSS。依赖的实际安装版本记录于 `package-lock.json`。

| 路径               | 模块                                       |
| ------------------ | ------------------------------------------ |
| `/`                | 首页、搜索入口与精选专题                   |
| `/topics`          | 专题列表，支持 `q` 和 `category` 查询参数  |
| `/topics/:topicId` | 专题介绍；三国、朝代专题直接进入通用探索页 |
| `/graph/:topicId`  | 图谱页；互动专题兼容入口指向同一探索组件   |
| 其他路径           | 404 引导页                                 |

## 目录

```text
src/
  components/          # 页头页脚、专题卡片等共享界面
  data/
    topics/            # 基础专题 JSON、互动专题元数据
      three-kingdoms/  # nodes.json、relations.json、sources.json
      chinese-dynasties/ # 朝代专题独立的节点、关系与来源 JSON
    catalog.ts         # 专题注册与查询
    README.md          # 新增专题约定
  features/
    graph/             # 基础画布、通用探索画布、交互逻辑、节点详情
    topics/            # 搜索与分类筛选
  pages/
    home/              # 首页
    topics/            # 专题列表与详情
    graph/             # 图谱页面
    NotFoundPage.tsx   # 无效地址与专题
  styles/              # 全局视觉、响应式和无障碍样式
  types/               # 知识数据模型
  App.tsx              # 路由组装
  main.tsx             # React 入口
scripts/
  validate-data.mjs    # 构建前数据校验
  lib/                 # 互动专题的来源、节点与关系校验
  explorer.test.mjs    # Node.js 内置测试运行器，覆盖探索逻辑与错误数据
  dynasties.test.mjs   # 朝代分支、并存区间、内容口径与展开测试
```

## G6 v5 接入

按官方文档使用 `import { Graph } from '@antv/g6'`，通过 `new Graph({ container, data, node, edge, behaviors })` 配置实例。基础图谱保持原有 `autoFit: 'view'` 体验。

互动图谱使用 `NodeEvent.CLICK` 处理节点选择，`setData()` + `render()` 更新可见子图，`setElementState()` 高亮当前节点与直接关联，`fitView()` 适应视野，`zoomBy()` / `zoomTo()` 缩放，`focusElement()` 定位搜索结果。通过 `GraphEvent.AFTER_TRANSFORM` 更新缩放比例。

关联展开保留现有节点的拖拽坐标；“重新开始”恢复初始节点、筛选、选择、位置与视野。异步图操作串行执行，组件清理时释放监听和图实例。手机双指手势按距离比调用 `zoomTo()`，同时暂停单指拖动行为。图谱模块通过 `React.lazy` 延迟加载。

官方参考：[快速开始](https://g6.antv.antgroup.com/manual/getting-started/quick-start)、[React 集成](https://g6.antv.vision/en/manual/getting-started/integration/react/)、[实例生命周期](https://g6.antv.antgroup.com/en/api/graph/)。

互动 API：[数据操作](https://g6.antv.antgroup.com/en/api/data)、[元素状态](https://g6.antv.antgroup.com/api/element)、[视野操作](https://g6.antv.antgroup.com/en/api/viewport/)。

## 内容与后续

三国专题主线覆盖184—280年，包含111个节点、369条关系与43个来源条目：57位人物、27个事件（含单独标注的桃园结义）、5个政权/阵营、5个阅读阶段、7部著作、10个社会背景知识点。总览五阶段可点击进入人物与事件图；详情提供前因、后果及可继续探索的线索。“时间先后”“背景 / 影响”和“社会背景”分别筛选；分期边界允许重叠，陈寿修史等后续内容标为延伸阅读。

中国历史朝代专题包含282个节点、721条关系与168个来源条目：26个政权或时期、136位人物、65个事件、33部作品、22个社会背景知识点。初始展示26个政权或时期，视野从两宋与周边政权开始；点击朝代先呈现最多8位主要人物，展开可加入其余人物，继续探索作品和事迹。年代布局按阶段示意，间距不与年份成比例。

两张图的汉末三国资料通过 `npm run sync:history` 同步，57位人物的小传与事迹保持一致；启动与构建自动执行，测试和数据检查发现过期资料会报错。来源条目包含同步副本，各时代收录名单、真实数量和待补内容见 [历史内容收录清单](src/data/coverage/README.md)。当前内容为代表性选录，社会背景按主题逐步完善。

政权详情提供存在时间、都城、重要人物、关键事件和资料；点击“展开关联”显示相关人物和事件。朝代关系分为取代/兼并、前后承继、走向分立、同时并存、时期归纳、人物关联、事件关联。并存关系使用无向线，年份区间接受交集校验。孙吴称王与称帝、辽与清的不同起算口径、北元与南明的延续情况在详情中说明。

- 点击画布节点或节点名称，阅读简介、身份、相关事件、关系说明与来源。
- 输入姓名、字号或事件名，可将未显示的匹配节点加入图谱并定位。
- “关系类型”控制连线与后续展开范围，已展开节点会保留；“全选”和“清空”可恢复或清除关系类型。
- “关系高亮”突出当前节点的直接联系；同时存在的联盟、敌对关系在说明和连线中标注时期。
- “显示演义内容”控制文学情节节点与关系；桃园结义使用《三国演义》第一回，附文学标记。三顾茅庐依据《三国志·诸葛亮传》。
- 所有介绍和依据摘要均为通俗转述，原文阅读链接指向对应卷或回目；节点与关系通过来源 ID 引用同一来源库。

数据库、账号与管理后台属于后续范围。

## 验证

```powershell
npm run test
npm run lint
npm run build
npm run preview
```

在预览地址依次检查：首页三国入口 → 汉室衰落 → 董卓入洛 → 前因与后果 → 后续线索；搜索“孟德”进入曹操，展开关联、点击作品《短歌行》；依次进入后续四阶段，搜索“西晋统一”，筛选“背景 / 影响”和“时间先后”；检索“桃园结义”阅读文学标记。返回首页进入朝代专题，点击唐、李白和《将进酒》，再检索两宋、辽、西夏，检查并存关系。切换手机宽度，检查详情收展、触控、缩放。花园与太阳系图谱继续使用原有入口。

自动浏览器验收记录和截图保存在工作区 `outputs/`。朝代阶段脚本为 `work/dynasties-browser-check.mjs` 与 `work/dynasties-three-kingdoms-check.mjs`，复用工作区 Playwright 与 E 盘 Chromium。通过 `TEST_BASE_URL` 指定开发或生产预览地址；生产报告为 `outputs/dynasties-browser-production.json` 与 `outputs/dynasties-three-kingdoms-browser-production.json`。交付说明和资料口径分别见 `outputs/dynasties-交付说明.md`、`outputs/dynasties-资料与口径.md`。

下一阶段可增加按年份浏览、探索状态分享，以及更多经审核的节点。新互动专题的数据约定见 `src/data/README.md`。

移动端与分享阶段记录位于 `outputs/mobile-launch-browser.json`。本轮深色星图验收脚本为工作区 `work/star-browser-check.mjs`，通过 TEST_BASE_URL 选择开发或生产预览；截图与报告使用 star 前缀。具体交付见 `outputs/star-界面改造与验收.md`。

## 数字图书馆与系统主题

专题页采用占满视口的 G6 画布，顶部展示品牌、专题名称和真实统计，底部中央放置胶囊搜索框，右下角提供适应屏幕、关系筛选与更多工具。图例、缩放、重新开始、节点索引及分享位于对应浮层；正文页面继续使用站点导航。

默认关闭详情。点选节点或搜索结果会选中并定位，在桌面打开右侧抽屉；来源与次要关系可以折叠，展开关联操作固定在面板底部。详情内部滚动，专题页面保持全屏。

全站默认跟随操作系统主题，系统切换后页面与画布同步更新。浅色使用纸张白与陶土红强调色，深色采用墨蓝背景和克制光晕。历史、科学、文学、传统文化、自然地理分别使用陶土红、蓝青、紫、金、绿，领域定义见 `src/data/domains.ts`；当前尚未收录内容的领域展示真实的 0 个专题。

色彩、字体、阴影集中于 `src/styles/tokens.css`；`systemTheme.ts` 订阅系统变化，`graphTheme.ts` 读取变量，`graphAppearance.ts` 集中管理 G6 节点和边的状态样式。人物使用蓝色圆形首字标记，事件为紫色菱形，政权/阵营青绿，概念暖金。选中外圈在两个主题下分别校准，直接关联清晰，无关内容降低亮度。原始 JSON 分组信息继续在详情呈现。

节点和连线共用 `ExplorerCanvas`。核心、普通和辅助节点区分尺寸。三国专题通过 `showPortraits: false` 使用人物首字和外部姓名；现有肖像素材保留在资源目录。事件为菱形，朝代/政权为带年代标签的圆形，阵营为圆角形状，时期总称保留虚线边框。继续使用G6标签避让、拖拽坐标保留和串行更新。三国阶段图穿插排列按时序的事件与人物，朝代专题使用人物环和外围作品/事迹。

首页采用随系统主题切换的图书馆场景主视觉，精选历史专题使用插画封面。独立探索区由同一 ExplorerCanvas 渲染真实三国子图，可拖动和点选；专题缩略图从各自 JSON 的实际节点与连线生成。首页和目录中的 LibrarySearch 支持专题、人物别名、朝代及事件；人物结果使用 /topics/:topicId?node=:nodeId 定位并打开知识档案，基础专题的结果滚动到对应知识文章。统计来自数据与当前可见子图，分类与搜索入口均可使用。动画集中于浮层、抽屉与短暂悬停反馈，并尊重减少动态效果设置。

## 手机阅读与分享

760px 及以下点选节点会打开底部详情面板，可用右上角关闭、点击遮罩或 Escape 返回；顶部按钮可在紧凑与展开阅读状态间切换。面板独立滚动，背景暂停滚动；展开关联后返回画布查看新节点。较宽屏幕按需打开右侧详情抽屉。

点击右下角“关系筛选”打开筛选浮层；工具与筛选项保留至少 44px 的主要触控区域。画布支持单指拖动、双指缩放、节点点选以及适应屏幕，拖动和捏合后的兼容点击会受到拦截。底部搜索适配 visualViewport 与安全区域，输入时在上方展示结果。

两个专题使用稳定地址：

- `/topics/three-kingdoms`
- `/topics/chinese-dynasties`

“更多工具”中的“复制分享链接”复制当前站点的独立专题地址，成功后显示反馈。剪贴板权限受限时会显示可长按或选中复制的链接。刷新和重新打开链接回到该专题的初始图谱；分享链接表示专题入口。

页面标题、描述、Open Graph 与 Twitter 基础文字信息随路由切换。生产构建会额外输出首页、专题列表、每个专题和图谱兼容入口的 HTML，让分享抓取器直接读取标题与描述。React 内容仍在浏览器中渲染。

## 部署

图谱页使用按需加载。G6 共享异步包 gzip 约407 KB，探索界面异步包 gzip 约9 KB，共享入口与当前知识数据 gzip 约327 KB。首页真实图谱预览与专题复用同一 G6 包，Vite 保留资源大小提示。两个互动专题采用 JSON 中人工编排的初始坐标；新专题需安排自身节点位置与分支，元数据可配置初始焦点、缩放范围及连线弧度。

将完整 `dist/` 部署到静态站点服务，包括 `assets/`、`topics/`、`graph/` 和根目录文件。当前部署约定为域名根目录。静态服务器先匹配实际文件及目录入口，未知页面路径回退到根 `index.html`；资源路径应按实际文件处理。Vite preview 用于本地预览。独立静态服务验证脚本在工作区 `work/mobile-launch-static-server.mjs`，运行时仅从 dist 读取文件。

正式站点地址为 `https://zhitu.weiyi.indevs.in`，在 `.env.production` 中维护公开的 `VITE_SITE_URL`，构建时用于页面 canonical 与 og:url。更换域名时同步修改此文件与 `wrangler.jsonc` 的自定义域名，再构建和部署。账号凭据保存在本地授权工具中。

当前采用 Cloudflare Workers Static Assets，Worker 名称 `knowledge-atlas`。`wrangler.jsonc` 配置静态资源目录、SPA 回退和独立自定义域名。部署采用[官方静态资源方式](https://developers.cloudflare.com/workers/static-assets/)，域名使用[Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

HTML 使用 `drop-trailing-slash`，直接打开专题路径时匹配对应专题HTML；其他页面路径采用SPA回退。正式HTTPS支持浏览器剪贴板API，权限受限时可使用已有的手动复制入口。

后续发布：使用Node.js 24，在项目目录执行 `npm ci`、`npm test`、`npm run lint`、`npm run deploy`。`deploy` 会重新同步资料、校验、构建，并使用固定版本Wrangler上传。首次在其他设备操作时，通过 `npx --yes wrangler@4.150.0 login` 登录站点所有者账号，并确认账号具有目标zone及Workers权限。发布工具版本在package.json脚本中固定。

GitHub仓库存放源码、知识JSON、网站图片和部署配置。`node_modules/`、`dist/`、`.wrangler/`与私有环境文件已忽略。部署凭据留在本地，GitHub推送当前由手动发布流程配合执行；自动部署可在后续配置。
