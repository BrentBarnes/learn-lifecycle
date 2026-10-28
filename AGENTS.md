# Instructions for AI coding agents

You're helping someone contribute to **Learn Lifecycle**: free browser games that teach lifecycle and email
marketing at Fernhill Coffee Co., a made-up coffee brand. Read this whole file before changing anything. People
contribute four ways ([contribute page](https://learn-lifecycle.vercel.app/contribute/)). This file is for the
fourth: building a change and sending a pull request.

## Run it

No install, no build step, no dependencies. Static files only.

```
python3 -m http.server 8000
```

Open http://localhost:8000 and reload after each change. Don't open files from disk (`file:` blocks modules), and
serve from the repo root (pages link to `/px/` and `/shared/`).

## Where things are

| Path | What |
|---|---|
| `office/office.mjs` | The Fernhill office: the room, days, roles, the time clock, the desks |
| `office/days.mjs` | The three tracks (Analytics, Data, Testing) and every lesson id on them |
| `office/sql.mjs` | Frank's SQL desk: `PARTS`, one entry per SQL lesson (`select`, `where`, `order`, ...) |
| `lifecycle-files/index.html`, `path.js`, `modes.js` | The Lifecycle Files page |
| `lifecycle-files/py/` | Its Python case engine, run in the browser by Pyodide. Levels are `lf_level2.py` to `lf_level7.py`. The step paths are `lf_path.py` (Level 1), `lf_path2.py`, `lf_path7.py` |
| `test-board/app.mjs` | The Test Board game. Each screen is its own module: `sizing.mjs`, `health.mjs`, `money.mjs`, ... `engine.mjs` holds the made-up world and the unit list |
| `test-board/release.mjs` | Which Test Board steps the public site shows, in order |
| `shared/` | Desk themes and pop-out tutorial (`desk/`), Copy as a question, the Save file and suggestion buttons (`site.mjs`) |
| `px/` | Pixel art (PNG). Reuse what's there before adding new art |
| `api/feedback.js` | The suggestion box's Vercel function. Leave it alone unless the change is about the box |

Read the top comment of any file before editing it. Each one says what it owns.

## The rules (a pull request that breaks one gets sent back)

1. **One new thing per step.** A step teaches one idea in a short lesson, then the player practises only that until
   most recent answers are right. Then steps join: 1, then 2, then 1 and 2 together.
2. **Every screen asks for a decision.** No screens that are only reading.
3. **The tool screens look like the real tools** (Klaviyo-style flow reports, GrowthBook, a SQL console). Keep their
   layout so practice carries over to work.
4. **Made-up numbers and made-up people only.** No real company's data, names, products or customers. The store sells
   coffee beans, grinders, brewers and subscriptions. The cast: Dana (boss), Priya, Theo, Ruth, Frank, Mei.
5. **No AI calls, no accounts, no servers, no tracking.** Everything runs in the browser. Saves live in browser storage.
6. **No new dependencies and no build step.** Plain HTML, CSS and JavaScript modules (plus Python for the Lifecycle
   Files engine).
7. **Keys:** don't add single-letter shortcuts that browser extensions like Vimium take (O, H, L, J, K, F, ?). Check
   `test-board/keymap.json` first.
8. **Plain words on screen.** Short sentences. Say what to do, not how clever it is.
9. **Match the code around you:** naming, comment density, file layout. Small, focused changes.

## Before you hand it back

- Play the changed part from a fresh save (a private window works) and confirm it passes and fails the way it should.
- Check the browser console for errors on the pages you touched.
- If you changed Python in `lifecycle-files/py/`, load a Lifecycle Files step that uses it. The first load takes about
  ten seconds while Pyodide downloads.

## What to hand back

Write the pull request description with these three things. The template asks for them.

1. **What you built**, in two or three plain sentences.
2. **A review link** that opens the game right at the change, so the reviewer clicks once and is there. **Always write
   it out as a full URL**, never a bare path, so it's clickable in the pull request. Use the pull request's Vercel
   preview address once Vercel comments it on the pull request (it shows your change before it's merged). Until then,
   use `https://learn-lifecycle.vercel.app`. If you list more than one change, give each its own link.

   | Changed | Review link (example) |
   |---|---|
   | An office lesson (any desk) | https://learn-lifecycle.vercel.app/office/?dev&try=data:where. Roles: `analytics`, `data`, `testing`. Lesson ids: `office/days.mjs` |
   | A Lifecycle Files step | https://learn-lifecycle.vercel.app/lifecycle-files/?start=step&step=2s3&profile=office-dev |
   | A Test Board unit | https://learn-lifecycle.vercel.app/test-board/?embed=U2a&save=office-dev |
   | A new kind of screen | Add a URL parameter that jumps straight to it, in the same style, and give that link |

   Review links use the practice (dev) saves, so they never touch real progress.
3. **How to check it works**: what to do on that screen and what should happen.

## How changes get in

This repo is a published copy, built from the maintainer's working copy. When a pull request is accepted, the same
change is brought into the working copy and published again. Your commit history may not survive, but your change
will, and you'll be credited in the release notes. Keep each pull request to one change so that step stays easy.
