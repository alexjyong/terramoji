# 🌍 TerraMoji

> **Proof-of-concept: Qwen + Spec Kit driven game design — from prompt to playable prototype.**

TerraMoji is a SimEarth-inspired emoji planet simulation. Generate a random world, paint biomes with your mouse, watch creatures spawn and wander across terrain — all rendered as emoji on a 30×30 grid.

**This entire project was designed and implemented with [Qwen Code](https://qwen.ai) (Qwen3-2.6-27B) using the [Spec Kit](https://github.com/qwenlm/spec-kit) workflow.** The goal is to demonstrate that a local LLM, guided by structured specification workflows, can take a well defined idea and produce a working, tested, multi-feature application.

---

## 🎮 Playing the Game

Open `index.html` in any modern browser (Chrome, Firefox, Safari). No build step, no server needed.

| Action | How |
|--------|-----|
| Generate a new planet | Click **🌍 New Planet** |
| Paint terrain | Select a biome from the toolbar → click or drag on the grid |
| Inspect a tile | Click **🔍 Inspect** → click any tile to see biome/creature/civilization info |
| Pause / Resume simulation | Click **⏸️ Pause** / **▶️ Resume** |

### Biomes & Creatures

| Biome | Emoji | Creature | Compatible Creatures |
|-------|-------|----------|---------------------|
| Water | 🌊 | 🐟 fish | fish |
| Grassland | 🌿 | 🐄 cow | cow, goat, deer |
| Desert | 🏜️ | 🐪 camel | camel |
| Mountain | 🏔️ | 🐐 goat | goat |
| Forest | 🌲 | 🦌 deer | cow, deer, parrot |
| Jungle | 🌴 | 🦜 parrot | parrot |
| Ice (poles) | ❄️ | 🐧 penguin | penguin |

Creatures spawn on compatible biomes and move to adjacent compatible tiles every second. Population is capped at **5 per cell** and **200 total**.

---

## 🧪 What This Proves

TerraMoji demonstrates the **Qwen + Spec Kit** development workflow:

1. **Prompt → Specification** — A single user description ("SimEarth-inspired emoji game MVP") was expanded into a full feature spec with user stories, acceptance criteria, and edge cases via Spec Kit's `/specify` command.
2. **Specification → Data Model** — Entity relationships, validation rules, and state transitions were defined in `data-model.md`.
3. **Data Model → Design Plan** — Implementation planning produced dependency-ordered tasks across phases.
4. **Plan → Task Execution** — Each task was implemented test-first, verified, and committed incrementally.
5. **Constitution-Guided Development** — A project constitution defined core principles (Simplicity First, Emoji-First Graphics, Simulation Integrity) that constrained every design decision.

**All code, tests, specs, and design artifacts were produced by Qwen3-2.6-27B running locally.** The human's role was prompting, reviewing, and iterating — not writing code.

---

## 📁 Project Structure

```
terramoji/
├── index.html              # Entry point — open in browser
├── css/
│   └── game.css            # All styling (biome gradients, grid layout, tooltip)
├── js/
│   ├── simulation.js       # Core logic: terrain gen, creatures, tick loop
│   ├── renderer.js         # DOM rendering, inspect tooltip
│   └── input.js            # Event handlers: toolbar, grid clicks, drag-paint
├── tests/
│   └── test_simulation.js  # Node.js tests for PRNG, terrain, creatures
├── specs/001-planet-mvp/
│   ├── spec.md             # Feature specification & user stories
│   ├── plan.md             # Implementation plan
│   ├── tasks.md            # Dependency-ordered task list
│   └── data-model.md       # Entity model & state transitions
├── .specify/               # Spec Kit configuration & memory
└── QWEN.md                 # Qwen Code project context
```

---

## 🏗️ Tech Stack

- **Vanilla JavaScript** — no frameworks, no build tools
- **CSS Grid + Gradients** — terrain rendered via CSS, emoji for entities only
- **Node.js** — for running tests (`node tests/test_simulation.js`)
- **Spec Kit** — structured specification workflow
- **Qwen Code (Qwen3-2.6-27B)** — AI assistant that wrote all code

---

## 🧪 Running Tests

```bash
node tests/test_simulation.js
```

Tests cover: PRNG determinism, terrain generation, pole enforcement, biome smoothing, creature spawning, movement compatibility, and creature removal on biome change.

---

## 🗺️ Roadmap (Future Milestones)

- Simulation speed control (expand Pause/Resume to variable tick rate)
- Civilization entities (villages, cities, ruins)
- Creature population dynamics (birth, death, migration pressure)
- Seed sharing & reproducibility
- Mobile touch optimization

---

## 📜 License

MIT — this is a proof of concept, feel free to use it however you like.
