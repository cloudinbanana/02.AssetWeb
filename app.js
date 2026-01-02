const CATEGORY_LABELS = {
  all: { en: "All assets", zh: "全部资产" },
  public_companies: { en: "public companies", zh: "上市公司" },
  precious_metals: { en: "precious metals", zh: "贵金属" },
  cryptocurrencies: { en: "cryptocurrencies", zh: "加密货币" },
  etfs: { en: "ETFs", zh: "ETF" },
};

const I18N = {
  pageTitle: { en: "Top Assets by Market Cap", zh: "按市值排名的资产榜单" },
  dataCenterTitle: { en: "Data Fetch Center", zh: "数据获取中心" },
  dataCenterApiText: { en: "Local API: /api/assets-by-market-cap", zh: "本地API：/api/assets-by-market-cap" },
  dataSourceStatic: { en: "Static data", zh: "静态数据" },
  dataSourceRemote: { en: "Fetch from website", zh: "从网站获取" },
  statusOk: { en: "OK", zh: "正常" },
  statusLoading: { en: "Loading…", zh: "加载中…" },
  statusError: { en: "Error", zh: "异常" },
  rank: { en: "Rank", zh: "排名" },
  name: { en: "Name", zh: "名称" },
  marketCap: { en: "Market Cap", zh: "市值" },
  price: { en: "Price", zh: "价格" },
  today: { en: "Today", zh: "今日" },
  price30d: { en: "Price (30 days)", zh: "30天走势" },
  country: { en: "Country", zh: "国家/地区" },
  companiesLabel: { en: "Companies:", zh: "数量：" },
  totalLabel: { en: "total market cap:", zh: "总市值：" },
  emptyTitle: { en: "No results", zh: "没有结果" },
  emptyDesc: { en: "Try changing category or search keywords.", zh: "请尝试切换分类或修改搜索关键词。" },
  loadingTitle: { en: "Loading…", zh: "加载中…" },
  errorTitle: { en: "Failed to load", zh: "加载失败" },
  errorDesc: {
    en: "Remote fetch is unavailable. You can switch back to static data.",
    zh: "远程获取不可用。你可以切回静态数据。",
  },
  retry: { en: "Retry", zh: "重试" },
  switchStatic: { en: "Use static data", zh: "使用静态数据" },
  rowsMeta: { en: (a, b, t) => `${a}-${b} of ${t}`, zh: (a, b, t) => `${a}-${b} / 共 ${t}` },
  updatedAt: { en: (t) => `Updated: ${t}`, zh: (t) => `更新时间：${t}` },
  signInTitle: { en: "Sign in", zh: "登录" },
  signInBody: {
    en: "This is a placeholder entry. Authentication is not implemented in this demo.",
    zh: "这是占位入口。本 Demo 不实现真实账号体系。",
  },
  ok: { en: "OK", zh: "确定" },
};

const CURRENCY = {
  USD: { symbol: "$", rateToUSD: 1 },
  EUR: { symbol: "€", rateToUSD: 0.92 },
  CNY: { symbol: "¥", rateToUSD: 7.2 },
};

function formatMarketCapUSD(valueUSD) {
  const abs = Math.abs(valueUSD);
  if (abs >= 1e12) return `${(valueUSD / 1e12).toFixed(3)} T`;
  if (abs >= 1e9) return `${(valueUSD / 1e9).toFixed(3)} B`;
  if (abs >= 1e6) return `${(valueUSD / 1e6).toFixed(3)} M`;
  return `${valueUSD.toFixed(0)}`;
}

