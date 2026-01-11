# Repository Guidelines

## Project Status
This repository is currently empty aside from the `.git` directory. There is no source tree, build tooling, or tests committed yet, so the guidelines below capture the current state and recommended starting points.

## Project Structure & Module Organization
No directories exist yet. When bootstrapping, prefer a clear top-level layout such as:

- `src/` for application or library code.
- `tests/` for unit/integration tests.
- `assets/` for static files (images, fixtures, sample data).

If you introduce a new language or framework, keep the structure consistent with its conventions and document any deviations here.

## Build, Test, and Development Commands
No build or runtime commands are defined yet. After adding tooling, list the canonical commands here (examples below):

- `npm run dev` to start the local dev server.
- `npm test` to run the test suite.
- `npm run build` to produce production artifacts.

Include any required environment variables and sample values (for example, `API_BASE_URL=http://localhost:3000`).

## Coding Style & Naming Conventions
No formatting or linting rules are configured yet. When adding them:

- Document indentation (for example, 2 spaces for JS/TS, 4 for Python).
- Note formatter/linter tools (for example, `prettier`, `eslint`, `ruff`).
- Specify naming patterns (for example, `PascalCase` components, `kebab-case` files).

## Testing Guidelines
No testing framework is configured. Once tests are added:

- Note the framework (for example, `jest`, `pytest`, `vitest`).
- Define test file naming (for example, `*.test.ts`, `test_*.py`).
- State any coverage expectations or required test categories.

## Commit & Pull Request Guidelines
There is no Git history yet, so commit conventions are not established. When you start committing:

- Choose a consistent style (for example, Conventional Commits like `feat:`, `fix:`).
- Keep messages short and imperative.
- For PRs, include a clear description, linked issues, and screenshots for UI changes.

## Configuration & Secrets
If you add configuration files, keep secrets out of version control. Use `.env.example` to document required variables and add `.env` to `.gitignore`.
