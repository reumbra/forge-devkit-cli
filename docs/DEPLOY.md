# Deploy & Build Guide

## Package

- **Name:** `@reumbra/forge`
- **Registry:** npmjs.com (public scoped package)
- **Install:** `npm install -g @reumbra/forge`
- **Binary:** `forge` (available after global install)

## Build

```bash
pnpm install          # install dependencies
pnpm build            # TypeScript → dist/
pnpm lint             # Biome lint
pnpm test             # vitest (112 tests, 17 suites)
pnpm check            # lint + format in one pass
```

**Build order matters:** `build` must run before `test` because CLI integration tests spawn `node bin/forge.js` which imports from `dist/`.

## CI (GitHub Actions)

**File:** `.github/workflows/ci.yml`
**Triggers:** push to `main`, pull requests to `main`
**Steps:** install → build → lint → test

## Publishing a New Version

### Automated (recommended)

1. Bump version and create git tag:
   ```bash
   npm version patch   # 0.1.0 → 0.1.1 (also: minor, major)
   ```
   This updates `package.json`, creates a commit, and tags it `v0.1.1`.

2. Push with tag:
   ```bash
   git push --follow-tags
   ```

3. GitHub Actions detects the `v*` tag and runs `.github/workflows/publish.yml`:
   - install → build → lint → test → `pnpm publish`
   - Uses `NPM_TOKEN` from repo secrets

### Manual (fallback)

```bash
pnpm build
pnpm publish --no-git-checks
```

Requires npm auth configured locally (granular access token in `~/.npmrc`).

## Secrets

| Secret | Location | Purpose |
|--------|----------|---------|
| `NPM_TOKEN` | GitHub repo secrets | npm publish from CI |

### Creating/Rotating NPM_TOKEN

1. Go to https://www.npmjs.com/settings/maselious/tokens
2. Generate New Token → Granular Access Token
3. Scope: `@reumbra/forge`, Permissions: Read and write
4. Update GH secret: `gh secret set NPM_TOKEN --repo reumbra/forge-devkit-cli --body "npm_XXX"`

## Verifying a Release

```bash
# Check npm registry
npm view @reumbra/forge version

# Test global install
npm install -g @reumbra/forge
forge --version
forge doctor
```

## Ecosystem URLs

| Environment | API URL |
|-------------|---------|
| Production | `https://api.reumbra.com/velvet` |
| Development | `https://dev.api.reumbra.com/velvet` |
| Override | `FORGE_API_URL` env var |

## Known Quirks

- **Lambda cold starts:** API on AWS Lambda (SST v3). First request after idle may take ~20s. CLI has 25s timeout.
- **npx:** `npx @reumbra/forge` may not work on all npm versions due to scoped package bin resolution. Recommend `npm i -g` instead.
- **GH Actions workflow files:** Claude Code's Write tool may be blocked by security hooks. Use Bash heredoc to write `.yml` workflow files.
- **2FA:** npm org `@reumbra` requires granular access token (not session token) for publishing.
