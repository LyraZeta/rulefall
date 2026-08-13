import {
  ancestors,
  byteLength,
  contentLines,
  directoryOf,
  normalizePath,
  truncateUtf8,
} from '../helpers'
import type { SimulationInput } from '../types'
import type { DraftEvent, ProviderAdapter } from './shared'

const defaultProjectDocBudget = 32 * 1024

export const simulateCodex: ProviderAdapter = (input: SimulationInput) => {
  const cwd = normalizePath(input.cwd)
  const chain = new Set(ancestors(cwd))
  const files = input.workspace.files.filter((file) =>
    /(?:^|\/)AGENTS(?:\.override)?\.md$/.test(normalizePath(file.path)),
  )
  const byDirectory = new Map<string, typeof files>()
  for (const file of files) {
    const directory = directoryOf(file.path)
    byDirectory.set(directory, [...(byDirectory.get(directory) ?? []), file])
  }

  const drafts: DraftEvent[] = []
  let remaining = defaultProjectDocBudget
  for (const directory of ancestors(cwd)) {
    const candidates = byDirectory.get(directory) ?? []
    const override = candidates.find((file) => /(?:^|\/)AGENTS\.override\.md$/.test(file.path))
    const regular = candidates.find((file) => /(?:^|\/)AGENTS\.md$/.test(file.path))
    const selected = override ?? regular

    if (regular && override) {
      drafts.push({
        file: regular,
        action: 'shadowed',
        phase: 'startup',
        ruleKind: 'directory instructions',
        reason: `AGENTS.override.md takes precedence over AGENTS.md in ${directory === '.' ? 'the repository root' : directory}.`,
        confidence: 'exact',
      })
    }
    if (!selected) continue

    if (remaining === 0) {
      drafts.push({
        file: selected,
        action: 'omitted',
        phase: 'startup',
        ruleKind: override ? 'override instructions' : 'directory instructions',
        reason: 'The default Codex project instruction budget is already exhausted, so no content from this file reaches the context. A custom live configuration could change this limit.',
        confidence: 'conditional',
        renderedContent: '',
        sourceLines: undefined,
      })
      continue
    }

    const bytes = byteLength(selected.content)
    if (bytes <= remaining) {
      drafts.push({
        file: selected,
        action: 'loaded',
        phase: 'startup',
        ruleKind: override ? 'override instructions' : 'directory instructions',
        reason: `Codex includes one instruction file from each directory on the repository-root-to-cwd chain; ${directory === '.' ? 'the root' : directory} is on that chain.`,
        confidence: 'exact',
      })
      remaining -= bytes
      continue
    }

    const prefix = truncateUtf8(selected.content, remaining)
    if (!prefix) {
      drafts.push({
        file: selected,
        action: 'omitted',
        phase: 'startup',
        ruleKind: override ? 'override instructions' : 'directory instructions',
        reason: `Only ${remaining} bytes remain in the default Codex project instruction budget, which cannot hold the next complete UTF-8 code point. No content from this file reaches the context. A custom live configuration could change this limit.`,
        confidence: 'conditional',
        renderedContent: '',
        sourceLines: undefined,
      })
      remaining = 0
      continue
    }

    drafts.push({
      file: selected,
      action: 'truncated',
      phase: 'startup',
      ruleKind: override ? 'override instructions' : 'directory instructions',
      reason: `The default Codex project instruction budget is 32 KiB; only ${remaining} bytes remain after nearer-root files are appended. A custom live configuration could change this limit.`,
      confidence: 'conditional',
      renderedContent: prefix,
      sourceLines: contentLines(prefix),
    })
    remaining = 0
  }

  for (const file of files) {
    const path = normalizePath(file.path)
    if (drafts.some((draft) => normalizePath(draft.file.path) === path)) continue
    const directory = directoryOf(path)
    drafts.push({
      file,
      action: chain.has(directory) ? 'shadowed' : 'deferred',
      phase: 'startup',
      ruleKind: /(?:^|\/)AGENTS\.override\.md$/.test(path) ? 'override instructions' : 'directory instructions',
      reason: chain.has(directory)
        ? 'Another supported instruction filename won precedence in the same directory.'
        : `Codex builds its startup chain only through the launch directory (${cwd}); this file is outside that chain.`,
      confidence: 'exact',
    })
  }
  return drafts
}
