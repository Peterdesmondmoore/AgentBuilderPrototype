# Mission Surface prototype standards

These instructions apply to every prototype, capture source and public demo in this repository.

## Product boundary

- Build disposable, fixture-only experience-validation prototypes. Do not add authentication, production APIs, analytics, databases, credentials or enterprise data.
- Mission Surface is the catalogue and review surface. It reads this repository through a read-only GitHub App and never clones, builds, deploys or writes to it.
- Every child manifest and matching root catalogue entry declares `isSample`. Mission Surface treats `isSample: true` as a Mission Surface sample rather than a product prototype; product prototypes must declare `isSample: false`.
- Every child manifest declares exactly one `deliveryMode`: `live` or `screenshots`. A repository may mix modes.
- Every child declares `schemaVersion: 1`, `fidelity: simulated` and a non-empty `limitations` list. Display these limits wherever the prototype is reviewed.
- `approved` means: “The demonstrated experience has been approved as the target UX. It does not indicate production readiness, security approval, integration completeness or implementation approval.” Never imply otherwise.

## Protected baseline samples

- `mobile-sample` and `laptop-sample` are the Mission Surface baseline samples. Refer to them as **baseline samples**, not as product prototypes.
- Their manifests, routes, fixture content, capture source, screenshots and live demo behavior form the stable baseline for validating Mission Surface ingestion and review behavior.
- Do not update, regenerate or re-capture either baseline sample as a consequence of unrelated repository work. Work on new product prototypes must use new prototype keys and separate child directories.
- Change a baseline sample only when the user explicitly requests a baseline change. Keep `isSample: true` on both baseline samples and update all affected baseline assets deliberately in the same change.

## Shared metadata contract

- Store the root catalogue at `prototype.json` and each child at `prototypes/<prototype-key>/prototype.json`.
- Preserve stable `productKey`, `prototypeKey`, `catalogueId` and manifest-path relationships. `catalogueId` links the root and child manifests and must not be derived from a repository name.
- Root entries mirror each child’s `isSample`, `deliveryMode` and `formFactor`.
- Child pages are stable, case-sensitive review identifiers. Comments and live page events must use an exact `pages[]` value.
- Define optional page-specific Explain annotations as numbered percentage anchor coordinates, an optional plain-text `title` of no more than 120 characters, and plain-text content. Mission Surface displays the title as the callout heading when supplied and otherwise generates `Annotation {number}`. Render each annotation as a fixed-position text callout with a pointer aimed at its anchor; do not use tooltip-only text or let the callout move with prototype scrolling. While Explain is selected, show all callouts for the current page. While Explain is off, keep each anchor as an invisible keyboard-focusable and pointer-selectable hotspot: shade it on hover or focus, and reveal its callout on hover, focus or activation. Callouts must remain evaluative, dismissible, non-blocking and usable without hover.
- For annotation rendering, mobile callout boxes stay outside the application frame, while laptop callout boxes appear on the visible review screen. Mission Surface owns both presentations.
- Validate with `npm run validate` from `demo/` before completion.

## Live / Public prototypes

- Use React, TypeScript and Vite unless an existing live prototype has another static-web stack.
- Keep `demoPath`, `entryRoute`, `pages` and `integration: { protocol: "mission-surface-prototype", version: 2 }` accurate.
- Use local fixture data only. Treat every Pages asset and route as publicly reachable.
- Use hash routing, a restrictive CSP and the parent-provided bridge channel. Ready and page events post only the protocol, version, channel, prototype key, event type and an exact declared page. A viewport event may additionally post numeric `scrollX`, `scrollY`, `viewportWidth`, `viewportHeight`, `documentWidth` and `documentHeight`; never post DOM content, selectors, user data, tenant data or production data.
- The public Pages output may contain live-mode application code only. Do not import screenshot-mode capture source or screenshot artifacts into `demo/`.
- The generated `mission-surface-deployment.json` must contain the GitHub build revision, Pages origin, protocol version, CSP and exact live prototype keys.
- Derive repository owner, repository name, Pages origin and Vite base path from the GitHub Actions environment. Do not add repository or tenant identity to published manifests.

## Private / Images prototypes

- Declare exactly one screenshot descriptor for every page, in page order. Reject missing, duplicate and additional mappings.
- Keep artifacts within `prototypes/<prototype-key>/screenshots/`. Allow static PNG, JPEG and WebP only; never SVG, GIF or animation.
- Generate artifacts locally with `npm run capture:screenshots`. CI validates committed images and must not generate or modify them.
- Individual files are limited to 5 MiB, all repository screenshots to 25 MiB, dimensions to 4096 × 4096 and decoded pixels to 16,777,216.
- Capture tooling and source stay outside `demo/` and are never part of the public Pages bundle.

## Journey and review quality

- Provide a clear start, meaningful transitions and observable end state. Make every demonstrated primary action work.
- Optimise mobile prototypes for 320–430 px and laptop screenshots for a 1280–1440 px workspace.
- Mission Surface owns fullscreen, Explain, navigation overlays, comments and Product Hub request submission for both modes. Child demos must not collect or receive tenant, user, feedback, authentication or production data.

## Completion checks

- Run `npm run validate`, `npm run validate:screenshots` and `npm run build` from `demo/`.
- Confirm the public build contains only live-mode code and the starter ZIP matches `starter-template/`.
- Confirm all manifests, deployment metadata, routes, bridge pages, screenshots, annotations, fidelity disclosures and limitations are current.
