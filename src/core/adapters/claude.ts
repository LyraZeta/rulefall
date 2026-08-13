import { directoryOf, isAncestorOrSame, normalizePath } from '../helpers'
import type { SimulationInput } from '../types'
import type { DraftEvent, ProviderAdapter } from './shared'
import { deferredUntil } from './shared'

export const simulateClaude: ProviderAdapter = (input: SimulationInput) => {
  const cwd = normalizePath(input.cwd)
  const target = normalizePath(input.targetPath)
  return input.workspace.files
    .filter((file) => /(?:^|\/)(?:\.claude\/)?CLAUDE\.md$/.test(normalizePath(file.path)))
    .map((file): DraftEvent => {
      const path = normalizePath(file.path)
      const memoryDirectory = /(?:^|\/)\.claude\/CLAUDE\.md$/.test(path)
        ? directoryOf(directoryOf(path))
        : directoryOf(path)
      const aboveCwd = isAncestorOrSame(memoryDirectory, cwd)
      const onTargetDescent = isAncestorOrSame(cwd, memoryDirectory) && isAncestorOrSame(memoryDirectory, target)

      if (aboveCwd) {
        const phase = 'startup'
        const availability = deferredUntil(
          input,
          phase,
          `Claude Code loads project memory from the working directory and its ancestor directories at launch; ${memoryDirectory === '.' ? 'the repository root' : memoryDirectory} is on that path.`,
          'This project memory is recognized but is not available before startup completes.',
        )
        return {
          file,
          ...availability,
          phase,
          ruleKind: 'project memory',
          confidence: 'exact',
        }
      }

      if (onTargetDescent) {
        const availability = deferredUntil(
          input,
          'edit',
          `Nested project memory under cwd is loaded on demand when Claude works with files in ${memoryDirectory}.`,
          `Nested project memory is deferred until Claude works with a file under ${memoryDirectory}.`,
        )
        return {
          file,
          ...availability,
          phase: 'edit',
          ruleKind: 'nested project memory',
          confidence: 'conditional',
        }
      }

      return {
        file,
        action: 'deferred',
        phase: 'edit',
        ruleKind: 'nested project memory',
        reason: `This memory is outside both the launch ancestry and the selected target's directory ancestry.`,
        confidence: 'exact',
      }
    })
}