function formatPrice(valueUSD, currencyCode) {
  const info = CURRENCY[currencyCode] || CURRENCY.USD;
  const converted = valueUSD * info.rateToUSD;
  const decimals = converted >= 1000 ? 0 : 2;
  return `${info.symbol}${converted.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatPercent(p) {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

function stableHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeries(key, points = 30) {
  const rnd = mulberry32(stableHash(key));
  let v = 100 + rnd() * 40;
  const arr = [];
  for (let i = 0; i < points; i++) {
    const drift = (rnd() - 0.5) * 6;
    v = Math.max(10, v + drift);
    arr.push(Number(v.toFixed(2)));
  }
  return arr;
}

function sparklineSvg(series, stroke) {
  const w = 160;
  const h = 34;
  if (!series || series.length < 2) {
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"></svg>`;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1e-9, max - min);
  const stepX = w / (series.length - 1);
  const pts = series
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const d = `M ${pts.replaceAll(" ", " L ")}`;
  const axisY = h - 2;
  return `
    <svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
      <path class="axis" d="M 0 ${axisY} L ${w} ${axisY}" />
      <path d="${d}" stroke="${stroke}" />
    </svg>
  `;
}

function countryFlagText(code) {
  if (!code) return "—";
  return code.toUpperCase();
}

function normalizeSearch(s) {
  return (s || "").trim().toLowerCase();
}

