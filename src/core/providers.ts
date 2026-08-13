import type { ProviderDefinition, ProviderId } from './types'

export const providerDefinitions: ProviderDefinition[] = [
  {
    id: 'codex',
    label: 'OpenAI Codex',
    shortLabel: 'Codex',
    accent: '#ff7869',
    description: 'Startup chain from repository root to the launch directory.',
    docRef: 'https://developers.openai.com/codex/guides/agents-md/',
    recognizedFiles: ['AGENTS.md', 'AGENTS.override.md'],
    caveat: 'Uses the documented default 32 KiB budget; custom Codex configuration is not present in a snapshot.',
  },
  {
    id: 'claude',
    label: 'Claude Code',
    shortLabel: 'Claude',
    accent: '#f2b84b',
    description: 'Project memory above cwd at launch, with descendant memory on demand.',
    docRef: 'https://docs.anthropic.com/en/docs/claude-code/memory',
    recognizedFiles: ['CLAUDE.md', '.claude/CLAUDE.md'],
    caveat: 'User, managed, local, imported, auto-memory, rules, and claudeMdExcludes state are outside v0.1.',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    shortLabel: 'Cursor',
    accent: '#52d2d0',
    description: 'Always, glob-scoped, intelligently selected, and manual project rules.',
    docRef: 'https://docs.cursor.com/context/rules',
    recognizedFiles: ['.cursor/rules/*.mdc', '.cursorrules (legacy)'],
    caveat: 'Agent-selected and manually mentioned rules need runtime prompt state, so the snapshot can only defer them.',
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    shortLabel: 'Copilot',
    accent: '#62d994',
    description: 'Repository-wide and applyTo-scoped custom instructions.',
    docRef: 'https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot',
    recognizedFiles: ['.github/copilot-instructions.md', '.github/instructions/**/*.instructions.md'],
    caveat: 'Support varies by Copilot surface; Rulefall models the common repository and path-specific contract.',
  },
]

export function getProvider(provider: ProviderId) {
  return providerDefinitions.find((definition) => definition.id === provider)!
}
