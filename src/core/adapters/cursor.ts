import {
  contentLines,
  isAncestorOrSame,
  matchesAny,
  normalizePath,
  parseFrontmatter,
  patternsFrom,
} from '../helpers'
import type { SimulationInput } from '../types'
import type { DraftEvent, ProviderAdapter } from './shared'
import { deferredUntil } from './shared'

export const simulateCursor: ProviderAdapter = (input: SimulationInput) =>
  input.workspace.files
    .filter((file) => {
      const path = normalizePath(file.path)
      return path === '.cursorrules' || /(?:^|\/)\.cursor\/rules\/[^/]+\.mdc$/.test(path)
    })
    .map((file): DraftEvent => {
      const path = normalizePath(file.path)
      if (path === '.cursorrules') {
        const availability = deferredUntil(
          input,
          'startup',
          'Cursor still supports this root legacy rules file, but the format is deprecated in favor of .cursor/rules/*.mdc project rules.',
          'The legacy root rules file is recognized but is not available before startup completes.',
        )
        return {
          file,
          ...availability,
          phase: 'startup',
          ruleKind: 'legacy project rule',
          confidence: 'conditional',
        }
      }

      const marker = path.lastIndexOf('/.cursor/rules/')
      const base = marker === -1 ? '.' : path.slice(0, marker) || '.'
      const parsed = parseFrontmatter(file.content)
      const bodyParts = {
        renderedContent: parsed.body,
        sourceLines: contentLines(parsed.body, parsed.bodyStartLine),
      }
      const alwaysApply = parsed.attributes.alwaysApply === true
      const globs = patternsFrom(parsed.attributes.globs)
      const description = typeof parsed.attributes.description === 'string'
        ? parsed.attributes.description
        : ''

      if (!isAncestorOrSame(base, input.targetPath)) {
        return {
          file,
          action: 'deferred',
          phase: 'edit',
          ruleKind: 'nested project rule',
          reason: `The rule is rooted at ${base}, outside the selected target.`,
          confidence: 'conditional',
          ...bodyParts,
        }
      }

      if (alwaysApply) {
        const phase = base === '.' ? 'startup' : 'discovery'
        const availability = deferredUntil(
          input,
          phase,
          'alwaysApply is true, so Cursor includes this project rule without a target glob.',
          `This always-on rule is recognized but is not available until the ${phase} phase.`,
        )
        return {
          file,
          ...availability,
          phase,
          ruleKind: 'always project rule',
          confidence: 'conditional',
          ...bodyParts,
        }
      }

      if (globs.length) {
        const matches = matchesAny(input.targetPath, globs, base)
        const availability = matches
          ? deferredUntil(
              input,
              'edit',
              `The target matches ${globs.join(', ')}, so Cursor's auto-attached project rule applies.`,
              'A concrete target is required before Cursor can evaluate this rule glob.',
            )
          : {
              action: 'deferred' as const,
              reason: `The selected target does not match ${globs.join(', ')}.`,
            }
        return {
          file,
          ...availability,
          phase: 'edit',
          ruleKind: 'glob project rule',
          confidence: 'conditional',
          ...bodyParts,
        }
      }

      return {
        file,
        action: 'deferred',
        phase: 'edit',
        ruleKind: description ? 'agent-requested project rule' : 'manual project rule',
        reason: description
          ? 'Cursor may select this rule from its description, but repository contents cannot predict a model decision.'
          : 'This rule has no alwaysApply or glob trigger and requires an explicit manual attachment.',
        confidence: 'conditional',
        ...bodyParts,
      }
    })
