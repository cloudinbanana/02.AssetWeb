# PRD：资产市值排行榜（Top Assets by Market Cap）网页

## 1. 背景与目标

### 1.1 背景
需要开发一个与 `https://companiesmarketcap.com/assets-by-market-cap/` 页面形态与交互接近的“资产市值排行榜”网页，用于展示各类资产（公司、贵金属、加密货币、ETF 等）的市值排名，并支持基础筛选、搜索、排序与详情跳转。首期数据允许静态内置；后续可支持从指定网站抓取/同步更新。

### 1.2 产品目标
- 提供清晰的“资产按市值排行”列表展示，信息密度高、可快速对比。
- 支持用户通过分类筛选、搜索、排序快速定位目标资产。
- 首期可用静态数据即可上线；后续可无缝切换到“从指定网站获取”的数据源。

### 1.3 非目标（本期不做）
- 不实现完整账号体系（页面可保留“Sign in”入口但不接入真实登录）。
- 不实现交易、下单、组合管理等金融功能。
- 不承诺实时行情（后续数据源升级后再考虑刷新频率与实时性）。

## 2. 页面功能概述（基于截图识别）

### 2.1 顶部导航与全局操作
- 顶部信息条：展示站点导航入口（如 Global ranking / Ranking by countries / Ranking by categories / ETFs）。
- 右侧全局控件：
  - Sign in 按钮（可跳转到占位登录页或弹窗占位）。
  - 语言选择（如 English，下拉）。
  - 计价货币选择（如 USD，下拉）。
  - 明暗主题切换（图标按钮）。
  - 搜索框（占位：Company name, ticker...），支持输入名称/代码检索。
- 页面顶部统计信息：如 Companies 数量、total market cap 总市值（展示型，不要求可点击）。
- 广告位（可选）：顶部横幅区域，用于后续接入广告或公告（可先用占位块）。

### 2.2 内容区：标题 + 分类筛选
- 页面主标题：Top Assets by Market Cap。
- 分类筛选（类似“胶囊/标签”）：
  - All assets
  - public companies
  - precious metals
  - cryptocurrencies
  - ETFs
- 点击分类后，列表数据按所选分类过滤，并重置分页到第 1 页。

### 2.3 核心列表：资产排名表格
表格列（与截图一致）：
- Rank：排名（数值）。
- Name：资产名称 + 图标 +（可选）ticker/简称（如 NVDA、AAPL、BTC）。
- Market Cap：市值（支持单位缩写：T/B/M）。
- Price：价格（与所选货币符号关联）。
- Today：当日涨跌幅（红跌绿涨）。
- Price (30 days)：30 日走势迷你折线图（sparkline）。
- Country：国家/地区（国旗 + 文本，如 USA；非国家资产可为空或显示“-”）。

交互：
- 列排序：Market Cap、Price、Today 支持点击列头排序（升/降切换），默认按 Market Cap 降序。
- 行点击：点击整行或名称区域进入资产详情页（首期可用占位详情页）。
- 视觉强调：对部分资产行做“类别色块高亮”（截图中 Gold/Silver 为浅黄色底，Bitcoin 为浅紫色底）；要求高亮为整行同色背景，表格每列背景一致，呈现“切割感”（每一行背景统一，行与行之间边界清晰）。

## 3. 用户与使用场景

### 3.1 目标用户
- 对市场排名/市值规模感兴趣的普通用户。
- 做市场对比与研究的内容创作者/分析人员。

### 3.2 典型场景
- 我想快速知道当前市值最高的资产前 20 名是谁。
- 我只看加密货币/ETF 排名。
- 我搜索某个公司代码（如 NVDA）查看排名与 30 日走势。
- 我切换货币为 USD（后续可扩展）以统一口径展示。

## 4. 信息架构与页面结构

### 4.1 页面结构（从上到下）
- 顶部导航栏
- 顶部统计信息（Companies / total market cap）
- （可选）横幅位
- 标题区（Top Assets by Market Cap）
- 分类筛选条
- 排名表格（含分页）
- 页脚（可选）

### 4.2 路由规划（建议）
- `/assets-by-market-cap`：榜单页（本 PRD 对应页面）
- `/asset/:slug`：资产详情页（占位即可）

## 5. 功能需求（FR）

### 5.1 分类筛选
- 默认选中 `All assets`。
- 点击某分类后：
  - 列表按资产 `category` 过滤。
  - URL query 同步（建议）：`?category=cryptocurrencies`，便于分享与刷新保持状态。

### 5.2 搜索
- 输入关键词支持匹配：
  - name（如 Apple）
  - ticker（如 AAPL）
- 搜索结果范围受当前分类约束（先筛选后搜索）。
- 支持回车触发；输入时可做防抖（300ms）。
- 空结果展示空态（“未找到相关资产”）。

### 5.3 排序
- 默认：按 `marketCap` 降序。
- 支持排序字段：
  - marketCap
  - price
  - todayChangePercent
