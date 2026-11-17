## Summary
Explain what this PR changes.

## Template & CI Checklist
- [ ] `registry/` does not import from `app/` or `site.config.ts`
- [ ] Template `id` is kebab-case and matches `registry/templates/<id>/` and `meta.json`
- [ ] Every string Zod field declares a finite positive `.max(n)` length cap
- [ ] `sample` passes `params`, uses only Latin/Cyrillic characters, and renders cleanly at `1200x630`
- [ ] Original design with no trademarked logos and no copyrighted or non-open-licensed assets
- [ ] Generated index & preview map synced via `npm run templates:sync`
- [ ] Previews generated via `npm run preview:build` (`1200x630` PNG; **visually inspected** since CI checks dimensions only)
- [ ] Registry rebuilt via `npm run registry:build` (`public/r/` up to date)
- [ ] Local checks pass: `npm run lint`, `npx next typegen`, `npx tsc --noEmit`, `npm test`, `npm run build`
