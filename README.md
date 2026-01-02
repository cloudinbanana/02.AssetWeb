# 02.AssetWeb（资产市值排行榜）

一个纯静态的“Top Assets by Market Cap”榜单页，实现了与 `companiesmarketcap.com/assets-by-market-cap/` 类似的信息架构与交互：分类筛选、搜索、排序、分页、行高亮与 30 天走势（sparkline）。同时提供一个本地“数据获取中心”，可通过服务端中转抓取目标网站数据并回填到页面展示。

## 功能概览

- 顶部栏：导航、语言/货币切换、主题切换、搜索框、Sign In（占位）
- 分类筛选：All / public companies / precious metals / cryptocurrencies / ETFs
- 表格列：Rank / Name（含 ticker）/ Market Cap / Price / Today / 30 天走势 / Country
- 交互：
  - 分类筛选、搜索（name/ticker）
  - 列排序（默认按 Market Cap 降序）
  - 分页与每页条数切换
  - 贵金属行浅黄、加密货币行浅紫（整行同色背景，行间分隔清晰）
- 移动端适配：
  - 小屏幕自动隐藏「30 天走势 / Country」两列，降低信息密度
  - 表格支持横向滑动查看完整列，分页区域纵向排布避免拥挤
- 数据获取中心：
  - 展示数据源、状态、条目数、错误信息
  - 支持切换数据源：静态内置数据 / 从目标网站抓取

## 视觉与一致性（v1.04）

- 统一控件尺寸：按钮 / 下拉 / 搜索框高度一致，移动端点击更友好
- 统一圆角与阴影：面板/弹窗/按钮使用统一的圆角变量与阴影强度
- 统一交互反馈：统一 `:focus-visible` 聚焦描边（键盘/无障碍友好），并补充轻量过渡

## 项目结构

```
.
├─ index.html        # 页面结构
├─ styles.css        # 样式（表格、整行高亮等）
├─ app.js            # 前端交互逻辑（筛选/搜索/排序/分页/渲染）
├─ server.py         # 本地 HTTP 服务 + 抓取接口（/api/...）
└─ prd.md            # 需求说明（PRD）
```

## 快速开始

### 方式 A：仅静态页面（推荐用于快速预览）

直接打开 `index.html` 即可使用“静态数据”模式（不依赖后端）。

> 说明：某些浏览器对 `file://` 下的 `fetch` 有限制，因此更推荐用方式 B。

### 方式 B：本地启动（推荐）

需要 Python 3（建议 3.8+）。

```bash
cd d:\WayToAgi
python server.py 8000
```

然后访问：

- 页面：`http://localhost:8000/`
- 抓取接口：`http://localhost:8000/api/assets-by-market-cap?limit=100`

## 数据抓取接口

### `GET /api/assets-by-market-cap`

查询参数：

- `limit`：返回条目数（1–500，默认 100）

响应示例（字段略）：

```json
{
  "updatedAtISO": "2026-01-02T03:05:10Z",
  "items": [
    {
      "rank": 1,
      "name": "Gold",
      "ticker": "GOLD",
      "category": "precious_metals",
      "marketCapUSD": 30120743648975,
      "priceUSD": 4332.1,
      "todayChangePercent": -0.21,
      "price30dSeries": [57.89, 55.26, 50.0],
      "countryName": null,
      "logoUrl": "https://companiesmarketcap.com/img/company-logos/64/GOLD.XM.png",
      "detailUrl": "https://companiesmarketcap.com/gold/marketcap/"
    }
  ],
  "error": null,
  "targetUrl": "https://companiesmarketcap.com/assets-by-market-cap/"
}
```

缓存策略：

- 服务端内置缓存（默认 15 分钟），减少频繁抓取导致的失败概率

## 部署说明

- **GitHub Pages 等纯静态托管**：只能使用“静态数据”模式（无法运行 `server.py`）。
- 若需要“从网站抓取”能力，请部署 `server.py` 到可运行 Python 的服务器/容器，并将前端的 API 指向你的服务地址（或同域反向代理）。

## 已知限制

- 抓取解析基于目标站点当前 HTML 结构（正则提取）。若目标站点结构变更，解析可能失败，需要更新解析逻辑。
- 目标站点可能存在反爬/限流；失败时接口会返回 `error` 字段，页面的数据获取中心会展示错误信息。
