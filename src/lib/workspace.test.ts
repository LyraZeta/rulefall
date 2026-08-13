import JSZip from 'jszip'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  pickDirectoryWorkspace,
  workspaceFromZip,
  workspaceImportLimits,
} from './workspace'

type NamedZipBytes = Uint8Array & { name: string; size: number }

async function zipFile(
  name: string,
  entries: Record<string, string>,
  compression: 'DEFLATE' | 'STORE' = 'DEFLATE',
) {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(entries)) zip.file(path, content)
  const bytes = await zip.generateAsync({ type: 'uint8array', compression }) as NamedZipBytes
  Object.defineProperties(bytes, {
    name: { configurable: true, value: name },
    size: { configurable: true, value: bytes.byteLength },
  })
  return bytes as unknown as File
}

function directory(entries: FileSystemHandle[]) {
  return {
    kind: 'directory',
    name: 'fixture',
    async *values() {
      yield* entries
    },
  } as unknown as FileSystemDirectoryHandle
}

function fileEntry(name: string, content: string, size = new TextEncoder().encode(content).byteLength) {
  return {
    kind: 'file',
    name,
    async getFile() {
      return {
        name,
        size,
        text: async () => content,
      } as File
    },
  } as unknown as FileSystemFileHandle
}

afterEach(() => {
  Reflect.deleteProperty(window, 'showDirectoryPicker')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.stubGlobal('window', {})
})

async function extractionSpyFor(archive: File) {
  const zip = await JSZip.loadAsync(archive)
  const entry = Object.values(zip.files).find(({ dir }) => !dir)
  if (!entry) throw new Error('Test archive did not contain a file entry.')
  return vi.spyOn(Object.getPrototypeOf(entry) as { async: JSZip.JSZipObject['async'] }, 'async')
}

describe('ZIP workspace imports', () => {
  it('filters paths before extraction and reports every skipped category', async () => {
    const archive = await zipFile('fixture.zip', {
      'fixture/src/main.ts': 'export const ready = true\n',
      'fixture/node_modules/pkg/index.js': 'throw new Error("not analyzed")\n',
      'fixture/assets/logo.png': 'not really an image',
      'fixture/large.ts': 'x'.repeat(workspaceImportLimits.maxFileBytes + 1),
    }, 'STORE')
    const extractionSpy = await extractionSpyFor(archive)

    const result = await workspaceFromZip(archive)

    expect(result.workspace).toEqual({
      name: 'fixture',
      files: [{ path: 'src/main.ts', content: 'export const ready = true\n' }],
    })
    expect(result.complete).toBe(false)
    expect(result.warnings.join(' ')).toContain('ignored director')
    expect(result.warnings.join(' ')).toContain('unsupported file type')
    expect(result.warnings.join(' ')).toContain('over the 1 MiB limit')
    expect(extractionSpy).toHaveBeenCalledTimes(1)
  })

  it('rejects a suspicious compression ratio before extracting the entry', async () => {
    const archive = await zipFile('compressed.zip', {
      'compressed/repeated.txt': 'a'.repeat(256 * 1024),
    })
    const extractionSpy = await extractionSpyFor(archive)

    const result = await workspaceFromZip(archive)

    expect(result.workspace.files).toEqual([])
    expect(result.complete).toBe(false)
    expect(result.warnings.join(' ')).toContain('suspicious compression ratio')
    expect(extractionSpy).not.toHaveBeenCalled()
  })

  it('does not let common-root removal bypass ignored paths', async () => {
    const archive = await zipFile('ignored-root.zip', {
      'node_modules/pkg/index.js': 'not analyzed\n',
    }, 'STORE')
    const extractionSpy = await extractionSpyFor(archive)

    const result = await workspaceFromZip(archive)

    expect(result.workspace.files).toEqual([])
    expect(result.warnings.join(' ')).toContain('ignored director')
    expect(extractionSpy).not.toHaveBeenCalled()
  })

  it('normalizes equivalent paths and skips collisions before simulation', async () => {
    const archive = await zipFile('collisions.zip', {
      'fixture/src/main.ts': 'first\n',
      'fixture/src/./main.ts': 'second\n',
    }, 'STORE')

    const result = await workspaceFromZip(archive)

    expect(result.workspace.files).toHaveLength(1)
    expect(result.workspace.files[0]?.path).toBe('src/main.ts')
  })

  it('rejects an archive over the compressed-file limit before parsing it', async () => {
    const archive = new Uint8Array([0]) as NamedZipBytes
    Object.defineProperties(archive, {
      name: { configurable: true, value: 'oversized.zip' },
      size: { configurable: true, value: workspaceImportLimits.maxArchiveBytes + 1 },
    })
    const loadSpy = vi.spyOn(JSZip, 'loadAsync')

    await expect(workspaceFromZip(archive as unknown as File)).rejects.toThrow(/50 MiB/)
    expect(loadSpy).not.toHaveBeenCalled()
  })
})

describe('directory workspace imports', () => {
  it('returns a usable partial workspace with skipped-file warnings', async () => {
    const ignored = directory([fileEntry('secret.ts', 'not loaded')])
    Object.defineProperty(ignored, 'name', { value: 'node_modules' })
    const root = directory([
      fileEntry('main.ts', 'export {}\n'),
      fileEntry('image.png', 'binary-ish'),
      fileEntry('huge.md', 'not loaded', workspaceImportLimits.maxFileBytes + 1),
      ignored,
    ])
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: vi.fn().mockResolvedValue(root),
    })

    const result = await pickDirectoryWorkspace()

    expect(result.workspace.files).toEqual([{ path: 'main.ts', content: 'export {}\n' }])
    expect(result.complete).toBe(false)
    expect(result.warnings.join(' ')).toContain('ignored director')
    expect(result.warnings.join(' ')).toContain('unsupported file type')
    expect(result.warnings.join(' ')).toContain('over the 1 MiB limit')
  })
})
