# 知识数据

数据模型位于 `src/types/knowledge.ts` 与 `src/types/explorer.ts`。专题通过 `catalog.ts` 注册，页面按 `mode` 选择基础图谱或互动探索组件。

## 基础专题

花园与太阳系沿用单文件 JSON：`topics/garden.json`、`topics/solar-system.json`。包含 `nodes` 与 `edges`，节点通过 `x/y` 指定示意位置。

## 互动专题

每个互动专题使用四份独立 JSON。现有三国与中国朝代专题均遵循这一结构：

```text
topics/three-kingdoms.json            # 专题元数据与表现配置
topics/three-kingdoms/nodes.json      # 人物、阵营、事件
topics/three-kingdoms/relations.json  # 有类型、时期及证据的关系
topics/three-kingdoms/sources.json    # 共享来源库
topics/chinese-dynasties.json        # 中国朝代专题元数据
topics/chinese-dynasties/            # 同样包含 nodes/relations/sources.json
```

元数据设置 `mode: "explorer"` 和 `status: "published"`，包括初始节点 ID、初始选中节点、阵营/分组配色、关系类型定义、证据分类名称和阅读提示。

| 数据 | 关键字段                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 节点 | `id`、`label`、`aliases`、`kind`、`identity`、`description`、`period`、`groupId`、`basis`、`relatedEventIds`、`citations`、`position` |
| 关系 | `id`、`source`、`target`、`type`、`label`、`description`、`period`、`basis`、`citations`                                              |
| 来源 | `id`、`title`、`author`、`kind`、`url`、`description`                                                                                 |
| 引用 | `sourceId`、`locator`、`note`                                                                                                         |

- `kind` 支持 `person`、`faction`、`event`、`concept`、`polity`（具体政权）、`period`（时期总称）和 `work`（作品或著作）。科学类专题可使用 `concept`；政权与时期以圆形显示名称和年代，时期使用虚线边框；作品使用暖金色圆角矩形。
- `groupId` 引用元数据中的分组，分组名称和颜色由数据决定。
- 关系类型的标签、含义、颜色、方向与虚线设置均位于元数据，后续专题可自行定义关系类型。
- `basis: "documented"` 表示有资料依据，`basis: "literary"` 表示文学情节；两类文字标签由元数据中的 `basisLabels` 定义。
- 来源 `kind: "primary"` 为原始文献，`kind: "reference"` 为研究与参考资料，`kind: "literature"` 为文学作品。文学节点与连线必须引用文学来源；资料记载至少引用一份原始文献或参考资料。
- `locator` 填写卷、人物传、年号或段落主题，`note` 填写依据摘要。摘要使用通俗转述，引用原句时需另行核实原文。来源链接使用 HTTPS。
- `position` 为初始画布坐标。展开与筛选保留用户已拖动的位置，“重新开始”恢复数据中的坐标。
- 节点可增加 `facts: [{ label, value }]`，通用详情直接呈现都城、重要人物等字段；`relatedPersonIds` 提供可点选的人物入口，`relatedEventIds` 提供事件入口。对应关系还应写入 relations，以支持关联展开。
- 人物可增加 `relatedWorkIds`，每个 ID 指向 `work` 节点，并必须具有对应关系；`achievements: [{ title, description, citations }]` 展示主要事迹，`lifeEvents: [{ date, title, description, citations }]` 展示经历。每条叙述单独保留来源，校验会拒绝缺失依据、错误作品 ID 和未连接的作品。
- 元数据可增加 `peopleExploration: { rootKinds: ['polity', 'period'], membershipRelationType: 'figure', includeRootEvents: true }`。点击这些类型时，通过 `relatedPersonIds` 和已启用的关系进入局部人物网络；可选的 `includeRootEvents` 同步带出根节点事件。人物点击自动展示直接关联的人物、作品、事件，手动展开继续加入其他邻居。
- 元数据可增加 `story: { overviewLabel, chapters: [{ nodeId, caption }] }`，以独立JSON配置阅读阶段导航。阶段节点用 `relatedPersonIds` 与 `relatedEventIds` 维护入口，章节顺序按起始年校验；切换阶段恢复该段局部图。三国使用这一配置，朝代专题继续使用原有人物环布局。`showPortraits: false` 关闭该专题的艺术头像显示。
- 节点可增加 `context: [{ title, description, citations }]` 提供独立引用的背景与影响。三国的 `sequence` 仅表达时间顺序，`influence` 表达具体的背景、促成条件或影响；同年和跨年事件可并行，不能凭时间先后推定因果。
- 局部人物图复用同一 G6 实例和详情组件，按朝代中心、人物环与外围事迹安排位置，关系筛选参与展开与可见性计算；返回朝代总览恢复初始节点。根节点推断支持人物别名检索及 `?node=人物或作品ID` 的直接入口。
- 节点及关系可增加 `timeRange: { start, end }`；公元前年份用负数。它用于区间校验，显示文本仍由 `period` 指定。这里按整年表示时段，起止年均包含在内。
- 关系类型可配置 `temporalRule: "overlap"`，用于同时并存类关系。此类关系必须无向，关系区间必须位于双方时间区间的交集中。
- 元数据可增加 `viewport: { initialZoom, minZoom, focusOnExpand, initialFocusIds }`、`edgeCurveOffset` 和 `layoutNote`。initialFocusIds 可设置一组初始节点的共同中心。长时间线可从一个局部开始阅读、展开后保持中心；手机初始缩放最高为 72%。总览和搜索仍复用现有按钮。

## 添加新专题

