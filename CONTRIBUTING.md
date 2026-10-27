# Contributing

Thanks for wanting to help. The short version, with links, is on the
[contribute page](https://lifecycle-practice.vercel.app/contribute/). There are four ways in, from least to most work.

## 1. Tell me what you think

Press **Make a suggestion** in the game, or [open an issue](https://github.com/BrentBarnes/lifecycle-practice/issues/new/choose).
Bugs, ideas, "this step confused me", and "this part was great" are all useful. For a bug, say which game and which
step, and what you expected to happen.

## 2. Talk it through with me

The best levels come from real work: a launch that broke, a flow that quietly stopped working, a segment or a report
that saves you time. [Message me on LinkedIn](https://www.linkedin.com/in/brent-barnes-39827622b) and we'll talk it
through, by DM or on a Zoom call. If it becomes a level, you get credit in the game, by name or not, your call.

## 3. Send a prompt request

You don't have to write the code. Write the prompt you'd give an AI coding agent (Claude Code, Codex, Cursor) to make
the change, and open a **Prompt request** issue with it. I read each one and choose whether to run it. If I run it,
I'll link the change in the issue.

A good prompt request:

- names one change ("add a step to Level 2 that teaches X", not "make Level 2 better")
- says which game and which files, if you know them
- says how to check it worked ("the new step shows after step 2s3, and its reps pass after 4 of 5 right")
- keeps the game's rules (below)

## 4. Send a pull request

Fork the repo, make the change, and open a pull request. Keep it to one change per pull request. The template asks for
three things: **what you built**, a **review link** (a full URL, so it's clickable) that opens the game right at your
change, and **how to check it works**. [AGENTS.md](AGENTS.md) lists the review link patterns. If you build with an AI agent, point it at AGENTS.md
first. It has the layout, the rules and what to hand back.

To find something to work on, see the [project board](https://github.com/users/BrentBarnes/projects/4). Anything in
Up next is open. Say so in the issue first so two people don't build the same thing.

**One thing to know first:** this repo is a published copy. I build it from my own working copy, where the games also
run on my machine with extras that need a server. So when I merge a pull request, I bring the same change into my
working copy and publish again. Your commit history may not survive that step, but your change will, and you'll be
credited in the release notes.

### Running it

```
python3 -m http.server 8000
```

Then open http://localhost:8000. There's nothing to install and no build step. Reload the page to see a change.

### Where things are

- `office/office.mjs`: the office (the room, days, roles, the time clock, the desks). `office/days.mjs` lists each
  track's lessons. `office/sql.mjs` is Frank's SQL lessons.
- `lifecycle-files/index.html` and `path.js`: the Lifecycle Files page. `lifecycle-files/py/`: its Python engine
  (cases, steps, pass rules). `lifecycle-files/static-api.js` runs that engine in the browser.
- `test-board/app.mjs`: the Test Board game. Each unit has its own module (`sizing.mjs`, `health.mjs`, and so on).
- `shared/desk/`: the desk themes and the pop-out tutorial. `shared/site.mjs`: the Save file and suggestion buttons.

### The game's rules

- **One new thing per step.** A step teaches one idea, then practises it alone, then joins it with what came before.
- **Every screen asks for a decision.** No screens that are only reading.
- **Keep the tool screens looking like the tools** (Klaviyo-style reports, GrowthBook, a SQL console), so practice
  carries over to work.
- **Made-up numbers and made-up people only.** No real company's data, names or products.
- **Keys:** avoid single letters that browser extensions like Vimium take (O, H, L, J, K, F, ?). Check a game's
  `keymap.json` before adding one.
- **No AI calls and no accounts.** The public game runs entirely in the browser.
- Plain words on screen. Short sentences.

## Code of conduct

Be kind and assume good intent. Critique the work, not the person. I'll remove anything hateful or harassing.
