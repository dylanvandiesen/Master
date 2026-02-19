# Agency Setup Wiki

## 1) Purpose

This project uses a root-controlled "agency" architecture:

- Root owns dependencies, build scripts, and dev tooling.
- `projects/*` contains source projects.
- Every project can be auto-scaffolded and auto-built.
- Output is centralized under `dist/projects/<slug>/`.
- Dev servers are auto-generated with open-port selection.

## 2) Architecture

Main flow:

1. Discover all project folders in `projects/`.
2. Auto-scaffold missing folders/files from `templates/project/`.
3. Merge root defaults (`agency.config.json`) with project overrides (`project.config.json`).
4. Build one project or all projects through root tasks.
5. Start dev server (single-project mode or all-project mode).
6. Watch source and debounce rebuilds.
7. Write dev-server manifest files in `.agency/dev-servers/`.

## 3) Folder Contracts

Root:

- `gulpfile.mjs`: automation runtime.
- `agency.config.json`: agency defaults and behavior toggles.
- `templates/project/`: scaffold templates.
- `projects/`: project source folders.
- `dist/`: compiled output.
- `.agency/dev-servers/`: generated server manifests.
- `AGENTS.md`: engineering rules and architecture notes.
- `config.toml`: local multi-agent + MCP runtime wiring.

Project contract (`projects/<ProjectName>/`):

- `project.config.json`
- `src/index.html`
- `src/scss/`
- `src/js/`
- `src/images/`
- `src/fonts/`
- `src/docs/`
- `src/static/`

Legacy migration mapping:

- `scss -> src/scss`
- `js -> src/js`
- `images -> src/images`
- `fonts -> src/fonts`
- `docs -> src/docs`
- `favicons -> src/images/favicons`

## 4) Build Output Contract

Per project output:

- `dist/projects/<slug>/index.html`
- `dist/projects/<slug>/css/*.min.css`
- `dist/projects/<slug>/js/*.min.js`
- `dist/projects/<slug>/images/**`
- `dist/projects/<slug>/fonts/**`
- `dist/projects/<slug>/docs/**`
- `dist/projects/<slug>/vendor/**`

Dashboard output:

- `dist/index.html` links all discovered project outputs.

## 5) Config Reference

`agency.config.json` top-level keys:

- `projectsDir`
- `distDir`
- `activeProject`
- `dev`
- `server`
- `scaffold`
- `build`
- `styles`
- `scripts`
- `watch`
- `images`
- `static`
- `vendor`
- `projectDefaults`

Important behavior keys:

- `server.host`, `server.startPort`, `server.maxPortAttempts`
- `server.spaFallback`
- `server.autoGenerateManifest`, `server.manifestDir`
- `scripts.engine` (`esbuild` or `legacy`)
- `scripts.mode` (`dual` enables legacy fallback)
- `watch.debounceMs`
- `scaffold.migrateLegacyLayout`

Project overrides live in `projects/<name>/project.config.json`.

## 6) Root Commands

### NPM Command Surface

- `cmd /c npm run dev`
- `cmd /c npm run dev:project`
- `cmd /c npm run dev:all`
- `cmd /c npm run build`
- `cmd /c npm run build:project`
- `cmd /c npm run build:all`
- `cmd /c npm run clean`
- `cmd /c npm run scaffold`
- `cmd /c npm run list:projects`
- `cmd /c npm run chat:new`
- `cmd /c npm run chat:new:full`
- `cmd /c npm run chat:new:quick`
- `cmd /c npm run chat:briefing`
- `cmd /c npm run mcp:prep`
- `cmd /c npm run skills:list`
- `cmd /c npm run skills:validate`
- `cmd /c npm run remote:panel`
- `cmd /c npm run remote:panel:lan`

### Gulp Task Surface

- `npx gulp dev`
- `npx gulp devAll`
- `npx gulp build`
- `npx gulp buildAll`
- `npx gulp clean`
- `npx gulp scaffold`
- `npx gulp listProjects`

Default task:

- `npx gulp` runs `dev`.

## 7) Flags and Environment Variables

CLI flags:

- `--project` selects active project.
- `--port` sets preferred dev-server port.

Env vars:

