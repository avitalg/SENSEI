# sensei

> Description coming soon (TBD).

A React + TypeScript + Vite project.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node.js)

### Pull the project

```bash
git clone <repository-url>
cd sensei
```

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The dev server prints a local URL (default http://localhost:5173).

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server with HMR.  |
| `npm run build`   | Type-check and build for production. |
| `npm run preview` | Preview the production build.        |
| `npm run lint`    | Run ESLint.                          |

## Coding Standards

This project follows a shared set of coding standards. Please read and follow
them before contributing:

- **[AGENTS.md](./AGENTS.md)** — the source of truth (also used by AI coding tools).
- **`.cursor/rules/coding-standards.mdc`** — the same rules, applied automatically in Cursor.

In short:

- End every statement with a semicolon.
- Prefer OOP with encapsulated classes for domain logic.
- No inline functions in JSX/callbacks — use named, memoized (`useCallback`/`useMemo`) handlers where appropriate.
- Split UI into small, focused components, each in its own file.
- Style with `styled-components` (no inline `style` props or plain CSS class strings).
