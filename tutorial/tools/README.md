# PDF の作り直し方
```bash
cd tools && npm init -y && npm i marked@14 mermaid@11
node build-pdf.mjs   # → tools/教材.html（mermaid と CSS 入り）
google-chrome --headless=new --no-pdf-header-footer --allow-file-access-from-files \
  --virtual-time-budget=20000 --print-to-pdf=../教材.pdf "file://$PWD/教材.html"
```
フォントは Noto Sans CJK JP / Noto Sans Mono CJK JP（なければ `sudo apt install fonts-noto-cjk`）。
