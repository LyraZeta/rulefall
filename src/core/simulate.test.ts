import { describe, expect, it } from 'vitest'
import { demoWorkspace } from '../data/demoWorkspace'
import { byteLength, calculateMetrics, normalizePath } from './helpers'
import { calculateSummary, simulate, simulateAll } from './simulate'
import type {
  LifecyclePhase,
  ProviderId,
  ResolutionEvent,
  WorkspaceSnapshot,
} from './types'

const baseInput = {
  workspace: demoWorkspace,
  cwd: 'apps/web/src/payments',
  targetPath: 'apps/web/src/payments/refund.ts',
  phase: 'edit' as LifecyclePhase,
}

function compact(events: ResolutionEvent[]) {
  return events
    .filter((event) => event.action !== 'ignored')
    .map(({ sourcePath, action, phase, confidence }) => ({ sourcePath, action, phase, confidence }))
}

function forProvider(provider: ProviderId) {
  return compact(simulate({ ...baseInput, provider }))
}

describe('provider golden traces', () => {
  it('models Codex startup ancestry, override precedence, and the default byte budget', () => {
    expect(forProvider('codex')).toMatchInlineSnapshot(`
      [
        {
          "action": "loaded",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": "AGENTS.md",
        },
        {
          "action": "shadowed",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": "apps/web/src/AGENTS.md",
        },
        {
          "action": "loaded",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": "apps/web/src/AGENTS.override.md",
        },
        {
          "action": "truncated",
          "confidence": "conditional",
          "phase": "startup",
          "sourcePath": "apps/web/src/payments/AGENTS.md",
        },
        {
          "action": "deferred",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": "apps/api/AGENTS.md",
        },
        {
          "action": "deferred",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": "packages/money/src/AGENTS.md",
        },
      ]
    `)
  })

  it('models Claude launch ancestry and target-triggered descendant memory', () => {
    expect(forProvider('claude')).toMatchInlineSnapshot(`
      [
        {
          "action": "loaded",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": "CLAUDE.md",
        },
        {
          "action": "loaded",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": ".claude/CLAUDE.md",
        },
        {
          "action": "loaded",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": "apps/web/CLAUDE.md",
        },
        {
          "action": "loaded",
          "confidence": "exact",
          "phase": "startup",
          "sourcePath": "apps/web/src/payments/CLAUDE.md",
        },
        {
          "action": "deferred",
          "confidence": "exact",
          "phase": "edit",
          "sourcePath": "apps/api/CLAUDE.md",
        },
        {
          "action": "deferred",
          "confidence": "exact",
          "phase": "edit",
          "sourcePath": "packages/money/.claude/CLAUDE.md",
        },
      ]
    `)
  })

  it('models Cursor always, glob, agent-requested, and manual rule types', () => {
    expect(forProvider('cursor')).toMatchInlineSnapshot(`
      [
        {
          "action": "loaded",
          "confidence": "conditional",
          "phase": "startup",
          "sourcePath": ".cursor/rules/foundation.mdc",
        },
        {
          "action": "deferred",
          "confidence": "conditional",
          "phase": "edit",
          "sourcePath": ".cursor/rules/tests.mdc",
        },
        {
          "action": "deferred",
          "confidence": "conditional",
          "phase": "edit",
          "sourcePath": ".cursor/rules/observability.mdc",
        },
        {
          "action": "deferred",
          "confidence": "conditional",
          "phase": "edit",
          "sourcePath": ".cursor/rules/manual-release.mdc",
        },
        {
          "action": "loaded",
          "confidence": "conditional",
          "phase": "edit",
          "sourcePath": "apps/web/.cursor/rules/refunds.mdc",
        },
      ]
    `)
  })

  it('models Copilot repository-wide and applyTo instructions', () => {
    expect(forProvider('copilot')).toMatchInlineSnapshot(`
      [
        {
          "action": "loaded",
          "confidence": "conditional",
          "phase": "discovery",
          "sourcePath": ".github/copilot-instructions.md",
        },
        {
          "action": "loaded",
          "confidence": "conditional",
          "phase": "edit",
          "sourcePath": ".github/instructions/source.instructions.md",
        },
        {
          "action": "deferred",
          "confidence": "conditional",
          "phase": "edit",
          "sourcePath": ".github/instructions/docs.instructions.md",
        },
      ]
    `)
  })
})