1. 新建元数据 JSON 和同名数据目录，填写节点、关系、来源。
2. 设定初始可见节点、初始选中 ID、分组与关系类型。初始图中保留清晰的探索入口。
   如需年代布局，在 JSON 的 position 中安排历史阶段与并行分支，并填写说明；图中距离为示意，时间以 period 与 timeRange 为准。
3. 在 `catalog.ts` 导入四份文件，组装为 `ExplorerDataset`，加入 `topics`。
4. 运行 `npm run check:data`、`npm run test` 与 `npm run build`。
5. 用浏览器检查节点点击、逐层展开、搜索、筛选与手机布局，并审核每条关系的依据。

图谱组件位于 `src/features/graph/`。`KnowledgeExplorer` 管理探索状态，`ExplorerCanvas` 管理 G6 实例，`NodeDetails` 呈现通用详情，`explorerModel` 提供纯函数。具体人物与关系保存在 JSON 中。

## 三国内容口径

本批主线覆盖184—280年，共111个节点、369条关系、43个来源条目（57人物、27事件、5政权/阵营、5阅读阶段、7作品、10社会背景知识点）。陈寿修史与统一后的治理作为延伸阅读，标明超出280年的部分。以《后汉书》《三国志》《晋书》相关卷为主要史料，链接为维基文库开放转录文本，阅读时应核对本传、裴注及史书立场。桃园结义依《三国演义》第一回单独标记。作品节点表示著述归属；诗文内容、小说场景与历史现场分别说明。

史料存在不同记述时，在节点与关系的 `description`、引用的 `locator` / `note` 中说明所据篇章及异说。`documented` 表示有史料依据；具体论断应结合本传与裴注分别阅读。本批三顾茅庐补充了裴注异说，汉中战事补引《法正传》，说明与《先主传》叙事起点的差别。

这张图跨越多个时期。曹魏、蜀汉、孙吴的颜色包含建国前的势力前身；关羽、周瑜、孙策等人的节点说明注明其身份或时期。孙刘的赤壁联盟与夷陵交战分别标注发生时期。

发布前的自动校验检查唯一 ID、关系端点、来源标识、证据类型、别名、相关事件、分组、初始选择与坐标。史料解释和因果判断仍需内容审核。

## 朝代内容口径

中国朝代专题含26个政权或时期、136位人物、65个事件、33部作品、22个背景知识点，共282个节点、721条关系、168个来源条目。168条包含同步引用的命名空间副本，去重链接数量见收录清单。起始显示26个政权或时期，视野定位两宋及周边。点击朝代后进入代表人物网络，点击人物继续探索事迹、交往与作品；左上按钮返回朝代总览。26个时期或政权各至少有3位人物，属于持续扩充的代表性选录。

三国、十六国、南北朝、南朝、北朝、五代十国和蒙古前期为时期或政权群总称。具体政权与时期总称使用不同边框，并在详情解释都城和分期口径。

宋、辽、西夏、金的连接包含按具体年份校验的并存关系；秦汉、汉魏、晋魏等更替与皇室延续分别标注。孙吴使用 222 年黄武纪年起点，并注明 229 年称帝；辽用 916 年称帝，西夏用 1038 年称帝，元用 1271 年改国号，清用 1636 年改国号至 1912 年退位。简介保留其他常见起算口径及北元、南明等延续情况。

来源包含国家博物馆、故宫博物院、宁夏大学西夏学研究院、社科研究、政务资料，以及《史记》《汉书》《后汉书》《三国志》《晋书》《宋书》的原文转录。来源名称、链接、定位与摘要独立维护。

人物扩充补入《隋书》《旧唐书》《宋史》《元史》《明史》等原文在线转录，以及国家图书馆、故宫、中科院等机构的资料。在线转录注明宿主与篇章，专业研究可继续对照校勘本。李白出生地、李清照和郑和的卒年、曹雪芹生卒、书法摹本与作品后世编订等在资料中保留说明。

`work` 的 `basis: 'documented'` 说明作品存在及作者归属有资料支持，作品故事中的人物和事件仍需按其文学性质理解。《桃花源记》《窦娥冤》《红楼梦》的介绍明确说明这一点；《授时历》明确为集体研订成果，徐霞客日记与后人编订亦分别说明。

朝代专题保存独立JSON；汉末三国的共享人物、事件、作品和背景资料以三国专题为主数据源，通过同步脚本写入朝代图。关羽、孙策、周瑜等早于相关政权正式建国的经历，在时代关联和事件中标注前史。

## 共享资料、社会背景与收录边界

- `shared/history-imports.json` 指定跨专题来源、节点类型、时代人物与背景归属。共享节点携带 `sharedFrom`，来源标识使用 `shared-three-` 前缀；保留朝代专属布局、额外别名和背景线索。
- 修改三国资料后运行 `npm run sync:history`。`predev` 与生产构建会执行同步；`check:data` 和 `pretest` 以只读方式检查同步状态。新增与更新可同步，删除或更改ID需另行审核既有引用。
- `relatedBackgroundIds` 关联 `concept` 节点，对应连线必须存在。背景关系表达具体的制度、生产、迁徙或文化联系，解释中注明适用时期。
- `initialPeopleLimit: 8` 控制朝代或阶段初次打开的主要人物数量。详情中提供全部人物入口，展开关联加入其余人物；较多人物使用多环布局，三国保留人物与事件分行的历史主线布局。
- 收录数量、各时代人物名单、背景清单、候选人物和待补范围见 [coverage/README.md](coverage/README.md)，机器可读数据见 `coverage/history-coverage.json`。每轮补充后应同步刷新这两份清单。
- 社会背景当前覆盖22条主题线索，详细制度、基层生活、区域差异与研究争议仍需扩写。人物小传和史料解释需持续审校。
