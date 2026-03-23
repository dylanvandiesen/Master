# Diesign Runtime Baseline

## Scope
- This document describes the live standalone app in `projects/diesign/src/`.
- It does not describe the root playground scaffold in `src/index.html`, `src/js/main.js`, or `src/scss/main.scss`.
- The current build contract remains the standalone webpack app in `projects/diesign`.

## Build And Entry Contract
- Webpack entrypoints stay `preloader` and `main`.
- `src/index.ejs` is the app shell entry template.
- The template is now composed from partials under `src/templates/`.
- The standalone commands remain `npm start` and `npm run build` inside `projects/diesign`.
- Production output still targets `projects/diesign/dist/`.

## App Contract
- Route model stays `/`, `/work`, `/work/:projectId`, `/about`, and `/contact`.
- Route changes still emit `CustomEvent('routechange')` with `{ path, previousPath }`.
- Native browser primitives remain core to the app:
  - History API
  - Popover API
  - `<template>`
  - `<details>` and `::details-content`
  - `IntersectionObserver`
  - `ResizeObserver`
  - `MutationObserver`
  - `requestAnimationFrame`
  - `requestIdleCallback` fallback
  - `visualViewport`
  - container queries
  - `:has()`

## Preserved DOM Hooks
- The following hooks are treated as stable runtime selectors:
  - `#app`
  - `#loader`
  - `#stage`
  - `#bg`
  - `#mbg`
  - `#mg`
  - `#fg`
  - `#home`
  - `#nav-home`
  - `#nav-work`
  - `#nav-about`
  - `#nav-contact`
  - `[data-route-view]`
  - `[data-panel-shell-slot]`
  - `[data-panel-shell]`
  - `[data-panel-scroller]`
  - `[data-panel-swap]`
  - `[data-panel-scroll]`
  - `[data-panel-body]`
  - `[data-home-overlay]`
  - `[data-effect]`
  - `.project-pop`
  - `.oversnap-scroller`
  - `.project-content`
  - `.contact-options`
  - `.hoverBox`

## Feature Baseline
- Home:
  - animated DIESIGN intro logo
  - subtitle `Designer & front-end astronaut`
  - click-triggered meteor shower burst
  - home-only scheduled meteor sequences
- Work:
  - grid of project thumbnails from `src/data/projects.json`
  - popover deep links per project id
  - deferred video hydration from `.video-placeholder`
  - prev/next controls and fine-pointer drag snapping
- About:
  - profile image card and biography copy
- Contact:
  - tel link
  - CV link
  - LinkedIn link
  - direct `formsubmit.co` POST form

## Styling Baseline
- `src/scss/index.scss` is now a manifest-only entry.
- Cascade layer order is:
  - `reset`
  - `tokens`
  - `base`
  - `layout`
  - `components`
  - `routes`
  - `effects`
  - `utilities`
  - `states`
- Typed custom properties currently registered:
  - `--panel-shell-block-size`
  - `--panel-shell-inline-size`
  - `--panel-layer-fit-scale`
  - `--panel-layer-offset-x`
  - `--panel-layer-offset-y`
  - `--panel-overlay-opacity`
  - `--home-intro-progress`
- Feature styles are split into partial modules under `src/scss/tokens/`, `src/scss/components/`, `src/scss/routes/`, and `src/scss/effects/`.

## JavaScript Baseline
- `src/js/index.js` is now a thin entry.
- Runtime orchestration is grouped by responsibility:
  - `src/js/app/bootstrap.js`
  - `src/js/app/router.js`
  - `src/js/app/route-shell.js`
  - `src/js/features/effects/initialize-visuals.js`
  - `src/js/features/media/lazy-elements.js`
  - `src/js/features/work/popover-media.js`
  - `src/js/features/work/popover-scroll-snap.js`
  - `src/js/state/home-state.js`
- Compatibility re-export files remain in `src/js/components/` during phase 1 so existing imports do not break.
- `window.preloaderReady` is still part of the bootstrap contract.
- `window.observeLazyElements` is kept as a temporary compatibility bridge during the JS split.

## Manual Regression Checklist
- Load `/` directly.
- Load `/work`, `/about`, and `/contact` directly.
- Load at least one `/work/:projectId` deep link directly.
- Open and close project popovers.
- Use browser back and forward between routes and open popovers.
- Confirm home meteor auto-schedule starts only on `/`.
- Confirm clicking the intro still triggers a meteor burst.
- Confirm work thumbnails lazy-load and remain interactive.
- Confirm video placeholders are replaced only after popover initialization.
- Confirm fine-pointer drag scrolling still works in project popovers.
- Confirm touch and coarse-pointer scrolling remains native.
- Confirm contact form fields retain typed values across route changes.
- Confirm the standalone build still emits assets, favicons, fonts, videos, and `.htaccess`.
