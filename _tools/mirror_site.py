import os
import re
import sys
import time
import urllib.request
import urllib.parse
import urllib.error

BASE = "https://pepticorebio.com"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backup")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

visited_pages = set()
downloaded_assets = set()
failed = []

def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            return data
    except Exception as e:
        failed.append((url, str(e)))
        print(f"  FAILED: {url} -> {e}")
        return None

def local_path_for_page(url):
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    if path == "" or path == "/":
        return os.path.join(OUT, "index.html")
    path = path.strip("/")
    return os.path.join(OUT, path, "index.html")

def local_path_for_asset(url):
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.lstrip("/")
    if not path:
        return None
    return os.path.join(OUT, "_assets", path)

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)

def extract_asset_urls(html, page_url):
    urls = set()
    # src="..." and href="..." for css/js/img, and url(...) in inline styles
    for m in re.finditer(r'(?:src|href)=["\']([^"\']+)["\']', html):
        urls.add(m.group(1))
    for m in re.finditer(r'url\(([^)]+)\)', html):
        u = m.group(1).strip('\'" ')
        urls.add(u)
    # Next.js / common JSON asset references
    for m in re.finditer(r'["\'](/_next/[^"\']+|/assets/[^"\']+|/images/[^"\']+|/static/[^"\']+)["\']', html):
        urls.add(m.group(1))
    resolved = set()
    for u in urls:
        if u.startswith("data:") or u.startswith("mailto:") or u.startswith("tel:") or u.startswith("javascript:"):
            continue
        full = urllib.parse.urljoin(page_url, u)
        p = urllib.parse.urlparse(full)
        if p.netloc and p.netloc != urllib.parse.urlparse(BASE).netloc:
            continue  # skip external domains (fonts CDNs etc handled separately if needed)
        # only keep things that look like assets (have a file extension) or _next paths
        if re.search(r'\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|mp4|webm|pdf)(\?.*)?$', p.path, re.I) or "/_next/" in p.path:
            resolved.add(full.split("#")[0])
    return resolved

def download_asset(url):
    if url in downloaded_assets:
        return
    downloaded_assets.add(url)
    path = local_path_for_asset(url)
    if path is None:
        return
    if os.path.exists(path):
        return
    print(f"  asset: {url}")
    data = fetch(url)
    if data is not None:
        save(path, data)

def crawl_page(url):
    if url in visited_pages:
        return
    visited_pages.add(url)
    print(f"page: {url}")
    data = fetch(url)
    if data is None:
        return
    path = local_path_for_page(url)
    save(path, data)
    try:
        html = data.decode("utf-8", errors="ignore")
    except Exception:
        return
    for asset_url in extract_asset_urls(html, url):
        download_asset(asset_url)
        time.sleep(0.05)

def main():
    sitemap_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sitemap_urls.txt")
    with open(sitemap_file, "r", encoding="utf-8") as f:
        urls = [line.strip() for line in f if line.strip()]

    # also grab robots.txt and sitemap.xml themselves
    for extra in ["/robots.txt", "/sitemap.xml", "/favicon.ico"]:
        full = BASE + extra
        data = fetch(full)
        if data is not None:
            p = local_path_for_asset(full) if "." in extra.split("/")[-1] else None
            if p:
                save(p, data)

    for url in urls:
        crawl_page(url)
        time.sleep(0.1)

    print("\n\n=== SUMMARY ===")
    print(f"Pages visited: {len(visited_pages)}")
    print(f"Assets downloaded: {len(downloaded_assets)}")
    print(f"Failures: {len(failed)}")
    if failed:
        for u, e in failed:
            print(f"  {u}: {e}")

if __name__ == "__main__":
    main()
