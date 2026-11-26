// Validates every course in site/content/courses and rebuilds site/content/catalog.json.
// Usage: node tools/validate.mjs            (all courses)
//        node tools/validate.mjs money-mastery   (only check one; catalog still rebuilt from all valid files)
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "site", "content", "courses");
const ICONS = "coin brain chat compass heart briefcase home book lightbulb target shield globe flame users scale clock dove mountain sun leaf tools map star key".split(" ");
const TYPES = ["learn", "mcq", "multi", "truefalse", "order", "number", "match", "scenario", "reflect"];
const only = process.argv[2];

let totalErrors = 0;
const catalog = [];

function check(course, file) {
  const errs = [];
  const warn = [];
  const e = (m) => errs.push(m);
  const str = (v) => typeof v === "string" && v.trim().length > 0;
  if (course.id + ".json" !== file) e(`id "${course.id}" must match file name ${file}`);
  if (!["life", "mission"].includes(course.track)) e(`track must be life|mission`);
  for (const k of ["title", "tagline", "description", "color"]) if (!str(course[k])) e(`missing ${k}`);
  if (course.tagline && course.tagline.length > 80) warn.push(`tagline is ${course.tagline.length} chars`);
  if (!ICONS.includes(course.icon)) e(`icon "${course.icon}" not in ICONS`);
  if (!/^#[0-9a-fA-F]{6}$/.test(course.color || "")) e(`color must be #rrggbb`);
  if (typeof course.order !== "number") e(`order must be a number`);
  if (!Array.isArray(course.units) || course.units.length < 3) e(`needs >= 3 units`);
  const ids = new Set();
  let levels = 0, steps = 0, minutes = 0;
  for (const u of course.units || []) {
    if (!str(u.id) || ids.has(u.id)) e(`unit id missing/duplicate: ${u.id}`); ids.add(u.id);
    if (!str(u.title)) e(`unit ${u.id} missing title`);
    if (!Array.isArray(u.levels) || u.levels.length < 2) e(`unit ${u.id} needs >= 2 levels`);
    for (const l of u.levels || []) {
      levels++;
      const at = `${u.id}/${l.id}`;
      if (!str(l.id) || ids.has(l.id)) e(`level id missing/duplicate: ${at}`); ids.add(l.id);
      if (!str(l.title)) e(`${at} missing title`);
      if (!str(l.summary)) e(`${at} missing summary`);
      if (!Array.isArray(l.steps) || l.steps.length < 6) { e(`${at} needs >= 6 steps (has ${l.steps?.length})`); continue; }
      if (l.steps[0].type !== "learn") e(`${at} must open with a learn step`);
      let interactive = 0, reflects = 0;
      l.steps.forEach((s, i) => {
        steps++;
        const p = `${at} step ${i + 1} (${s.type})`;
        if (!TYPES.includes(s.type)) return e(`${p}: unknown type`);
        if (s.type !== "learn") interactive++;
        const graded = !["learn", "reflect"].includes(s.type);
        if (graded && !str(s.explain)) e(`${p}: missing explain`);
        if (s.type !== "learn" && !str(s.prompt)) e(`${p}: missing prompt`);
        const opts = s.options;
        switch (s.type) {
          case "learn": if (!str(s.body)) e(`${p}: missing body`);
            if (s.body && s.body.split(/\s+/).length > 170) warn.push(`${p}: body is ${s.body.split(/\s+/).length} words`);
            if (/<[a-z]/i.test(s.body || "")) e(`${p}: HTML not allowed in body`);
            break;
          case "mcq":
            if (!Array.isArray(opts) || opts.length < 2 || !opts.every(str)) e(`${p}: options must be >=2 strings`);
            else {
              if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer >= opts.length) e(`${p}: answer index out of range`);
              if (s.feedback && s.feedback.length !== opts.length) e(`${p}: feedback length != options length`);
              if (new Set(opts).size !== opts.length) e(`${p}: duplicate options`);
            }
            break;
          case "multi":
            if (!Array.isArray(opts) || opts.length < 3) e(`${p}: needs >= 3 options`);
            else if (!Array.isArray(s.answers) || !s.answers.length || !s.answers.every((a) => Number.isInteger(a) && a >= 0 && a < opts.length)) e(`${p}: answers invalid`);
            break;
          case "truefalse": if (typeof s.answer !== "boolean") e(`${p}: answer must be boolean`); break;
          case "order":
            if (!Array.isArray(s.items) || s.items.length < 3 || s.items.length > 7) e(`${p}: needs 3-7 items`);
            else if (new Set(s.items).size !== s.items.length) e(`${p}: duplicate items`);
            break;
          case "number":
            if (typeof s.answer !== "number" || !isFinite(s.answer)) e(`${p}: answer must be a number`);
            if (s.tolerance !== undefined && (typeof s.tolerance !== "number" || s.tolerance < 0)) e(`${p}: bad tolerance`);
            break;
          case "match":
            if (!Array.isArray(s.pairs) || s.pairs.length < 3 || s.pairs.length > 6 || !s.pairs.every((x) => Array.isArray(x) && x.length === 2 && x.every(str))) e(`${p}: needs 3-6 [left,right] string pairs`);
            else if (new Set(s.pairs.map((x) => x[1])).size !== s.pairs.length) e(`${p}: duplicate right-hand values`);
            break;
          case "scenario":
            if (!Array.isArray(opts) || opts.length < 2 || !opts.every((o) => o && str(o.text) && str(o.feedback))) e(`${p}: options need text+feedback`);
            else if (opts.filter((o) => o.best === true).length !== 1) e(`${p}: exactly one option must have best:true`);
            break;
          case "reflect": reflects++; break;
        }
      });
      if (interactive < 4) e(`${at}: needs >= 4 interactive steps (has ${interactive})`);
      if (reflects > 1) e(`${at}: max 1 reflect step`);
      minutes += Math.max(3, Math.round(l.steps.length * 0.7));
    }
  }
  return { errs, warn, stats: { units: course.units?.length || 0, levels, steps, minutes } };
}

const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")) : [];
for (const file of files) {
  let course;
  try { course = JSON.parse(readFileSync(join(dir, file), "utf8")); }
  catch (err) { console.log(`✗ ${file}: invalid JSON: ${err.message}`); totalErrors++; continue; }
  const { errs, warn, stats } = check(course, file);
  if (!only || course.id === only) {
    if (errs.length) { console.log(`✗ ${file}: ${errs.length} error(s)`); errs.slice(0, 40).forEach((m) => console.log("   - " + m)); }
    else console.log(`✓ ${file}: ${stats.units} units, ${stats.levels} levels, ${stats.steps} steps`);
    warn.slice(0, 10).forEach((m) => console.log("   (warn) " + m));
  }
  totalErrors += errs.length;
  if (!errs.length) {
    const { units, ...meta } = course;
    catalog.push({ ...meta, file: `content/courses/${file}`, ...stats,
      unitTitles: course.units.map((u) => u.title) });
  }
}
catalog.sort((a, b) => (a.track === b.track ? a.order - b.order : a.track === "life" ? -1 : 1));
writeFileSync(join(root, "site", "content", "catalog.json"), JSON.stringify(catalog, null, 1));
console.log(`\ncatalog.json: ${catalog.length} valid course(s). ${totalErrors ? totalErrors + " error(s) total" : "no errors"}`);
process.exit(totalErrors && (!only || files.some((f) => f === only + ".json")) ? 1 : 0);