describe('phase and metrics', () => {
  it('keeps future known sources visible as deferred events', () => {
    const events = simulate({ ...baseInput, provider: 'copilot', phase: 'startup' })
    expect(events.find((event) => event.sourcePath === '.github/copilot-instructions.md')?.action)
      .toBe('deferred')
    expect(events.find((event) => event.sourcePath.endsWith('source.instructions.md'))?.action)
      .toBe('deferred')
  })

  it('produces divergent contexts and transparent aggregate metrics', () => {
    const results = simulateAll(baseInput)
    const summary = calculateSummary(results)
    expect(results).toHaveLength(4)
    expect(summary.distinctContexts).toBe(4)
    expect(summary.instructionSources).toBeGreaterThanOrEqual(16)
    expect(summary.actionCounts.shadowed).toBeGreaterThan(0)
    expect(summary.actionCounts.truncated).toBeGreaterThan(0)
    expect(summary.estimatedTokens).toBeGreaterThan(1_000)
  })
})

describe('instruction content boundaries', () => {
  it('loads the root legacy .cursorrules format as deprecated and conditional', () => {
    const workspace: WorkspaceSnapshot = {
      name: 'legacy-cursor',
      files: [
        { path: '.cursorrules', content: 'Keep changes focused.\n' },
        { path: 'src/main.ts', content: 'export {}\n' },
      ],
    }

    const event = simulate({
      provider: 'cursor',
      workspace,
      cwd: '.',
      targetPath: 'src/main.ts',
      phase: 'edit',
    }).find(({ sourcePath }) => sourcePath === '.cursorrules')

    expect(event).toMatchObject({
      action: 'loaded',
      confidence: 'conditional',
      phase: 'startup',
      ruleKind: 'legacy project rule',
    })
    expect(event?.reason).toContain('deprecated')
  })

  it.each([
    {
      provider: 'cursor' as const,
      path: '.cursor/rules/typescript.mdc',
      frontmatter: 'globs: "**/*.ts"',
      body: 'Cursor body only.\n',
    },
    {
      provider: 'copilot' as const,
      path: '.github/instructions/typescript.instructions.md',
      frontmatter: 'applyTo: "**/*.ts"',
      body: 'Copilot body only.\n',
    },
  ])('uses only the $provider frontmatter body for event content metrics', ({
    provider,
    path,
    frontmatter,
    body,
  }) => {
    const workspace: WorkspaceSnapshot = {
      name: `${provider}-body`,
      files: [
        { path, content: `---\n${frontmatter}\n---\n${body}` },
        { path: 'src/main.ts', content: 'export {}\n' },
      ],
    }

    const event = simulate({
      provider,
      workspace,
      cwd: '.',
      targetPath: 'src/main.ts',
      phase: 'edit',
    }).find(({ sourcePath }) => sourcePath === path)

    expect(event).toMatchObject({
      action: 'loaded',
      bytes: byteLength(body),
      excerpt: 'Cursor body only.'.replace('Cursor', provider === 'cursor' ? 'Cursor' : 'Copilot'),
      sourceLines: [4, 5],
      confidence: 'conditional',
    })
  })

  it('omits later Codex files after an earlier file exactly exhausts the budget', () => {
    const workspace: WorkspaceSnapshot = {
      name: 'codex-zero-budget',
      files: [
        { path: 'AGENTS.md', content: 'a'.repeat(32 * 1024) },
        { path: 'nested/AGENTS.md', content: 'Must not be counted.\n' },
        { path: 'nested/main.ts', content: 'export {}\n' },
      ],
    }
    const events = simulate({
      provider: 'codex',
      workspace,
      cwd: 'nested',
      targetPath: 'nested/main.ts',
      phase: 'startup',
    })
    const omitted = events.find(({ sourcePath }) => sourcePath === 'nested/AGENTS.md')

    expect(omitted).toMatchObject({
      action: 'omitted',
      bytes: 0,
      estimatedTokens: 0,
      excerpt: '',
    })
    expect(omitted?.sourceLines).toBeUndefined()
    expect(calculateMetrics(events)).toMatchObject({
      loadedFiles: 1,
      loadedBytes: 32 * 1024,
      actionCounts: { loaded: 1, omitted: 1 },
    })
  })

  it('truncates Codex content only at a complete UTF-8 code point', () => {
    const workspace: WorkspaceSnapshot = {
      name: 'codex-unicode-budget',
      files: [
        { path: 'AGENTS.md', content: 'a'.repeat(32 * 1024 - 5) },
        { path: 'nested/AGENTS.md', content: '界界' },
        { path: 'nested/main.ts', content: 'export {}\n' },
      ],
    }
    const event = simulate({
      provider: 'codex',
      workspace,
      cwd: 'nested',
      targetPath: 'nested/main.ts',
      phase: 'startup',
    }).find(({ sourcePath }) => sourcePath === 'nested/AGENTS.md')

    expect(event).toMatchObject({
      action: 'truncated',
      bytes: 3,
      excerpt: '界',
      sourceLines: [1, 1],
    })
    expect(event?.excerpt).not.toContain('\uFFFD')
  })
})

