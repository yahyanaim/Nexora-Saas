# Contributing to Nexora

Nexora is proprietary software (see `LICENSE`). These rules apply to the owner, to contracted developers and to licensees who change the code for their own use.

## Workflow

1. Branch from `main`: `git checkout -b feature/<short-name>` (or `fix/…`, `docs/…`).
2. Keep each branch to one topic. Small pull requests are reviewed and merged faster.
3. Write commit messages in the imperative, with a short title (max. 72 characters) and an optional body that explains *why*:
   ```
   Add receivables aging report

   Accountants need open balances grouped by days overdue for month-end.
   ```
4. Open a pull request against `main`. CI must be green before it is merged.

## Checklist before every pull request

```bash
npm run typecheck     # no TypeScript errors
npm run lint          # zero warnings
npm test              # all unit tests pass
npm run i18n:check    # all 9 language files in sync
```

For UI changes, also:
- check the page at desktop width and at **390px** (phone): no horizontal scrolling, and header buttons on one line on desktop
- check **dark mode** and **Arabic (RTL)**
- check the **loading** and **empty** states.

## Code conventions

| Topic | Rule |
| :--- | :--- |
| Business logic | Goes in `src/lib/workforce/` as pure functions (no React, no `window`, no `Date.now()` without a `today` parameter), with tests next to it |
| Data access | Only through `src/lib/api/`. Components never touch Local Storage or `fetch` directly |
| Server state | React Query hooks in `src/hooks/workforce/`. Invalidate the related queries after every mutation |
| Pages | `src/components/shared/work-<module>-chunks/`. The route file in `app/[locale]/…/page.tsx` only renders the page component |
| UI | Use the components in `src/components/ui/`, especially `Select`, `DropdownMenu`, `Popover`, `Dialog`, `Sheet` and `PageHeader`. Do not build your own popups: the shared ones are portalled and never clipped |
| Styling | Tailwind with the design tokens (`bg-card`, `text-muted-foreground`, `border-border`, `text-danger-foreground`…). No hard-coded colours. Use logical spacing (`ms-`/`me-`) for RTL |
| Texts | Never hard-code user-facing text. Add a key to **all 9** `src/messages/*.json` files |
| Permissions | Hide actions with `can(user, AdminPermissionsPlatform.X)`. Money and cost figures need `COSTS_READ` |
| Money and dates | Dates are ISO strings `YYYY-MM-DD`. Amounts are rounded with the helpers in `billing.ts` |
| Exports | CSV through `exportToCsv`, Excel through `downloadXlsx`. Both neutralize formulas, so never write your own exporter |

## Tests

- Every new rule in `src/lib/workforce/` needs unit tests covering normal cases, edge cases and the business rule it protects.
- Bug fixes come with a test that failed before the fix.
- End-to-end tests (`e2e/`) cover sign-in and the main navigation. Add one when a new critical flow is created.

## Next.js version

This project uses **Next.js 16**, which has breaking changes compared with older versions. Read the relevant guide in `node_modules/next/dist/docs/` before changing routing, rendering or configuration.

## Security

- Never commit secrets. Use `.env.local`, which git ignores.
- Never enable `NEXT_PUBLIC_DEMO_MODE` in production.
- Report vulnerabilities privately to the owner ([github.com/yahyanaim](https://github.com/yahyanaim)), not in public issues.
