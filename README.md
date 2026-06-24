# StoryLoom

AI story writing copilot — CLI-first, local-first, markdown knowledge base.

StoryLoom helps solo novelists write fiction with an AI co-pilot that understands your story world through markdown files and Obsidian-style `[[wikilinks]]`.

See [examples/sample-novel](examples/sample-novel) for a ready-made mystery project with characters, locations, and a linked chapter.

## Desktop App (Tauri)

StoryLoom includes a Tauri desktop UI with **English, Persian (fa), and Arabic (ar)** support and **RTL/LTR** layout switching.

### Prerequisites

- Node.js 20+
- Rust / Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Linux: `webkit2gtk-4.1-dev`, `libayatana-appindicator3-dev` (or platform equivalents)

### Development

Terminal 1 — API server:

```bash
pnpm api:dev
```

Terminal 2 — Tauri app:

```bash
source ~/.cargo/env
pnpm --filter @storyloom/desktop tauri dev
```

Or use the combined script (starts API + Vite, then Tauri):

```bash
source ~/.cargo/env
pnpm --filter @storyloom/desktop tauri dev
```

### Desktop features

| Screen | Features |
|--------|----------|
| Home | Open / create story projects |
| Explorer | File tree, Monaco markdown editor, canon promote/archive, scaffold entities |
| Graph | React Flow wikilink visualization, rebuild + Mermaid export |
| Search | Full-text keyword search |
| AI Copilot | Interview, what-if, plot holes, style analysis, chapter generation |
| Settings | UI language (en/fa/ar), AI provider, model, write mode |
| Git | AI-prefixed commit history |

## Features (MVP)

- **File-based knowledge base** — characters, locations, items, chapters, and world lore as markdown
- **Wikilink story graph** — build and export JSON/Mermaid graph from `[[links]]`
- **Strict canon tracking** — YAML frontmatter with `canon | draft | archived` lifecycle
- **AI copilot commands** — interview, what-if, plot-hole check, style analysis, chapter generation
- **BYOK cloud AI** — OpenAI, Anthropic, or Ollama via Mastra
- **Auto-git** — commits after significant AI actions
- **Keyword search** — search across story markdown files

## Quick Start

```bash
# Install dependencies and build
pnpm install
pnpm build

# Create a new story project
pnpm story init my-novel --title "My Novel" --genre "Mystery"

cd my-novel

# Configure AI (required before AI commands)
story config set ai.provider openai
story config set ai.model gpt-4o
# Add OPENAI_API_KEY=sk-... to .env

# Scaffold content
story add-character Sarah
story add-location Old-Mansion

# Build story graph
story graph build --export mermaid

# AI copilot
story interview
story what-if chapter-01
story check-plot-holes
story analyze-style
story generate chapter-02 --mode draft
```

## Project Structure

```text
my-novel/
├── story-config.yaml
├── .env
├── .storyloom/          # graph cache, style profile
├── characters/
├── locations/
├── items/
├── chapters/
├── world/
└── reports/
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `story init <name>` | Initialize a new story project |
| `story config set <key> <value>` | Update story-config.yaml |
| `story config wizard` | First-run AI setup guide |
| `story add-character\|location\|item <name>` | Scaffold entity files |
| `story canon promote\|archive <file>` | Manage canon lifecycle |
| `story graph build [--export mermaid]` | Build wikilink graph |
| `story search <query>` | Keyword search |
| `story interview [--batch]` | AI interviewer mode |
| `story what-if <chapter>` | Branching continuations |
| `story check-plot-holes` | Consistency checker |
| `story analyze-style` | Author voice profiling |
| `story generate <chapter> [--mode suggest\|draft\|direct]` | Chapter generation |
| `story git log-ai` | View AI-prefixed commits |

## Write Modes

- `suggest` — output to `reports/` (default)
- `draft` — write `*.draft.md` with `status: draft`
- `direct` — write canonical chapter file

## Monorepo Packages

- `@storyloom/shared` — schemas, types, i18n
- `@storyloom/core` — business logic, graph, agents, git
- `@storyloom/cli` — Commander.js CLI

## License

MIT
