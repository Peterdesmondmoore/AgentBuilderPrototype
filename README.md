# Mission Surface dual-mode prototype starter

This starter contains one fixture-only live mobile example and one screenshot-delivered laptop example. Keep these baseline samples intact; add product prototypes with new identities while preserving the root/child relationships.

The starter is configured for one Mission Surface Product through `productKey`. It is intentionally independent of any company, GitHub owner or repository. The root and child manifests share a repository-independent `catalogueId`; do not replace it with a repository name. Mission Surface establishes the authoritative repository-to-Product relationship when an authorised repository is connected.

The included `mobile-sample` and `laptop-sample` prototypes are protected **Mission Surface baseline samples**, identified by `isSample: true` in both the root catalogue and child manifests. Mission Surface must classify them as samples, not product prototypes. Do not modify or regenerate these baselines during unrelated prototype work; create a new prototype key and directory instead. A baseline may change only when that baseline change is explicitly requested.

From a PowerShell terminal at the repository root, run:

```powershell
.\prepare-images.ps1
```

The script installs the locked `demo/` dependencies, captures screenshots, runs the repository-local manifest and screenshot validators, builds the live prototype, and finishes with `git status --short`. Review the resulting files before deliberately committing and pushing them. The script never commits, pushes, creates a repository, or changes Git remotes.

The public Vite bundle must import only live-mode code. Capture source and screenshot artifacts stay outside `demo/`. CI validates committed screenshots but never generates them.

During GitHub Actions publishing, `demo/vite.config.ts` derives the repository owner, repository name, Pages origin and Vite base path from `GITHUB_REPOSITORY`. No repository-specific deployment values need to be edited into the starter. A local build uses relative assets and a localhost descriptor origin for validation only.

Every child is a **Simulated experience** and must list its limitations. `approved` means the target UX is approved; it does not indicate production readiness, security approval, integration completeness or implementation approval.

See `AGENTS.md` and `schemas/` before changing the contract. Screen explainers belong inside the prototype application, not in the manifest or Mission Surface. Show the relevant guide automatically when a user enters its screen, include a **Got it** action, and keep dismissal in local component state so returning to the screen shows the guide again.

Mission Surface only hosts the prototype iframe. A live prototype may optionally listen for its verified bridge's `explain` message to re-open the current screen's own guide, but it must remain usable when no such message is received.
