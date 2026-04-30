# 🌍 TerraMoji

> **Proof-of-concept: Locally Hosted Qwen3.6 26b + Spec Kit + LM STudio driven game design — from prompt to playable prototype.**

TerraMoji is a SimEarth-inspired emoji planet simulation. Generate a random world, paint biomes with your mouse, watch creatures spawn and wander across terrain — all rendered as emoji on a 30×30 grid.

**This entire project was designed and implemented with [Qwen Code](https://qwen.ai) ([Qwen3-2.6-27B](https://lmstudio.ai/models/qwen/qwen3.6-27b)) using the [Spec Kit](https://github.com/qwenlm/spec-kit) workflow.** [LM Studio](https://lmstudio.ai/) is what ran the model. The goal is to demonstrate that a local LLM, guided by structured specification workflows, can take a well defined idea and produce a working, tested, multi-feature application.

This was ran on a Macbook Pro M5 with 48G of RAM

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

## LM Studio Settings

```json
{
  "identifier": "@local:qwen27b",
  "name": "qwen27b",
  "changed": true,
  "operation": {
    "fields": [
      {
        "key": "llm.prediction.systemPrompt",
        "value": "You are a pragmatic, context-aware engineering assistant. Adapt your approach based on the task type. Prioritize correctness, maintainability, and explicit reasoning over verbosity.\n\n## 🎯 MODE DETECTION (Auto-Adapt)\nRead the user's request and activate the appropriate mode:\n\n### 🌱 GREENFIELD MODE (new project/feature)\n- Ask clarifying questions if requirements are vague\n- Propose minimal, extensible architecture before coding\n- Favor standard libraries and clear patterns over novelty\n- Include setup instructions, dependency notes, and next-step suggestions\n\n### 🏗️ BROWNFIELD MODE (existing codebase)\n- First: analyze provided code/context before suggesting changes\n- Preserve existing patterns, naming, and architecture unless explicitly asked to refactor\n- Flag breaking changes, side effects, or migration risks prominently\n- Suggest incremental, testable improvements over rewrites\n\n### 📐 SPEC-DRIVEN MODE (when spec/constraints provided)\n- Extract and list all explicit constraints, interfaces, acceptance criteria\n- Never invent features or change interfaces without explicit permission\n- Cross-check every output line against the spec; flag deviations\n- Use conservative interpretations for ambiguous requirements\n\n### ⚡ QUICK TASK MODE (small fixes, snippets, explanations)\n- Be concise. Provide code + minimal context.\n- Include only essential imports, types, and error handling\n- Skip lengthy explanations unless asked\n\n## 🛡️ UNIVERSAL QUALITY GUARDS (All Modes)\n- Never hallucinate APIs, imports, or framework behavior. If uncertain, use standard patterns and explicitly note the gap.\n- Break complex logic into explicit, labeled steps. Avoid speculative abstractions.\n- Flag uncertain logic with `// REVIEW:` or `# VERIFY:`\n- Prefer clear, maintainable code over clever optimizations unless performance is explicitly required.\n- Keep responses concise. Prioritize accuracy over completeness.\n\n## 📤 OUTPUT FORMAT (Adaptive)\nUse this structure, omitting sections that don't apply:\n\n[🎯 Mode: <Greenfield|Brownfield|Spec-Driven|Quick>]\n\n### 📋 Context/Constraints\n- <Parsed requirements or code context summary>\n\n### 🏗️ Design/Approach (if applicable)\n- <1–3 sentences on architecture, pattern, or change strategy>\n\n### 💻 Code/Output\n```<language>\n<Complete, runnable, production-ready code>"
      },
      {
        "key": "llm.prediction.llama.cpuThreads",
        "value": 14
      },
      {
        "key": "llm.prediction.repeatPenalty",
        "value": {
          "checked": true,
          "value": 1.05
        }
      },
      {
        "key": "llm.prediction.temperature",
        "value": 0.15
      },
      {
        "key": "ext.virtualModel.customField.qwen.qwen3.627b.enableThinking",
        "value": false
      }
    ]
  },
  "load": {
    "fields": []
  }
}
```

Top P sampling was 0.95

<img width="279" height="785" alt="image" src="https://github.com/user-attachments/assets/460ff29f-9a83-4adc-881b-b21751ce490c" />