- 排序交互：
  - 点击列头切换升/降。
  - 列头展示排序指示（上/下箭头）。

### 5.4 表格展示
- 每行展示字段（见 2.3）。
- Name 列：
  - 左侧图标（公司 logo / 资产图标；静态数据可用占位图）。
  - 主标题为 name，副文本为 ticker（小号、灰色）。
- Today 列：
  - 正值绿色、负值红色，0 为中性灰。
  - 显示格式：`+0.53%` / `-0.21%`。
- Price (30 days)：
  - 使用 sparkline 折线（SVG/Canvas 均可）。
  - 根据 30 日走势决定折线颜色（建议：上涨绿、下跌红；或统一绿与站点保持一致）。
- Country 列：
  - 显示国旗小图标 + 国家缩写/名称（如 USA）。
  - 非国家资产（如 Gold、Silver、Bitcoin）可为空或显示 `—`。

### 5.5 行高亮（类别色块）
- 支持按资产类别应用整行背景色（示例）：
  - precious metals：浅黄色背景
  - cryptocurrencies：浅紫色背景
  - 其他类别：白色背景
- 高亮规则：
  - 背景色覆盖整行所有单元格（同色且一致）。
  - 行与行之间用分隔线/间距形成明显“切割感”。

### 5.6 分页
- 默认每页 20 行（可配置）。
- 支持切换页码，URL query 同步（建议）：`?page=2`。
- 数据量较小时可隐藏分页控件。

### 5.7 数据源模式（静态 → 站点获取）
系统支持两种模式，首期默认静态：
- 静态模式（MVP）
  - 内置一份 JSON 数据（例如前 50 条）直接渲染。
  - 便于快速上线与 UI 联调。
- 站点获取模式（后续迭代）
  - 从 `https://companiesmarketcap.com/assets-by-market-cap/` 获取并解析列表数据。
  - 建议采用服务端抓取/中转接口（避免浏览器 CORS 与站点反爬问题），并加缓存（如 10~60 分钟）。
  - 支持手动刷新入口（可选）与更新时间展示（可选）。

## 6. 数据需求（字段定义）

### 6.1 Asset 数据结构（建议）
- `rank`：number
- `name`：string（如 Gold、NVIDIA）
- `ticker`：string | null（如 BTC、AAPL；非公司可为空）
- `category`：enum（public_companies / precious_metals / cryptocurrencies / etfs / other）
- `marketCap`：number（原始数值，单位为 USD 基准；显示时格式化为 T/B/M）
- `price`：number
- `todayChangePercent`：number（如 -0.21）
- `price30dSeries`：number[]（用于 sparkline，长度 20~30）
- `countryCode`：string | null（如 US；无则 null）
- `countryName`：string | null（如 USA；无则 null）
- `logoUrl`：string | null
- `detailUrl`：string | null（用于跳转详情页或外链）

### 6.2 格式化规则（展示层）
- 市值：
  - >= 1e12：显示 `x.xxx T`
  - >= 1e9：显示 `x.xxx B`
  - >= 1e6：显示 `x.xxx M`
- 价格：
  - 显示货币符号（USD：`$`），保留 2 位小数（BTC 可按需要保留 0~2 位）。
- 涨跌幅：
  - 保留 2 位小数，带符号。

## 7. 非功能需求（NFR）

### 7.1 性能
- 首屏（静态数据）渲染 < 1s（本地环境）。
- 表格滚动/分页切换无明显卡顿；sparkline 渲染应轻量（SVG path 复用）。

### 7.2 兼容性与响应式
- 桌面端优先（截图为桌面布局）。
- 移动端适配策略：
  - 隐藏 Price(30 days) 与 Country 等非关键列，或改为卡片布局。

### 7.3 可用性
- 加载态：站点获取模式下显示 skeleton/加载提示。
- 错误态：抓取失败展示错误提示与重试按钮。
- 空态：无搜索结果时展示空态文案。

### 7.4 国际化与货币（可先占位）
- 语言下拉可先仅提供 English（或中英两种），后续扩展。
- 货币下拉首期仅 USD；后续可扩展 EUR/CNY，并在格式化层转换显示（转换率可后续接入）。

## 8. 埋点与监控（建议）
- 页面曝光：`assets_rank_page_view`
- 分类切换：`assets_rank_category_change`
- 搜索：`assets_rank_search`
- 排序：`assets_rank_sort_change`
- 行点击：`assets_rank_row_click`
- 数据源模式：`assets_rank_data_source_mode`
- 抓取失败率、抓取耗时、缓存命中率（站点获取模式）

## 9. 验收标准（AC）
- 页面布局与信息层级与截图一致：顶部导航 + 标题 + 分类 + 表格。
- 表格至少支持：分类筛选、搜索、排序、分页四项能力。
- Today 列颜色规则正确（涨绿跌红）。
- 行高亮为整行统一背景色，各列背景一致，行间分隔清晰。
- 静态数据模式可完整运行并展示至少 20 条数据。
- 预留站点获取模式开关与接口位置，不影响静态模式运行。

