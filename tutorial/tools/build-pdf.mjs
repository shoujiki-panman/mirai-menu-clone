import fs from "node:fs";
import { marked } from "marked";
const src = fs.readFileSync("/workspace/mirai-menu-tutorial/教材.md", "utf8");
const renderer = new marked.Renderer();
const origCode = renderer.code.bind(renderer);
renderer.code = (tok) => tok.lang === "mermaid" ? `<pre class="mermaid">${tok.text.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>` : origCode(tok);
const body = marked.parse(src, { renderer, gfm: true });
const mermaid = fs.readFileSync("node_modules/mermaid/dist/mermaid.min.js", "utf8");
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<base href="../">
<style>
@page { size: A4; margin: 16mm 14mm 18mm; }
body { font-family: "Noto Sans CJK JP", "Noto Sans JP", sans-serif; font-size: 10.5pt; line-height: 1.7; color:#222; }
h1 { font-size: 22pt; border-bottom: 3px solid #2f6b45; padding-bottom: 6px; }
h2 { font-size: 16pt; color:#2f6b45; border-left: 6px solid #e5b83a; padding-left: 10px; page-break-before: always; margin-top:0; }
h1 + blockquote + blockquote, h1 + blockquote { page-break-after: avoid; }
h3 { font-size: 12.5pt; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-top: 1.4em; }
code, pre { font-family: "Noto Sans Mono CJK JP", "Noto Sans Mono", monospace; font-size: 8.6pt; }
pre { background:#f6f8fa; border:1px solid #e1e4e8; border-radius:6px; padding:8px 10px; white-space: pre-wrap; word-break: break-all; page-break-inside: avoid; }
:not(pre) > code { background:#f0f0f0; padding:1px 4px; border-radius:3px; }
pre.mermaid { background:#fff; border:none; text-align:center; white-space: pre; }
table { border-collapse: collapse; width:100%; margin: .6em 0; font-size: 9.5pt; page-break-inside: avoid; }
th, td { border:1px solid #ccc; padding:4px 6px; vertical-align: top; }
th { background:#eef5f0; }
blockquote { border-left: 4px solid #e5b83a; background:#fffaf0; margin: .6em 0; padding: 4px 12px; color:#444; }
img { max-width: 100%; vertical-align: top; }
p > img:only-child { display:block; margin: 6px auto; max-height: 120mm; }
li input[type=checkbox] { margin-right: 6px; }
ul:has(input[type=checkbox]) { list-style: none; padding-left: 1em; }
hr { display:none; }
h3, h2 { page-break-after: avoid; break-after: avoid; }
h2:first-of-type { page-break-before: avoid; margin-top: 1.5em; }
h2#前提条件, h2[id^="付録"] { page-break-before: always; }
h1 + blockquote { margin-bottom: 2em; }
a { color:#2a5ea8; text-decoration:none; }
</style></head><body>${body}
<script>${mermaid}</script>
<script>
mermaid.initialize({ startOnLoad:false, theme:"neutral", themeVariables:{ fontFamily:'"Noto Sans CJK JP", sans-serif' }, flowchart:{ htmlLabels:true } });
mermaid.run().then(()=>{document.body.dataset.done="1"}).catch(e=>{document.body.insertAdjacentHTML("afterbegin","<pre>MERMAID ERROR "+e+"</pre>")});
</script></body></html>`;
fs.writeFileSync("./教材.html", html);
console.log("html ok", html.length);
