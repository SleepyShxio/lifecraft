// Builds docs/ for GitHub Pages from site/.
// site/index.html is written as an Artifact fragment (no doctype/head), so wrap it in a full
// standards-mode document here and copy the content folder alongside.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const page = readFileSync(join(root, "site", "index.html"), "utf8");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0f1f">
<meta name="apple-mobile-web-app-capable" content="yes">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${page}
</body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
cpSync(join(root, "site", "content"), join(out, "content"), { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");
console.log("docs/ built");
