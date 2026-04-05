---
name: git
description: Commit and push to GitHub under Sonic-Tales org. Handles credential quirks and phase-tagged commits.
---

# Git Skill

Commit and push to `Sonic-Tales/tb-web`.

## Hard-Won Lessons

### Dual GitHub accounts
`rajesh-naroth_hpeprod` may be active. Before any push:
```bash
gh auth switch --user rajeshnaroth
```

### Credential helper — do NOT use `git config`
`git config` double-escapes the `!`. Edit `.git/config` directly:
```
[credential]
	helper =
	helper = !gh auth git-credential
```
Empty `helper =` clears inherited `osxkeychain`.

### Fallback push
```bash
git push https://$(gh auth token)@github.com/Sonic-Tales/tb-web.git main
```

## Commit Convention

Format: `[phase] description`

Examples: `[tb7] wire Cognito auth`, `[tb8] add Dockerfile`, `[fix] budget grid OT calc`
