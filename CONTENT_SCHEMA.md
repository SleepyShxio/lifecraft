# Course content schema

Every course is one JSON file at `site/content/courses/<course-id>.json`.
Run `node tools/validate.mjs` after writing; it checks every course and rebuilds
`site/content/catalog.json` (the site's course list). A course that fails validation does
not count as done.

## Course object

```json
{
  "id": "money-mastery",              // kebab-case, same as the file name
  "track": "life",                    // "life" or "mission"
  "title": "Money Mastery",
  "tagline": "Budget, save, borrow smart and start investing.",   // <= 70 chars
  "description": "2-3 sentences on what you will be able to do after the course.",
  "icon": "coin",                     // one of the ICONS list below
  "color": "#F5B83D",                 // course accent, a mid-saturation hex that reads on dark AND light backgrounds
  "order": 1,                         // sort order inside its track
  "units": [ Unit, ... ]              // 3-5 units
}
```

ICONS: coin, brain, chat, compass, heart, briefcase, home, book, lightbulb, target, shield,
globe, flame, users, scale, clock, dove, mountain, sun, leaf, tools, map, star, key

## Unit

```json
{ "id": "u1", "title": "Where Your Money Goes", "description": "one sentence", "levels": [ Level, ... ] }
```
3-4 levels per unit. Ids unique within the course (`u1`, `u2`, ...).

## Level (one lesson, about 5-8 minutes)

```json
{
  "id": "u1-l1",
  "title": "The 50/30/20 Budget",
  "summary": "one sentence shown on the level card",
  "steps": [ Step, ... ]            // 7-12 steps
}
```

Each level must have **at least 4 interactive steps** (anything except `learn`), must open with
a `learn` step, and should alternate teaching and practice (Brilliant style: teach a small idea,
then make the learner use it right away). The last step should be a `learn` step titled like
"Key takeaways" or a `reflect` step that turns the lesson into a real-life action.

## Step types

Text fields support a tiny markdown subset: `**bold**`, `*italic*`, lines starting with `- `
become bullet lists, a line starting with `> ` becomes a highlighted callout, a blank line
separates paragraphs. No HTML, no links in text (use `source` for links). Keep `body`
under ~120 words: short, concrete, example-driven.

```json
{ "type": "learn", "title": "optional heading", "body": "teaching text", "source": {"label": "optional", "url": "https://..."} }

{ "type": "mcq", "prompt": "question", "options": ["A","B","C","D"], "answer": 2,
  "feedback": ["optional per-option feedback", "...", "...", "..."],   // optional, same length as options
  "explain": "why the answer is right (shown after checking)" }

{ "type": "multi", "prompt": "Select all that apply", "options": ["..."], "answers": [0,2], "explain": "..." }

{ "type": "truefalse", "prompt": "statement", "answer": true, "explain": "..." }

{ "type": "order", "prompt": "Put these in order (first to last)", "items": ["first","second","third"], "explain": "..." }
   // items listed in the CORRECT order; the site shuffles them. 3-6 items.

{ "type": "number", "prompt": "question needing a calculation", "answer": 1250, "tolerance": 0,
  "unit": "$",          // optional, shown next to the input: "$", "%", "years", "minutes"...
  "explain": "worked solution" }

{ "type": "match", "prompt": "Match each term to its meaning", "pairs": [["term","meaning"], ...], "explain": "..." }
   // 3-5 pairs; the site shuffles the right column

{ "type": "scenario", "prompt": "A realistic situation ... What do you do?",
  "options": [ {"text": "choice", "feedback": "what happens / why", "best": true}, ... ],   // 3-4 options, exactly one best
  "explain": "the principle behind the best choice" }

{ "type": "reflect", "prompt": "Write your answer / plan", "placeholder": "optional hint text" }
   // free text saved privately on the device, not graded; counts as interactive. Use sparingly (max 1 per level).
```

`answer` and `answers` are zero-based indexes. `explain` is required on every graded step.

### Hints and tips (optional fields)

```json
{ "type": "number", "prompt": "...", "answer": 840, "hint": "Wants are 30%. Find 30% of $2,800.", "explain": "..." }
{ "type": "learn", "body": "...", "tip": "Turn on auto-transfer the day after payday so saving happens before spending." }
```

- `hint` (any graded step, optional, max ~35 words): a nudge shown when the learner taps **Hint**
  before answering. It points at the method; it never states the answer. Give every `number` step
  and any tricky step a hint.
- `tip` (learn steps, optional, max ~45 words): a **Real-life tip** callout under the body: one
  concrete thing to do this week (a setting to change, a script to say, a habit). Tips also feed
  the home screen's "Tip of the day", so each must make sense on its own without the lesson.
- Same markdown subset as `body`; no HTML.
- Every `number` step can be solved with the app's built-in calculator (it opens from the answer
  box). Keep the math to one or two operations a person would really do in daily life.

## Quality bar

- Content must be **practically useful**: a skill someone can apply this week, with concrete
  numbers, scripts (what to actually say), checklists and real examples. No trivia.
- Facts must be accurate and current as of 2026 (e.g. US tax/credit/retirement rules, real
  Church program names). If a figure changes yearly, say so and give the year.
- Write in plain, friendly language for a teen to young adult. Explain jargon on first use.
- Wrong options must be plausible (common misconceptions), not jokes.
- Write in your own words; short scripture quotes are fine.
