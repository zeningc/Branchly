# Branchly

Branch off ChatGPT and Gemini conversations into a tree of explorations.

When you're reading an AI response and get confused by a specific part, select the text, type your question, and Branchly opens a new thread with full context — without polluting your original conversation.

## The Problem

When learning with ChatGPT or Gemini, you often want to ask a follow-up about a specific paragraph. Your options are:

1. **Reply in the same chat** — pollutes the conversation. After 5-10 side questions, you have to scroll way up to find where you left off.
2. **Open a new chat** — loses all context. Copy-pasting is impractical for long conversations.

Branchly gives you a third option: **branch**.

## How It Works

1. **Select text** in any ChatGPT or Gemini response
2. Click **Branch** and type your question
3. Branchly opens a new chat with your question + the relevant context, automatically
4. Your branches form a **tree** in the side panel — navigate, rename, search, and manage them

Branches can be nested: branch from a branch, creating a tree of exploration that you can always navigate back through.

## Features

- **Branching** — select text, ask a question, get a new contextual thread
- **Tree visualization** — see all your branches as a navigable tree with connector lines
- **Active node highlighting** — the tree highlights which conversation you're currently viewing
- **Search** — filter branches by name or content
- **Light/dark mode** — toggle in the side panel header
- **Cross-platform** — works on both ChatGPT and Gemini
- **Fully local** — no API keys, no backend, all data stored in your browser via IndexedDB

## Install from Chrome Web Store

*Coming soon*

## Install from Source

1. Clone this repo:
   ```bash
   git clone https://github.com/zeningc/Branchly.git
   cd Branchly
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `dist/` folder

## Development

```bash
npm run dev    # Watch mode — rebuilds on file changes
npm run build  # Production build
```

After making changes, click the refresh icon on Branchly in `chrome://extensions/` and reload the ChatGPT/Gemini page.

## Architecture

```
src/
├── content/           # Content script injected into ChatGPT/Gemini
│   ├── index.ts       # Entry point, URL tracking
│   ├── selectors.ts   # Platform-specific DOM selectors (easy to update)
│   ├── chatActions.ts # Click new chat, type & send messages
│   ├── selectionHandler.ts  # Text selection → Branch UI
│   └── toast.ts       # Toast notifications
├── sidepanel/         # Chrome Side Panel (React)
│   ├── App.tsx        # Main app: tree, search, theme toggle
│   ├── TreeView.tsx   # Recursive tree with connector lines
│   └── theme.ts       # Light/dark theme definitions
├── background/        # Service worker: orchestrates branching
│   └── index.ts
├── storage/           # IndexedDB persistence
│   └── db.ts
└── types.ts           # Shared types
```

## Contributing

Contributions welcome! Some areas that could use help:

- **Gemini selectors** — Gemini's DOM changes frequently; help keep selectors up to date
- **Context compaction** — summarize long conversations before passing to new branches
- **Export/import** — backup and share your branch trees

## License

MIT
