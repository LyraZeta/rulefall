import {
  contentLines,
  matchesAny,
  normalizePath,
  parseFrontmatter,
  patternsFrom,
} from '../helpers'
import type { SimulationInput } from '../types'
import type { DraftEvent, ProviderAdapter } from './shared'
import { deferredUntil } from './shared'

export const simulateCopilot: ProviderAdapter = (input: SimulationInput) =>
  input.workspace.files
    .filter((file) => {
      const path = normalizePath(file.path)
      return path === '.github/copilot-instructions.md' ||
        /^\.github\/instructions\/.+\.instructions\.md$/.test(path)
    })
    .map((file): DraftEvent => {
      const path = normalizePath(file.path)
      if (path === '.github/copilot-instructions.md') {
        const availability = deferredUntil(
          input,
          'discovery',
          'Copilot recognizes this repository-wide custom instruction file.',
          'Repository-wide Copilot instructions are deferred until repository discovery.',
        )
        return {
          file,
          ...availability,
          phase: 'discovery',
          ruleKind: 'repository instructions',
          confidence: 'conditional',
        }
      }

      const parsed = parseFrontmatter(file.content)
      const bodyParts = {
        renderedContent: parsed.body,
        sourceLines: contentLines(parsed.body, parsed.bodyStartLine),
      }
      const applyTo = patternsFrom(parsed.attributes.applyTo)
      if (!applyTo.length) {
        return {
          file,
          action: 'ignored',
          phase: 'edit',
          ruleKind: 'path instructions',
          reason: 'The path-specific instruction file has no usable applyTo frontmatter.',
          confidence: 'best-effort',
          ...bodyParts,
        }
      }
      const matches = matchesAny(input.targetPath, applyTo)
      const availability = matches
        ? deferredUntil(
            input,
            'edit',
            `The selected target matches applyTo: ${applyTo.join(', ')}.`,
            'Copilot needs a target path before applyTo instructions can be selected.',
          )
        : {
            action: 'deferred' as const,
            reason: `The selected target does not match applyTo: ${applyTo.join(', ')}.`,
          }
      return {
        file,
        ...availability,
        phase: 'edit',
        ruleKind: 'path instructions',
        confidence: 'conditional',
        ...bodyParts,
      }
    })
