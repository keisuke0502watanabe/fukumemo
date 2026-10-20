"""PWA のファイルを 1 枚の HTML にまとめ、Claude の Artifact として公開できる形にする。

使い方: python3 build_artifact.py  →  dist/fukumemo.html
Artifact 側が <!doctype>/<head>/<body> を付けるので、本文だけを書き出す。
Service Worker・manifest は Artifact では使えないので含めない。
"""
from pathlib import Path
import re

ROOT = Path(__file__).parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)

for name in ("data.js", "app.js"):
    js = (ROOT / name).read_text(encoding="utf-8")
    body = body.replace(f'<script src="{name}"></script>', f"<script>\n{js}</script>")

css = (ROOT / "styles.css").read_text(encoding="utf-8")
head = (
    "<title>フクメモ</title>\n"
    '<meta name="claude:viewport-fit-sides" content="cover">\n'
    '<meta name="description" content="福岡大学生向けの非公式リンク集・時間割メモ（福岡大学非公認）">\n'
    f"<style>\n{css}</style>\n"
)

out = ROOT / "dist" / "fukumemo.html"
out.parent.mkdir(exist_ok=True)
out.write_text(head + body, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size:,} bytes)")