- `PROJECT` active project fallback.
- `DEV_PORT` dev-server preferred port fallback.
- `LIVERELOAD_PORT` preferred livereload port.

Resolution order:

Active project:

1. `--project`
2. `PROJECT`
3. `agency.config.json` `activeProject`
4. first discovered project folder

Dev server port:

1. `--port`
2. `DEV_PORT`
3. `agency.config.json` `server.startPort`
4. hard default `5173`

## 8) Auto-Generated Dev Server

Single-project mode (`dev`):

- Builds active project.
- Serves `dist/projects/<active-slug>/`.
- Watches active project files.

All-project mode (`dev:all`):

- Builds every project.
- Serves `dist/` (dashboard + project outputs).
- Watches all project folders.

Dev server manifest examples:

- `.agency/dev-servers/project-csscroll.json`
- `.agency/dev-servers/all-projects.json`

Each manifest includes:

- `id`, `mode`, `project`, `rootDir`, `host`, `port`, `url`, `generatedAt`

## 9) Build Pipeline

Per project:

1. Sass compile.
2. PostCSS autoprefix.
3. CSS minify and `.min.css` output.
4. JS build:
   - esbuild engine when available.
   - legacy concat/uglify fallback in dual mode.
5. Image optimization with sharp for jpg/png/webp.
6. Static copy for html/fonts/docs/misc.
7. Vendor script copy.

## 10) Scaffold Behavior

Auto-scaffold runs during project-state prep and on `scaffold` command:

- Ensures required directories exist.
- Generates missing files from templates.
- Preserves existing files.
- Migrates supported legacy layouts when enabled.

## 11) Usage Cookbook (35 Examples)

1. `cmd /c npm run scaffold`
2. `cmd /c npm run list:projects`
3. `cmd /c npm run build`
4. `cmd /c npm run build -- --project csscroll`
5. `cmd /c npm run build:project -- --project csscroll`
6. `cmd /c npm run build:all`
7. `cmd /c npm run dev`
8. `cmd /c npm run dev -- --project csscroll`
9. `cmd /c npm run dev -- --project Csscroll`
10. `cmd /c npm run dev -- --port 5200`
11. `cmd /c npm run dev -- --project csscroll --port 5200`
12. `cmd /c npm run dev:project -- --project csscroll`
13. `cmd /c npm run dev:all`
14. `cmd /c npm run dev:all -- --port 5300`
15. `$env:PROJECT='csscroll'; cmd /c npm run dev`
16. `$env:DEV_PORT='5400'; cmd /c npm run dev`
17. `$env:LIVERELOAD_PORT='35740'; cmd /c npm run dev`
18. `npx gulp --tasks-simple`
19. `npx gulp listProjects`
20. `npx gulp build --project=csscroll`
21. `npx gulp dev --project=csscroll --port=5174`
22. `npx gulp devAll --port=5175`
23. `Get-ChildItem .\projects -Directory`
24. `Get-ChildItem .\projects\Csscroll -Recurse`
25. `Get-Content .\projects\Csscroll\project.config.json`
26. `Get-Content .\agency.config.json`
27. `Get-Content .\.agency\dev-servers\project-csscroll.json`
28. `Get-Content .\.agency\dev-servers\all-projects.json`
29. `Get-ChildItem .\dist\projects\csscroll -Recurse -File`
30. `Get-Content .\dist\index.html`
31. `cmd /c npm run clean`
32. `cmd /c npm run scaffold && cmd /c npm run build:all`
33. `cmd /c npm run dev -- --project missing-project`
34. `cmd /c npm run build -- --project missing-project`
35. `cmd /c npm run list:projects && cmd /c npm run dev:all`

## 12) Troubleshooting

Common checks:

- `node --check gulpfile.mjs`
- `cmd /c npm run list:projects`
- `Get-ChildItem .\projects -Directory`
- `Get-Content .\agency.config.json`
- `Get-ChildItem .\.agency\dev-servers -File`
- `netstat -ano | Select-String ':5173|:35729'`

If PowerShell blocks npm script launcher:

- Use `cmd /c npm run <script>` as shown in examples.

If JS logs show `esbuild is unavailable`:

- current dual mode automatically falls back to legacy JS pipeline.
- optional install when network access is available: `cmd /c npm i -D esbuild`.
