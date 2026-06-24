# Sample Novel — The Silver Key

This example project demonstrates StoryLoom's markdown knowledge base and wikilink graph.

## Try it

From the StoryLoom repo root:

```bash
pnpm build
cd examples/sample-novel

# Build the story graph
node ../../packages/cli/dist/index.js graph build --export mermaid

# Search the corpus
node ../../packages/cli/dist/index.js search "dark"

# Analyze writing style (uses canon chapters)
node ../../packages/cli/dist/index.js analyze-style

# Check plot holes (structural scan works without AI)
node ../../packages/cli/dist/index.js check-plot-holes

# Configure AI for copilot commands
node ../../packages/cli/dist/index.js config set ai.provider openai
node ../../packages/cli/dist/index.js config set ai.model gpt-4o
# Copy .env.example to .env and add your API key
```

## Wikilink graph

The chapter links to [[Sarah]], [[Marcus]], [[The Old Mansion]], and [[Silver Key]], forming a small graph you can export to Mermaid or JSON.