function buildStaticData() {
  const rows = [
    { rank: 1, name: "Gold", ticker: "GOLD", category: "precious_metals", marketCapUSD: 30.120e12, priceUSD: 4332, today: -0.21, countryCode: null, countryName: null },
    { rank: 2, name: "NVIDIA", ticker: "NVDA", category: "public_companies", marketCapUSD: 4.540e12, priceUSD: 186.5, today: -0.55, countryCode: "US", countryName: "USA" },
    { rank: 3, name: "Apple", ticker: "AAPL", category: "public_companies", marketCapUSD: 4.034e12, priceUSD: 271.86, today: -0.43, countryCode: "US", countryName: "USA" },
    { rank: 4, name: "Silver", ticker: "SILVER", category: "precious_metals", marketCapUSD: 3.995e12, priceUSD: 70.98, today: 0.53, countryCode: null, countryName: null },
    { rank: 5, name: "Alphabet (Google)", ticker: "GOOG", category: "public_companies", marketCapUSD: 3.788e12, priceUSD: 313.8, today: -0.28, countryCode: "US", countryName: "USA" },
    { rank: 6, name: "Microsoft", ticker: "MSFT", category: "public_companies", marketCapUSD: 3.594e12, priceUSD: 483.62, today: -0.8, countryCode: "US", countryName: "USA" },
    { rank: 7, name: "Amazon", ticker: "AMZN", category: "public_companies", marketCapUSD: 2.467e12, priceUSD: 230.82, today: -0.74, countryCode: "US", countryName: "USA" },
    { rank: 8, name: "Bitcoin", ticker: "BTC", category: "cryptocurrencies", marketCapUSD: 1.755e12, priceUSD: 87873, today: 0.09, countryCode: null, countryName: null },
    { rank: 9, name: "Meta Platforms (Facebook)", ticker: "META", category: "public_companies", marketCapUSD: 1.663e12, priceUSD: 660.09, today: -0.89, countryCode: "US", countryName: "USA" },
    { rank: 10, name: "Tesla", ticker: "TSLA", category: "public_companies", marketCapUSD: 1.640e12, priceUSD: 346.1, today: -1.07, countryCode: "US", countryName: "USA" },
    { rank: 11, name: "TSMC", ticker: "TSM", category: "public_companies", marketCapUSD: 1.576e12, priceUSD: 303.89, today: 1.44, countryCode: "TW", countryName: "Taiwan" },
    { rank: 12, name: "Saudi Aramco", ticker: "2222.SR", category: "public_companies", marketCapUSD: 1.539e12, priceUSD: 6.37, today: 0.21, countryCode: "SA", countryName: "S. Arabia" },
    { rank: 13, name: "Berkshire Hathaway", ticker: "BRK.A", category: "public_companies", marketCapUSD: 1.495e12, priceUSD: 449.72, today: -1.0, countryCode: "US", countryName: "USA" },
    { rank: 14, name: "Broadcom", ticker: "AVGO", category: "public_companies", marketCapUSD: 1.084e12, priceUSD: 502.65, today: -0.21, countryCode: "US", countryName: "USA" },
    { rank: 15, name: "Eli Lilly", ticker: "LLY", category: "public_companies", marketCapUSD: 963.40e9, priceUSD: 1075, today: -0.47, countryCode: "US", countryName: "USA" },
    { rank: 16, name: "JPMorgan Chase", ticker: "JPM", category: "public_companies", marketCapUSD: 888.25e9, priceUSD: 111.41, today: -0.46, countryCode: "US", countryName: "USA" },
    { rank: 17, name: "Visa", ticker: "V", category: "public_companies", marketCapUSD: 886.02e9, priceUSD: 322.22, today: -0.37, countryCode: "US", countryName: "USA" },
    { rank: 18, name: "Walmart", ticker: "WMT", category: "public_companies", marketCapUSD: 821.99e9, priceUSD: 627.13, today: -0.73, countryCode: "US", countryName: "USA" },
    { rank: 19, name: "Exxon Mobil", ticker: "XOM", category: "public_companies", marketCapUSD: 760.31e9, priceUSD: 684.94, today: -0.72, countryCode: "US", countryName: "USA" },
    { rank: 20, name: "UnitedHealth", ticker: "UNH", category: "public_companies", marketCapUSD: 707.78e9, priceUSD: 681.92, today: -0.74, countryCode: "US", countryName: "USA" },
    { rank: 21, name: "Tencent", ticker: "0700.HK", category: "public_companies", marketCapUSD: 691.76e9, priceUSD: 76.55, today: -0.65, countryCode: "CN", countryName: "China" },
    { rank: 22, name: "Mastercard", ticker: "MA", category: "public_companies", marketCapUSD: 676.83e9, priceUSD: 350.71, today: -0.82, countryCode: "US", countryName: "USA" },
    { rank: 23, name: "Johnson & Johnson", ticker: "JNJ", category: "public_companies", marketCapUSD: 565.59e9, priceUSD: 335.27, today: -0.76, countryCode: "US", countryName: "USA" },
  ];

  const more = [
    ["SPDR S&P 500 ETF", "SPY", "etfs", 520e9, 515.2, 0.14, "US", "USA"],
    ["Invesco QQQ", "QQQ", "etfs", 290e9, 435.12, -0.08, "US", "USA"],
    ["Vanguard Total Stock Market", "VTI", "etfs", 400e9, 265.4, 0.06, "US", "USA"],
    ["Ethereum", "ETH", "cryptocurrencies", 420e9, 3450, -0.32, null, null],
    ["Tether", "USDT", "cryptocurrencies", 110e9, 1.0, 0.0, null, null],
    ["BNB", "BNB", "cryptocurrencies", 92e9, 640, 0.22, null, null],
    ["Solana", "SOL", "cryptocurrencies", 78e9, 168.4, -0.91, null, null],
    ["Platinum", "PLAT", "precious_metals", 250e9, 980.1, 0.17, null, null],
    ["Palladium", "PALL", "precious_metals", 160e9, 1025.5, -0.44, null, null],
    ["BHP", "BHP", "public_companies", 200e9, 55.2, 0.11, "AU", "Australia"],
    ["Toyota", "TM", "public_companies", 330e9, 190.8, -0.12, "JP", "Japan"],
    ["Samsung Electronics", "005930.KS", "public_companies", 360e9, 62.1, 0.09, "KR", "Korea"],
    ["Novo Nordisk", "NVO", "public_companies", 520e9, 128.6, 0.23, "DK", "Denmark"],
    ["Nestlé", "NESN.SW", "public_companies", 320e9, 116.3, -0.18, "CH", "Switzerland"],
    ["LVMH", "MC.PA", "public_companies", 420e9, 745.5, 0.05, "FR", "France"],
    ["Tencent Music", "TME", "public_companies", 11e9, 12.4, -0.31, "CN", "China"],
    ["iShares Core S&P 500", "IVV", "etfs", 490e9, 520.2, 0.12, "US", "USA"],
    ["iShares MSCI EAFE", "EFA", "etfs", 55e9, 79.5, -0.03, "US", "USA"],
    ["Vanguard FTSE Emerging Markets", "VWO", "etfs", 85e9, 43.2, 0.07, "US", "USA"],
    ["Cardano", "ADA", "cryptocurrencies", 19e9, 0.58, 1.21, null, null],
    ["Dogecoin", "DOGE", "cryptocurrencies", 14e9, 0.16, -0.44, null, null],
    ["Polygon", "POL", "cryptocurrencies", 7e9, 0.92, 0.48, null, null],
    ["Copper", "COPPER", "precious_metals", 210e9, 4.2, 0.31, null, null],
    ["Aluminum", "AL", "precious_metals", 170e9, 2.1, -0.09, null, null],
  ];

  let nextRank = rows.length + 1;
  for (const item of more) {
    rows.push({
      rank: nextRank++,
      name: item[0],
      ticker: item[1],
      category: item[2],
      marketCapUSD: item[3],
      priceUSD: item[4],
      today: item[5],
      countryCode: item[6],
      countryName: item[7],
    });
  }

  return rows.map((r) => {
    const series = createSeries(`${r.name}|${r.ticker}|${r.category}`, 30);
    const delta = series[series.length - 1] - series[0];
    const sparkColor = delta >= 0 ? "var(--positive)" : "var(--negative)";
    return {
      ...r,
      todayChangePercent: r.today,
      price30dSeries: series,
      sparkColor,
      logoText: (r.ticker || r.name || "?").slice(0, 2).toUpperCase(),
      id: `${r.ticker || r.name}`.toLowerCase().replaceAll(/\s+/g, "-"),
    };
  });
}