describe('workspace path validation', () => {
  it.each(['/absolute/file.ts', 'C:\\absolute\\file.ts', '..\\escape.ts', 'safe/../../escape.ts'])(
    'rejects unsafe path %s',
    (path) => expect(() => normalizePath(path)).toThrow(),
  )

  it('rejects normalized path collisions', () => {
    const workspace: WorkspaceSnapshot = {
      name: 'collision',
      files: [
        { path: 'src/main.ts', content: '' },
        { path: 'src/./main.ts', content: '' },
      ],
    }
    expect(() => simulate({
      provider: 'codex',
      workspace,
      cwd: 'src',
      targetPath: 'src/main.ts',
      phase: 'startup',
    })).toThrow(/duplicate normalized path/)
  })

  it('requires an existing cwd directory and an exact-case target file', () => {
    const workspace: WorkspaceSnapshot = {
      name: 'strict-paths',
      files: [{ path: 'Src/Main.ts', content: 'export {}\n' }],
    }
    const input = { provider: 'codex' as const, workspace, phase: 'startup' as const }

    expect(() => simulate({ ...input, cwd: 'missing', targetPath: 'Src/Main.ts' }))
      .toThrow(/cwd does not identify/)
    expect(() => simulate({ ...input, cwd: 'Src', targetPath: 'src/main.ts' }))
      .toThrow(/targetPath does not identify/)
    expect(() => simulate({ ...input, cwd: '../Src', targetPath: 'Src/Main.ts' }))
      .toThrow(/escapes the workspace root/)
    expect(() => simulate({ ...input, cwd: 'Src', targetPath: '/Src/Main.ts' }))
      .toThrow(/Absolute paths are not supported/)
  })

  it('recognizes instruction filenames with exact casing only', () => {
    const workspace: WorkspaceSnapshot = {
      name: 'strict-instructions',
      files: [
        { path: 'agents.md', content: 'Wrong case.\n' },
        { path: 'claude.md', content: 'Wrong case.\n' },
        { path: '.Cursor/rules/wrong.mdc', content: 'Wrong directory case.\n' },
        { path: '.GitHub/copilot-instructions.md', content: 'Wrong directory case.\n' },
        { path: '.github/Instructions/wrong.instructions.md', content: 'Wrong directory case.\n' },
        { path: 'main.ts', content: 'export {}\n' },
      ],
    }

    for (const provider of ['codex', 'claude', 'cursor', 'copilot'] as const) {
      expect(simulate({
        provider,
        workspace,
        cwd: '.',
        targetPath: 'main.ts',
        phase: 'edit',
      })).toEqual([])
    }
  })
})
