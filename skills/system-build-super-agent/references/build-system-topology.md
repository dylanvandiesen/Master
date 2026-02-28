# Build System Topology

## Root-Owned Architecture

- Root orchestration runtime: `gulpfile.mjs`
- Root defaults: `agency.config.json`
- Project roots: `projects/<ProjectName>/`
- Per-project overrides: `projects/<ProjectName>/project.config.json`
- Build outputs: `dist/projects/<project-slug>/`
- Dev manifests: `.agency/dev-servers/*.json`

## Pipeline Stages

1. Project discovery under `projects/`.
2. Auto-scaffold missing structure from `templates/project/`.
3. Merge defaults + per-project overrides.
4. Build styles:
   - Sass compile
   - PostCSS autoprefix
   - CSS minify to `*.min.css`
5. Build scripts:
   - Esbuild primary path
   - Legacy concat/uglify fallback in `scripts.mode=dual`
6. Optimize/copy images.
7. Copy static assets and vendor scripts.
8. Emit dashboard and manifest data.

## Dynamic Project Rules

- Any folder in `projects/` is treated as a project candidate.
- Missing source folders/files are scaffolded when scaffold logic runs.
- Legacy flat folders can be migrated into `src/` when enabled.
- Active project resolution:
  1. `--project`
  2. `PROJECT` env
  3. `agency.config.json.activeProject`
  4. First discovered folder

## Dev Server Rules

- Single-project mode serves `dist/projects/<slug>/`.
- All-project mode serves `dist/` dashboard + outputs.
- Port selection:
  1. `--port`
  2. `DEV_PORT`
  3. `agency.config.json.server.startPort`
  4. Default `5173`

## What This Topology Excludes

- Project implementation details inside `projects/*/src/**`
- Commander implementation internals in `remote-console/**`
