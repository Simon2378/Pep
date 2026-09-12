import os
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://pepticorebio.com"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backup")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

missing_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "missing_assets.txt")
with open(missing_file, "r", encoding="utf-8") as f:
    refs = [line.strip() for line in f if line.strip()]

def download(ref):
    clean = ref.split("?")[0]
    rel = clean.lstrip("/")
    url = urllib.parse.urljoin(BASE + "/", clean.lstrip("/"))
    local_path = os.path.join(OUT, rel.replace("/", os.sep))
    if os.path.exists(local_path):
        return (ref, "skip-exists", 0)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            with open(local_path, "wb") as out:
                out.write(data)
            return (ref, "ok", len(data))
        except Exception as e:
            last_err = str(e)
    return (ref, f"FAILED: {last_err}", 0)

ok = 0
failed = []
with ThreadPoolExecutor(max_workers=8) as ex:
    futures = {ex.submit(download, r): r for r in refs}
    for i, fut in enumerate(as_completed(futures), 1):
        ref, status, size = fut.result()
        if status == "ok":
            ok += 1
            print(f"[{i}/{len(refs)}] OK {ref} ({size} bytes)")
        elif status.startswith("FAILED"):
            failed.append((ref, status))
            print(f"[{i}/{len(refs)}] {status} {ref}")
        else:
            print(f"[{i}/{len(refs)}] SKIP {ref}")

print("\n=== SUMMARY ===")
print(f"Downloaded: {ok}")
print(f"Failed: {len(failed)}")
for ref, status in failed:
    print(f"  {ref}: {status}")