const state = {
  language: "en",
  currency: "USD",
  theme: "light",
  category: "all",
  search: "",
  sortKey: "marketCapUSD",
  sortDir: "desc",
  page: 1,
  pageSize: 20,
  dataSource: "static",
  items: [],
  loading: false,
  error: null,
  updatedAtISO: null,
};

const els = {
  languageSelect: document.getElementById("languageSelect"),
  currencySelect: document.getElementById("currencySelect"),
  themeToggle: document.getElementById("themeToggle"),
  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  dataSourceSelect: document.getElementById("dataSourceSelect"),
  refreshBtn: document.getElementById("refreshBtn"),
  updatedAt: document.getElementById("updatedAt"),
  dataCenterTitle: document.getElementById("dataCenterTitle"),
  dcApiText: document.getElementById("dcApiText"),
  dcSourceValue: document.getElementById("dcSourceValue"),
  dcStatusValue: document.getElementById("dcStatusValue"),
  dcCountValue: document.getElementById("dcCountValue"),
  dcErrorValue: document.getElementById("dcErrorValue"),
  summaryCompaniesLabel: document.getElementById("summaryCompaniesLabel"),
  summaryCompaniesValue: document.getElementById("summaryCompaniesValue"),
  summaryTotalLabel: document.getElementById("summaryTotalLabel"),
  summaryTotalValue: document.getElementById("summaryTotalValue"),
  pageTitle: document.getElementById("pageTitle"),
  pills: Array.from(document.querySelectorAll(".pill")),
  table: document.getElementById("assetsTable"),
  tbody: document.getElementById("assetsTbody"),
  tableState: document.getElementById("tableState"),
  stateTitle: document.getElementById("stateTitle"),
  stateDesc: document.getElementById("stateDesc"),
  stateActions: document.getElementById("stateActions"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),
  pagerMeta: document.getElementById("pagerMeta"),
  pagerButtons: document.getElementById("pagerButtons"),
  signInBtn: document.getElementById("signInBtn"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
  modalCloseBtn: document.getElementById("modalCloseBtn"),
  modalOkBtn: document.getElementById("modalOkBtn"),
};

function t(key, ...args) {
  const v = I18N[key];
  if (!v) return "";
  const val = v[state.language] ?? v.en;
  if (typeof val === "function") return val(...args);
  return val;
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
}

function openModal(title, body) {
  els.modalTitle.textContent = title;
  els.modalBody.textContent = body;
  els.modal.hidden = false;
}

function closeModal() {
  els.modal.hidden = true;
}

function updateTexts() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  document.title = t("pageTitle");
  els.pageTitle.textContent = t("pageTitle");
  els.summaryCompaniesLabel.textContent = t("companiesLabel");
  els.summaryTotalLabel.textContent = t("totalLabel");
  if (els.dataCenterTitle) els.dataCenterTitle.textContent = t("dataCenterTitle");
  if (els.dcApiText) els.dcApiText.textContent = t("dataCenterApiText");
  els.signInBtn.textContent = state.language === "zh" ? "登录" : "Sign In";
  els.refreshBtn.textContent = state.language === "zh" ? "刷新" : "Refresh";
  els.modalOkBtn.textContent = t("ok");
  const headers = Array.from(els.table.querySelectorAll("thead th"));
  const map = {
    rank: t("rank"),
    name: t("name"),
    marketCap: t("marketCap"),
    price: t("price"),
    today: t("today"),
    spark: t("price30d"),
    country: t("country"),
  };
  for (const th of headers) {
    const k = th.getAttribute("data-sort");
    const txt = th.querySelector("span");
    if (!txt) continue;
    if (k === "rank") txt.textContent = map.rank;
    else if (k === "name") txt.textContent = map.name;
    else if (k === "marketCap") txt.textContent = map.marketCap;
    else if (k === "price") txt.textContent = map.price;
    else if (k === "todayChangePercent") txt.textContent = map.today;
  }
  const thSpark = els.table.querySelector(".th--spark span");
  if (thSpark) thSpark.textContent = map.spark;
  const thCountry = els.table.querySelector(".th--country span");
  if (thCountry) thCountry.textContent = map.country;

  for (const pill of els.pills) {
    const cat = pill.dataset.category;
    pill.textContent = (CATEGORY_LABELS[cat]?.[state.language] ?? CATEGORY_LABELS[cat]?.en) || cat;
  }
  const placeholder = state.language === "zh" ? "公司名称，代码..." : "Company name, ticker...";
  els.searchInput.placeholder = placeholder;
}

