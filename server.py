import datetime
import json
import re
import ssl
import time
import urllib.parse
import urllib.request
from html import unescape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


TARGET_URL = "https://companiesmarketcap.com/assets-by-market-cap/"
BASE_URL = "https://companiesmarketcap.com"
DEFAULT_PORT = 8000
CACHE_TTL_SECONDS = 15 * 60

_cache = {"ts": 0.0, "items": None, "updatedAtISO": None, "error": None}


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "")


def _parse_spark_series(path_d: str):
    if not path_d:
        return []
    ys = []
    for _, x, y in re.findall(r"([ML])\s*([0-9.]+)\s*,\s*([0-9.]+)", path_d):
        try:
            ys.append(float(y))
        except ValueError:
            continue
    if len(ys) < 2:
        return []
    max_y = max(ys)
    inv = [max_y - y for y in ys]
    min_v = min(inv)
    max_v = max(inv)
    rng = max(max_v - min_v, 1e-9)
    return [round(50 + (v - min_v) / rng * 100, 2) for v in inv]


def _detect_category(tr_class: str) -> str:
    c = tr_class or ""
    if "precious-metals-outliner" in c:
        return "precious_metals"
    if "crypto-outliner" in c:
        return "cryptocurrencies"
    if "etf-outliner" in c:
        return "etfs"
    return "public_companies"


def _fetch_html(url: str) -> str:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, context=ctx, timeout=25) as resp:
        raw = resp.read()
    return raw.decode("utf-8", "ignore")


def _parse_assets(html: str, limit: int):
    m = re.search(r"<tbody>([\s\S]*?)</tbody>", html, flags=re.IGNORECASE)
    if not m:
        return []
    tbody = m.group(1)
    rows = re.findall(r"<tr[^>]*>[\s\S]*?</tr>", tbody, flags=re.IGNORECASE)
    items = []
    for row_html in rows:
        if len(items) >= limit:
            break

        tr_class = ""
        m_class = re.search(r'<tr[^>]*\sclass="([^"]+)"', row_html, flags=re.IGNORECASE)
        if m_class:
            tr_class = unescape(m_class.group(1))

        category = _detect_category(tr_class)

        m_rank = re.search(r'class="rank-td[^"]*"\s+data-sort="([0-9]+)"', row_html, flags=re.IGNORECASE)
        if not m_rank:
            continue
        rank = int(m_rank.group(1))

        m_name = re.search(r'class="company-name"\s*>\s*([^<]+)\s*<', row_html, flags=re.IGNORECASE)
        name = unescape(m_name.group(1).strip()) if m_name else ""

        m_code = re.search(r'class="company-code"[^>]*>\s*([\s\S]*?)\s*</div>', row_html, flags=re.IGNORECASE)
        ticker = ""
        if m_code:
            ticker = _strip_tags(unescape(m_code.group(1))).strip()

        m_logo = re.search(r'<img[^>]*class="company-logo"[^>]*\ssrc="([^"]+)"', row_html, flags=re.IGNORECASE)
        logo_url = None
        if m_logo:
            src = unescape(m_logo.group(1))
            logo_url = src if src.startswith("http") else f"{BASE_URL}{src}"

        m_href = re.search(r'<a\s+href="([^"]+)"', row_html, flags=re.IGNORECASE)
        detail_url = None
        if m_href:
            href = unescape(m_href.group(1))
            detail_url = href if href.startswith("http") else f"{BASE_URL}{href}"

        td_right_sorts = re.findall(r'<td\s+class="td-right"[^>]*data-sort="([0-9]+)"[^>]*>', row_html, flags=re.IGNORECASE)
        if len(td_right_sorts) < 2:
            continue
        market_cap_usd = int(td_right_sorts[0])
        price_usd = int(td_right_sorts[1]) / 100.0

        m_today = re.search(r'class="rh-sm"[^>]*data-sort="(-?[0-9]+)"', row_html, flags=re.IGNORECASE)
        today_change = (int(m_today.group(1)) / 100.0) if m_today else 0.0

        m_path = re.search(r"<path[^>]*\sd=\"([^\"]+)\"", row_html, flags=re.IGNORECASE)
        path_d = unescape(m_path.group(1)) if m_path else ""
        series = _parse_spark_series(path_d)

        m_country = re.search(r'class="responsive-hidden"\s*>\s*([^<]*)\s*<', row_html, flags=re.IGNORECASE)
        country_name = unescape(m_country.group(1).strip()) if m_country and m_country.group(1).strip() else None

        items.append(
            {
                "rank": rank,
                "name": name,
                "ticker": ticker or None,
                "category": category,
                "marketCapUSD": market_cap_usd,
                "priceUSD": price_usd,
                "todayChangePercent": today_change,
                "price30dSeries": series,
                "countryCode": None,
                "countryName": country_name,
                "logoUrl": logo_url,
                "detailUrl": detail_url,
            }
        )
    return items


def _get_cached_or_fetch(limit: int):
    now = time.time()
    if _cache["items"] is not None and (now - _cache["ts"]) < CACHE_TTL_SECONDS:
        return _cache["items"][:limit], _cache["updatedAtISO"], _cache["error"]

    try:
        html = _fetch_html(TARGET_URL)
        items = _parse_assets(html, limit=200)
        updated = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        _cache["ts"] = now
        _cache["items"] = items
        _cache["updatedAtISO"] = updated
        _cache["error"] = None
        return items[:limit], updated, None
    except Exception as e:
        _cache["ts"] = now
        _cache["items"] = None
        _cache["updatedAtISO"] = None
        _cache["error"] = str(e)
        return [], None, str(e)


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/assets-by-market-cap":
            qs = urllib.parse.parse_qs(parsed.query)
            limit = 100
            if "limit" in qs:
                try:
                    limit = max(1, min(500, int(qs["limit"][0])))
                except Exception:
                    limit = 100

            items, updated, err = _get_cached_or_fetch(limit=limit)
            payload = {"updatedAtISO": updated, "items": items, "error": err, "targetUrl": TARGET_URL}
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200 if not err else 502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        return super().do_GET()


def main():
    port = DEFAULT_PORT
    import sys

    if len(sys.argv) >= 2:
        try:
            port = int(sys.argv[1])
        except Exception:
            port = DEFAULT_PORT

    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Serving on http://localhost:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
