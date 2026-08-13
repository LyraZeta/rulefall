import type { WorkspaceSnapshot } from '../core'

const oversizedCodexRule = `${'# Payment implementation details\n\n'}${'- Keep handlers deterministic and auditable.\n'.repeat(900)}`

export const demoWorkspace: WorkspaceSnapshot = {
  name: 'orbit-payments',
  files: [
    {
      path: 'AGENTS.md',
      content: '# Repository instructions\n\n- Run focused tests before edits.\n- Prefer pnpm.\n',
    },
    {
      path: 'CLAUDE.md',
      content: '# Project memory\n\nUse concise explanations and preserve public API compatibility.\n',
    },
    {
      path: '.claude/CLAUDE.md',
      content: '# Shared Claude memory\n\nRead package contracts before changing a payment boundary.\n',
    },
    {
      path: '.cursor/rules/foundation.mdc',
      content: '---\ndescription: Repository-wide TypeScript conventions\nalwaysApply: true\n---\n\nPrefer explicit return types for exported functions.\n',
    },
    {
      path: '.cursor/rules/tests.mdc',
      content: '---\ndescription: Test conventions\nglobs: "**/*.test.ts"\nalwaysApply: false\n---\n\nUse behavior-focused test names.\n',
    },
    {
      path: '.cursor/rules/observability.mdc',
      content: '---\ndescription: Observability guidance\nalwaysApply: false\n---\n\nUse structured logging and redact payment data.\n',
    },
    {
      path: '.cursor/rules/manual-release.mdc',
      content: '---\nalwaysApply: false\n---\n\nOnly attach this rule during a release.\n',
    },
    {
      path: '.github/copilot-instructions.md',
      content: '# Copilot instructions\n\nFollow the repository test plan and never expose secrets.\n',
    },
    {
      path: '.github/instructions/source.instructions.md',
      content: '---\napplyTo: "**/*.ts,**/*.tsx"\n---\n\nUse strict TypeScript and validate network input.\n',
    },
    {
      path: '.github/instructions/docs.instructions.md',
      content: '---\napplyTo: "docs/**/*.md"\n---\n\nUse sentence case headings.\n',
    },
    {
      path: 'apps/web/src/AGENTS.md',
      content: '# Web application instructions\n\nUse shared money helpers and test payment mutations.\n',
    },
    {
      path: 'apps/web/src/AGENTS.override.md',
      content: '# Active web override\n\nNever log a full payment object. Use the request id for tracing.\n',
    },
    {
      path: 'apps/web/CLAUDE.md',
      content: '# Web memory\n\nRendering stays in React; business rules stay in domain modules.\n',
    },
    {
      path: 'apps/web/.cursor/rules/refunds.mdc',
      content: '---\ndescription: Payment safety checks\nglobs: "src/payments/**/*.ts"\nalwaysApply: false\n---\n\nRequire an idempotency key for refund mutations.\n',
    },
    {
      path: 'apps/web/src/payments/AGENTS.md',
      content: oversizedCodexRule,
    },
    {
      path: 'apps/web/src/payments/CLAUDE.md',
      content: '# Refund memory\n\nSettled payments need a compensating ledger entry.\n',
    },
    {
      path: 'apps/web/src/payments/refund.ts',
      content: "import { toMinorUnits } from '@orbit/money'\n\nexport function refund(amount: number) {\n  return toMinorUnits(amount)\n}\n",
    },
    {
      path: 'apps/web/src/payments/refund.spec.ts',
      content: "import { refund } from './refund'\n\ntest('refunds a settled payment', () => {\n  expect(refund(12)).toBe(1200)\n})\n",
    },
    {
      path: 'apps/web/src/payments/capture.ts',
      content: 'export const capture = (amount: number) => ({ amount, state: \'captured\' })\n',
    },
    {
      path: 'apps/web/src/components/PaymentCard.tsx',
      content: 'export function PaymentCard() { return <article>Payment</article> }\n',
    },
    {
      path: 'apps/web/src/app.tsx',
      content: "import { PaymentCard } from './components/PaymentCard'\nexport const App = PaymentCard\n",
    },
    {
      path: 'apps/api/AGENTS.md',
      content: '# API instructions\n\nValidate every request body at the boundary.\n',
    },
    {
      path: 'apps/api/CLAUDE.md',
      content: '# API memory\n\nHandlers return typed error envelopes.\n',
    },
    {
      path: 'apps/api/src/refunds.ts',
      content: 'export async function createRefund() { return { status: 202 } }\n',
    },
    {
      path: 'apps/api/src/index.ts',
      content: "export { createRefund } from './refunds'\n",
    },
    {
      path: 'packages/money/src/AGENTS.md',
      content: '# Money instructions\n\nAll arithmetic uses integer minor units.\n',
    },
    {
      path: 'packages/money/.claude/CLAUDE.md',
      content: '# Money memory\n\nCurrency precision comes from ISO metadata.\n',
    },
    {
      path: 'packages/money/src/currencies.ts',
      content: "export const supportedCurrencies = ['USD', 'EUR', 'JPY'] as const\n",
    },
    {
      path: 'packages/money/src/minorUnits.ts',
      content: 'export const toMinorUnits = (value: number) => Math.round(value * 100)\n',
    },
    {
      path: 'packages/money/src/index.ts',
      content: "export { toMinorUnits } from './minorUnits'\n",
    },
    {
      path: 'packages/config/src/env.ts',
      content: "export const environment = 'demo'\n",
    },
    {
      path: 'docs/refunds.md',
      content: '# Refunds\n\nRefunds create compensating ledger entries.\n',
    },
    {
      path: 'package.json',
      content: '{"name":"orbit-payments","private":true,"packageManager":"pnpm@11"}\n',
    },
    {
      path: 'pnpm-workspace.yaml',
      content: "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
    },
    {
      path: 'tsconfig.json',
      content: '{"compilerOptions":{"strict":true}}\n',
    },
    {
      path: 'README.md',
      content: '# Orbit Payments\n\nSynthetic monorepo for Rulefall.\n',
    },
  ],
}