function updateDataCenter() {
  if (!els.dcSourceValue || !els.dcStatusValue || !els.dcCountValue || !els.dcErrorValue) return;

  els.dcSourceValue.textContent = state.dataSource === "remote" ? t("dataSourceRemote") : t("dataSourceStatic");
  if (state.error) els.dcStatusValue.textContent = t("statusError");
  else els.dcStatusValue.textContent = t("statusOk");

  els.dcCountValue.textContent = `${(state.items || []).length}`;
  els.dcErrorValue.textContent = state.error ? String(state.error?.message || state.error) : "—";
}

function computeSummary(items) {
  const companies = items.length;
  const total = items.reduce((sum, it) => sum + (it.marketCapUSD || 0), 0);
  return { companies, totalUSD: total };
}

function applyFilters(items) {
  const category = state.category;
  const q = normalizeSearch(state.search);

  let out = items;
  if (category !== "all") out = out.filter((x) => x.category === category);
  if (q) {
    out = out.filter((x) => {
      const name = (x.name || "").toLowerCase();
      const ticker = (x.ticker || "").toLowerCase();
      return name.includes(q) || ticker.includes(q);
    });
  }
  return out;
}

function applySort(items) {
  const key = state.sortKey;
  const dir = state.sortDir;
  const factor = dir === "asc" ? 1 : -1;
  const copy = items.slice();
  copy.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    const as = String(av ?? "");
    const bs = String(bv ?? "");
    return as.localeCompare(bs) * factor;
  });
  return copy;
}

function paginate(items) {
  const total = items.length;
  const pageSize = state.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, state.page), pageCount);
  const start = (page - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  return { page, pageCount, start, end, slice: items.slice(start, end) };
}

