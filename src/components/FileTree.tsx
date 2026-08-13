import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  LocateFixed,
  Search,
  X,
} from 'lucide-react'
import type { WorkspaceSnapshot } from '../core'

interface FileTreeProps {
  workspace: WorkspaceSnapshot
  cwd: string
  targetPath: string
  onCwdChange: (cwd: string) => void
  onTargetChange: (path: string) => void
}

interface TreeNode {
  name: string
  path: string
  kind: 'directory' | 'file'
  children: TreeNode[]
}

const rulePattern =
  /(?:AGENTS(?:\.override)?\.md|CLAUDE\.md|\.cursorrules|\.mdc|copilot-instructions\.md|\.instructions\.md)$/i

function buildTree(workspace: WorkspaceSnapshot) {
  const root: TreeNode = { name: workspace.name, path: '.', kind: 'directory', children: [] }

  for (const file of workspace.files) {
    const parts = file.path.split('/')
    let parent = root
    let current = ''
    parts.forEach((part, index) => {
      current = current ? `${current}/${part}` : part
      const kind = index === parts.length - 1 ? 'file' : 'directory'
      let child = parent.children.find((item) => item.name === part && item.kind === kind)
      if (!child) {
        child = { name: part, path: current, kind, children: [] }
        parent.children.push(child)
      }
      parent = child
    })
  }

  function sort(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sort)
  }
  sort(root)
  return root
}

function ancestorPaths(path: string) {
  const result = new Set<string>(['.'])
  const parts = path.split('/')
  parts.pop()
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    result.add(current)
  }
  return result
}

function FileGlyph({ path }: { path: string }) {
  if (rulePattern.test(path)) return <FileText size={15} />
  return <FileCode2 size={15} />
}

interface BranchProps extends Omit<FileTreeProps, 'workspace'> {
  node: TreeNode
  depth: number
  expanded: Set<string>
  onToggle: (path: string) => void
}

function TreeBranch({
  node,
  depth,
  expanded,
  cwd,
  targetPath,
  onToggle,
  onCwdChange,
  onTargetChange,
}: BranchProps) {
  if (node.kind === 'file') {
    const isRule = rulePattern.test(node.path)
    return (
      <button
        type="button"
        role="treeitem"
        className={`tree-row file-row ${targetPath === node.path ? 'is-selected' : ''}`}
        style={{ paddingLeft: `${10 + depth * 15}px` }}
        onClick={() => onTargetChange(node.path)}
        title={node.path}
      >
        <FileGlyph path={node.path} />
        <span>{node.name}</span>
        {isRule && <i className="rule-indicator" title="Instruction source" />}
      </button>
    )
  }

  const isExpanded = expanded.has(node.path)
  const isCwd = cwd === node.path
  return (
    <div className="tree-branch" role="treeitem" aria-expanded={isExpanded}>
      <div
        className={`tree-row directory-row ${isCwd ? 'is-cwd' : ''}`}
        style={{ paddingLeft: `${7 + depth * 15}px` }}
        title={node.path === '.' ? 'Repository root' : node.path}
      >
        <button
          type="button"
          className="directory-toggle"
          onClick={() => onToggle(node.path)}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
          <span>{node.name}</span>
        </button>
        <button
          type="button"
          className="cwd-button"
          onClick={() => onCwdChange(node.path)}
          aria-label={`Use ${node.path === '.' ? 'repository root' : node.path} as working directory`}
          title="Use as working directory"
        >
          <LocateFixed size={12} />
        </button>
        {isCwd && <em>CWD</em>}
      </div>
      {isExpanded && (
        <div role="group">
          {node.children.map((child) => (
            <TreeBranch
              key={`${child.kind}:${child.path}`}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              cwd={cwd}
              targetPath={targetPath}
              onToggle={onToggle}
              onCwdChange={onCwdChange}
              onTargetChange={onTargetChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({
  workspace,
  cwd,
  targetPath,
  onCwdChange,
  onTargetChange,
}: FileTreeProps) {
  const tree = useMemo(() => buildTree(workspace), [workspace])
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(() => ancestorPaths(targetPath))

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    return workspace.files
      .filter((file) => file.path.toLowerCase().includes(normalized))
      .slice(0, 100)
  }, [query, workspace.files])

  function toggle(path: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <aside className="panel file-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">Repository</span><h2>Files</h2></div>
        <span className="panel-count">{workspace.files.length}</span>
      </div>
      <label className="tree-search">
        <Search size={14} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter paths"
          aria-label="Filter paths"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear path filter" title="Clear">
            <X size={13} />
          </button>
        )}
      </label>
      <div className="tree-scroll">
        {query ? (
          <div className="search-results">
            {matches.map((file) => (
              <button
                type="button"
                key={file.path}
                className={`tree-row search-row ${targetPath === file.path ? 'is-selected' : ''}`}
                onClick={() => onTargetChange(file.path)}
                title={file.path}
              >
                <FileGlyph path={file.path} />
                <span>{file.path}</span>
              </button>
            ))}
            {matches.length === 0 && <p className="empty-note">No matching paths</p>}
          </div>
        ) : (
          <div role="tree" aria-label={`${workspace.name} repository files`}>
            <TreeBranch
              node={tree}
              depth={0}
              expanded={expanded}
              cwd={cwd}
              targetPath={targetPath}
              onToggle={toggle}
              onCwdChange={onCwdChange}
              onTargetChange={onTargetChange}
            />
          </div>
        )}
      </div>
      <div className="tree-legend">
        <span><i className="rule-indicator" /> instruction source</span>
        <span><b /> target</span>
      </div>
    </aside>
  )
}
