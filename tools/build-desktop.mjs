// Builds desktop/Lifecraft.html: one self-contained file for the desktop app.
// The app fetches content/*.json, which a file:// page cannot do, so every course is inlined
// and fetch() is answered from that bundle. Then copies it and the icon into the install folder
// given as argv[2] (if any).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site"), out = join(root, "desktop");
mkdirSync(out, { recursive: true });

const data = {};
data["content/catalog.json"] = JSON.parse(readFileSync(join(site, "content", "catalog.json"), "utf8"));
for (const f of readdirSync(join(site, "content", "courses"))) {
  if (f.endsWith(".json")) data["content/courses/" + f] = JSON.parse(readFileSync(join(site, "content", "courses", f), "utf8"));
}
const missing = data["content/catalog.json"].filter((m) => !data[m.file]).map((m) => m.file);
if (missing.length) { console.error("missing course files:", missing); process.exit(1); }

const icon = readFileSync(join(out, "logo-64.png")).toString("base64");
const bundle = JSON.stringify(data).replace(/</g, "\\u003c");
const shim = `<script>
(() => {
  const DATA = ${bundle};
  const real = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = (url, opts) => {
    const key = String(url && url.url || url).replace(/^\\.?\\//, "").split("?")[0];
    if (key in DATA) return Promise.resolve(new Response(JSON.stringify(DATA[key]), { status: 200, headers: { "Content-Type": "application/json" } }));
    return real ? real(url, opts) : Promise.reject(new Error("offline"));
  };
})();
</script>`;

const page = readFileSync(join(site, "index.html"), "utf8");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0f1f">
<link rel="icon" type="image/png" href="data:image/png;base64,${icon}">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${shim}
</head>
<body>
${page}
</body>
</html>
`;
writeFileSync(join(out, "Lifecraft.html"), html);
console.log(`desktop/Lifecraft.html built: ${Object.keys(data).length - 1} courses, ${(html.length / 1024).toFixed(0)} KB`);

const dest = process.argv[2];
if (dest) {
  mkdirSync(dest, { recursive: true });
  copyFileSync(join(out, "Lifecraft.html"), join(dest, "Lifecraft.html"));
  copyFileSync(join(out, "lifecraft.ico"), join(dest, "lifecraft.ico"));
  console.log("installed to", dest);
}