function setTableSortIndicators() {
  const ths = Array.from(els.table.querySelectorAll("thead th[data-sort]"));
  for (const th of ths) {
    th.removeAttribute("data-sort-dir");
    const k = th.getAttribute("data-sort");
    if (!k) continue;
    const keyMap = {
      rank: "rank",
      name: "name",
      marketCap: "marketCapUSD",
      price: "priceUSD",
      todayChangePercent: "todayChangePercent",
    };
    if (keyMap[k] === state.sortKey) th.setAttribute("data-sort-dir", state.sortDir);
  }
}

function renderTable() {
  updateTexts();
  updateDataCenter();
  setTableSortIndicators();

  hideState();

  const items = state.items || [];
  const filtered = applyFilters(items);
  const sorted = applySort(filtered);
  const { page, pageCount, start, end, slice } = paginate(sorted);
  state.page = page;

  if (filtered.length === 0) {
    const msg = state.error ? t("errorTitle") : t("emptyTitle");
    const desc = state.error ? t("errorDesc") : t("emptyDesc");
    els.tbody.innerHTML = `<tr><td class="empty-cell" colspan="7">${escapeHtml(msg)}${desc ? `<div class="muted" style="margin-top:6px">${escapeHtml(desc)}</div>` : ""}</td></tr>`;
  } else {
    els.tbody.innerHTML = slice
      .map((x) => {
        const rowCls = [
          x.category === "precious_metals" ? "is-metal" : "",
          x.category === "cryptocurrencies" ? "is-crypto" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const changeClass = x.todayChangePercent > 0 ? "is-pos" : x.todayChangePercent < 0 ? "is-neg" : "is-zero";
        const countryText = x.countryName || "—";
        const flagText = countryFlagText(x.countryCode);
        const spark = sparklineSvg(x.price30dSeries, x.sparkColor);

        const logo = x.logoUrl
          ? `<div class="logo"><img src="${escapeHtml(x.logoUrl)}" alt="" loading="lazy" /></div>`
          : `<div class="logo" aria-hidden="true">${escapeHtml(x.logoText || "")}</div>`;

        return `
          <tr class="${rowCls}" data-id="${escapeHtml(x.id)}" role="row" tabindex="0">
            <td class="cell-rank">${x.rank}</td>
            <td>
              <div class="name">
                ${logo}
                <div class="name__text">
                  <div class="name__title">${escapeHtml(x.name)}</div>
                  <div class="name__sub">${escapeHtml(x.ticker || "")}</div>
                </div>
              </div>
            </td>
            <td class="cell-num">${escapeHtml(formatMarketCapUSD(x.marketCapUSD))}</td>
            <td class="cell-num">${escapeHtml(formatPrice(x.priceUSD, state.currency))}</td>
            <td class="cell-num">
              <span class="change ${changeClass}">${escapeHtml(formatPercent(x.todayChangePercent))}</span>
            </td>
            <td class="cell-spark">${spark}</td>
            <td class="cell-country">
              <div class="country">
                <span class="flag" aria-hidden="true">${escapeHtml(flagText)}</span>
                <span>${escapeHtml(countryText)}</span>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  const meta = t("rowsMeta", start + 1, end, filtered.length);
  els.pagerMeta.textContent = filtered.length ? meta : "";
  renderPagerButtons(page, pageCount);

  const summary = computeSummary(items);
  els.summaryCompaniesValue.textContent = summary.companies.toLocaleString();
  els.summaryTotalValue.textContent = formatMarketCapUSD(summary.totalUSD);

  if (state.updatedAtISO) {
    const d = new Date(state.updatedAtISO);
    const text = d.toLocaleString();
    els.updatedAt.textContent = t("updatedAt", text);
  } else {
    els.updatedAt.textContent = "";
  }

  syncUrl();
}

function renderPagerButtons(page, pageCount) {
  const btns = [];
  const mkBtn = (label, nextPage, active = false, disabled = false) => {
    return `<button class="page-btn ${active ? "is-active" : ""}" type="button" data-page="${nextPage}" ${
      disabled ? "disabled" : ""
    }>${label}</button>`;
  };

  btns.push(mkBtn("«", 1, false, page === 1));
  btns.push(mkBtn("‹", page - 1, false, page === 1));

  const windowSize = 5;
  const start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pageCount, start + windowSize - 1);
  const start2 = Math.max(1, end - windowSize + 1);

  if (start2 > 1) btns.push(`<span class="pager__meta">…</span>`);
  for (let p = start2; p <= end; p++) btns.push(mkBtn(String(p), p, p === page, false));
  if (end < pageCount) btns.push(`<span class="pager__meta">…</span>`);

  btns.push(mkBtn("›", page + 1, false, page === pageCount));
  btns.push(mkBtn("»", pageCount, false, page === pageCount));

  els.pagerButtons.innerHTML = btns.join("");
}

function showState(kind) {
  if (kind === "loading") {
    hideState();
    return;
  }
  els.tableState.hidden = false;
  els.stateActions.innerHTML = "";
  if (kind === "error") {
    els.stateTitle.textContent = t("errorTitle");
    els.stateDesc.textContent = t("errorDesc");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn--small";
    retry.textContent = t("retry");
    retry.addEventListener("click", () => loadData());
    const toStatic = document.createElement("button");
    toStatic.type = "button";
    toStatic.className = "btn btn--small";
    toStatic.textContent = t("switchStatic");
    toStatic.addEventListener("click", () => {
      state.dataSource = "static";
      els.dataSourceSelect.value = "static";
      state.error = null;
      loadData();
    });
    els.stateActions.appendChild(retry);
    els.stateActions.appendChild(toStatic);
  } else if (kind === "empty") {
    els.stateTitle.textContent = t("emptyTitle");
    els.stateDesc.textContent = t("emptyDesc");
  }
}

function hideState() {
  els.tableState.hidden = true;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchRemoteData() {
  const url = new URL(location.origin + "/api/assets-by-market-cap");
  url.searchParams.set("category", state.category);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data?.items) ? data.items : [];
  const mapped = list.map((x, idx) => {
    const series = Array.isArray(x.price30dSeries) ? x.price30dSeries : createSeries(`${x.name}|${x.ticker}|remote|${idx}`, 30);
    const delta = series[series.length - 1] - series[0];
    const sparkColor = delta >= 0 ? "var(--positive)" : "var(--negative)";
    return {
      rank: Number(x.rank ?? idx + 1),
      name: String(x.name ?? ""),
      ticker: x.ticker == null ? "" : String(x.ticker),
      category: String(x.category ?? "other"),
      marketCapUSD: Number(x.marketCapUSD ?? x.marketCap ?? 0),
      priceUSD: Number(x.priceUSD ?? x.price ?? 0),
      todayChangePercent: Number(x.todayChangePercent ?? 0),
      price30dSeries: series,
      countryCode: x.countryCode ? String(x.countryCode) : null,
      countryName: x.countryName ? String(x.countryName) : null,
      logoUrl: x.logoUrl ? String(x.logoUrl) : null,
      sparkColor,
      logoText: (x.ticker || x.name || "?").slice(0, 2).toUpperCase(),
      id: `${x.ticker || x.name || idx}`.toLowerCase().replaceAll(/\s+/g, "-"),
    };
  });
  return { items: mapped, updatedAtISO: data?.updatedAtISO || new Date().toISOString() };
}

async function loadData() {
  state.loading = true;
  state.error = null;
  hideState();
  renderTable();

  try {
    if (state.dataSource === "remote") {
      const remote = await fetchRemoteData();
      state.items = remote.items;
      state.updatedAtISO = remote.updatedAtISO;
    } else {
      state.items = buildStaticData();
      state.updatedAtISO = null;
    }
    state.loading = false;
    state.error = null;
    hideState();
    renderTable();
  } catch (e) {
    state.loading = false;
    state.error = e;
    showState("error");
    renderTable();
  }

  els.refreshBtn.disabled = state.dataSource !== "remote";
}

function syncPills() {
  for (const pill of els.pills) {
    const isActive = pill.dataset.category === state.category;
    pill.classList.toggle("is-active", isActive);
    pill.setAttribute("aria-selected", isActive ? "true" : "false");
  }
}

function bindEvents() {
  els.languageSelect.addEventListener("change", () => {
    state.language = els.languageSelect.value;
    updateTexts();
    renderTable();
  });

  els.currencySelect.addEventListener("change", () => {
    state.currency = els.currencySelect.value;
    renderTable();
  });

  els.themeToggle.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
    renderTable();
  });

  els.searchInput.addEventListener("input", () => {
    state.search = els.searchInput.value;
    state.page = 1;
    renderTable();
  });

  els.clearSearchBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    state.search = "";
    state.page = 1;
    renderTable();
  });

  for (const pill of els.pills) {
    pill.addEventListener("click", () => {
      state.category = pill.dataset.category;
      state.page = 1;
      syncPills();
      renderTable();
    });
  }

  els.table.querySelectorAll("thead th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const k = th.getAttribute("data-sort");
      const keyMap = {
        rank: "rank",
        name: "name",
        marketCap: "marketCapUSD",
        price: "priceUSD",
        todayChangePercent: "todayChangePercent",
      };
      const mapped = keyMap[k] || "marketCapUSD";
      if (state.sortKey === mapped) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      else {
        state.sortKey = mapped;
        state.sortDir = mapped === "name" ? "asc" : "desc";
      }
      state.page = 1;
      renderTable();
    });
  });

  els.pagerButtons.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const p = target.getAttribute("data-page");
    if (!p) return;
    const next = Number(p);
    if (!Number.isFinite(next)) return;
    state.page = next;
    renderTable();
  });

  els.pageSizeSelect.addEventListener("change", () => {
    state.pageSize = Number(els.pageSizeSelect.value);
    state.page = 1;
    renderTable();
  });

  els.dataSourceSelect.addEventListener("change", () => {
    state.dataSource = els.dataSourceSelect.value;
    loadData();
  });

  els.refreshBtn.addEventListener("click", () => loadData());

  els.signInBtn.addEventListener("click", () => openModal(t("signInTitle"), t("signInBody")));
  els.modalCloseBtn.addEventListener("click", () => closeModal());
  els.modalOkBtn.addEventListener("click", () => closeModal());
  els.modal.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.close === "true") closeModal();
  });

  els.tbody.addEventListener("click", (e) => {
    const tr = (e.target instanceof HTMLElement && e.target.closest("tr")) || null;
    if (!tr) return;
    const id = tr.getAttribute("data-id");
    const item = state.items.find((x) => x.id === id);
    if (!item) return;
    const title = item.name;
    const body = `${item.ticker ? `${item.ticker} · ` : ""}${(CATEGORY_LABELS[item.category]?.[state.language] ?? item.category) || ""}`;
    openModal(title, body);
  });

  els.tbody.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const tr = e.target instanceof HTMLElement ? e.target.closest("tr") : null;
    if (!tr) return;
    tr.click();
  });
}

function initFromUrl() {
  const url = new URL(location.href);
  const cat = url.searchParams.get("category");
  const page = url.searchParams.get("page");
  if (cat && (cat in CATEGORY_LABELS)) state.category = cat;
  if (page && Number.isFinite(Number(page))) state.page = Math.max(1, Number(page));
  syncPills();
}

function syncUrl() {
  const url = new URL(location.href);
  if (state.category && state.category !== "all") url.searchParams.set("category", state.category);
  else url.searchParams.delete("category");

  if (state.page && state.page !== 1) url.searchParams.set("page", String(state.page));
  else url.searchParams.delete("page");

  const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
  const current = location.pathname + location.search;
  if (next !== current) history.replaceState({}, "", next);
}

function init() {
  setTheme("light");
  state.language = els.languageSelect.value;
  state.currency = els.currencySelect.value;
  state.dataSource = els.dataSourceSelect.value;
  initFromUrl();
  bindEvents();
  loadData();
}

init();
