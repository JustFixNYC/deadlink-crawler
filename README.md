# Deadlink Checker

Hybrid deadlink checker for JustFix front-end projects. It combines:

1. **Source scanning** — extracts `http(s)` URLs from TSX, JSON, and PO files with file:line locations
2. **Live crawling** — uses Playwright to render public SPA routes and collect DOM links
3. **HTTP validation** — checks each unique URL with retries
4. **GitHub issue reporting** — creates or updates a single open **Dead Links** issue

## Usage in a front-end repo

Add a `deadlink.config.yml` to the project root (see `deadlink.config.schema.json`).

```yaml
siteUrl: https://example.org
locales: [en, es]

publicRoutes:
  - /
  - /privacy_policy

sourceGlobs:
  - src/**/*.{tsx,ts,json,po}
  - src/data/*.json

skipPatterns:
  - images\.ctfassets\.net
  - googletagmanager\.com

dynamicUrlSamples:
  locale: en
```

Add a GitHub Actions workflow (see [`examples/deadlink.workflow.yml`](examples/deadlink.workflow.yml)).
The default schedule is **monthly** — 1st of each month at 05:00 UTC:

```yaml
on:
  schedule:
    # Monthly: 1st of each month at 05:00 UTC
    - cron: "0 5 1 * *"
  workflow_dispatch:

jobs:
  find_dead_links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: JustFixNYC/deadlink-crawler@v3.0.2
        with:
          config-path: deadlink.config.yml
          token: ${{ secrets.GITHUB_TOKEN }}
```

The workflow stays green when broken links are found; it opens or updates a **Dead Links** issue instead. A `deadlink-report.json` artifact is uploaded for debugging.

## Local development

```bash
npm install
npx playwright install chromium
npm run build
```

Run against a project from the checker repo:

```bash
node dist/cli.js \
  --workspace ../gce-screener \
  --config deadlink.config.yml
```

Source-only mode (faster, no Playwright):

```bash
node dist/cli.js \
  --workspace ../gce-screener \
  --config deadlink.config.yml \
  --skip-live-crawl
```

## Action inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `config-path` | No | `deadlink.config.yml` | Config file path in the checked-out repo |
| `token` | Yes | — | GitHub token for issue creation |
| `skip-live-crawl` | No | `false` | Source scan only |

## Issue format

When broken links are found, the action updates an existing open **Dead Links** issue or creates one. The body includes:

- **By URL** — broken URL, HTTP status, and all references
- **By source file** — `file:line` locations for developer fixes
- **By live page** — pages where broken links appeared in rendered HTML

## Notes

- **Auth-gated routes** are excluded from live crawl via `publicRoutes`. Source scanning still checks external URLs in protected-page components.
- **Dynamic template URLs** containing `${variable}` are skipped unless `dynamicUrlSamples` provides substitution values.
- Some government sites return **403** to automated checkers even when the link works in a browser. Review those manually or add site-specific `skipPatterns` if needed.
- **rent-history** uses `https://demo-rent-history.netlify.app` until `https://stabilizednyc.org` is configured on Netlify.

## Deployment

Build, commit, and tag a release:

```bash
npm run build
git add -A
git commit -m "Release v3.0"
git tag -a -m "Hybrid source + Playwright deadlink checker" v3.0
git push --follow-tags
```

## Migration from v2.x

v2.x used linkinator to crawl a single live URL. v3.0 replaces that with:

- Per-project `deadlink.config.yml`
- Source file scanning with file:line reporting
- Explicit public route lists for Playwright
- Issue update instead of duplicate issues
- Requires `actions/checkout` before the action step
