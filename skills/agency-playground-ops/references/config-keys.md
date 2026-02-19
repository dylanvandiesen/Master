# Agency Config Keys

## Core
- `projectsDir`: source project folder root.
- `distDir`: compiled output root.
- `activeProject`: default project when no CLI/env override exists.

## Dev Server
- `server.host`
- `server.startPort`
- `server.maxPortAttempts`
- `server.indexFile`
- `server.spaFallback`
- `server.autoGenerateManifest`
- `server.manifestDir`

## Build Pipeline
- `styles.entries`, `styles.loadPaths`
- `scripts.engine`, `scripts.mode`, `scripts.entries`, `scripts.legacyEntries`
- `watch.project`, `watch.debounceMs`
- `images.pattern`, quality/compression keys
- `static.html`, `static.fonts`, `static.docs`, `static.misc`
- `vendor.scripts`

## Project Override File
Each project can override root defaults in:
- `projects/<ProjectName>/project.config.json`
