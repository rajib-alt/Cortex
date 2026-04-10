import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useBlocksStore } from '@/store/blocksStore'
import { useFinanceStore } from '@/store/financeStore'
import { useJournalStore } from '@/store/journalStore'
import { useTasksStore } from '@/store/tasksStore'
import { useLearningStore } from '@/store/learningStore'
import { saveMarkdownFile, blocksToMarkdown, financeToMarkdown, journalToMarkdown, learningToMarkdown, tasksToMarkdown } from '@/lib/githubSync'

export interface NoteFile {
  path: string
  name: string
  sha?: string
  content?: string
  isFolder?: boolean
  children?: NoteFile[]
}

export interface GitHubConfig {
  pat: string
  username: string
  repo: string
  rootFolder?: string   // defaults to "markdownlod"
}

export interface BacklinkMap {
  [notePath: string]: string[]
}

const toBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)))
const fromBase64 = (str: string) => decodeURIComponent(escape(atob(str)))
const ROOT = (c: GitHubConfig) => c.rootFolder || 'markdownlod'

async function githubFetch(config: GitHubConfig, path: string, options?: RequestInit) {
  const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`)
  return res.json()
}

async function githubDelete(config: GitHubConfig, path: string, sha: string) {
  const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${path}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${config.pat}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Delete ${path}`, sha }),
  })
  if (!res.ok) throw new Error(`GitHub delete error: ${res.status}`)
}

async function fetchTree(config: GitHubConfig): Promise<NoteFile[]> {
  const root = ROOT(config)
  const buildTree = async (path: string): Promise<NoteFile[]> => {
    const items = await githubFetch(config, path)
    const result: NoteFile[] = []
    for (const item of items) {
      if (item.type === 'dir') {
        const children = await buildTree(item.path)
        result.push({ path: item.path, name: item.name, isFolder: true, children, sha: item.sha })
      } else if (item.name.endsWith('.md')) {
        result.push({ path: item.path, name: item.name, sha: item.sha })
      }
    }
    return result.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })
  }
  try { return await buildTree(root) } catch { return [] }
}

function extractTags(files: NoteFile[]): string[] {
  const tags = new Set<string>()
  const walk = (nodes: NoteFile[]) => {
    for (const n of nodes) {
      if (n.content) n.content.match(/(?:^|\s)#([a-zA-Z0-9_-]+)/g)?.forEach(m => tags.add(m.trim().slice(1)))
      if (n.children) walk(n.children)
    }
  }
  walk(files)
  return Array.from(tags).sort()
}

function buildBacklinks(files: NoteFile[]): BacklinkMap {
  const map: BacklinkMap = {}
  const allFiles: NoteFile[] = []
  const walk = (nodes: NoteFile[]) => { for (const n of nodes) { if (!n.isFolder) allFiles.push(n); if (n.children) walk(n.children) } }
  walk(files)
  for (const file of allFiles) {
    if (!file.content) continue
    for (const match of file.content.match(/\[\[([^\]]+)\]\]/g) || []) {
      const linkName = match.slice(2, -2).trim().toLowerCase()
      const target = allFiles.find(f => f.name.replace('.md', '').toLowerCase() === linkName)
      if (target) {
        if (!map[target.path]) map[target.path] = []
        if (!map[target.path].includes(file.path)) map[target.path].push(file.path)
      }
    }
  }
  return map
}

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)
}

function buildPath(config: GitHubConfig, folder: string, title: string): string {
  const root = ROOT(config)
  const slug = toSlug(title)
  if (folder) return `${root}/${folder}/${slug}.md`
  return `${root}/${slug}.md`
}

interface NotesState {
  config: GitHubConfig | null
  files: NoteFile[]
  currentFile: NoteFile | null
  editorContent: string
  tags: string[]
  backlinks: BacklinkMap
  isLoading: boolean
  isSaving: boolean
  openRouterKey: string
  geminiKey: string
  aiProvider: 'openrouter' | 'gemini'
  searchQuery: string
  setConfig: (c: GitHubConfig) => void
  setCurrentFile: (f: NoteFile | null) => void
  setEditorContent: (c: string) => void
  setOpenRouterKey: (k: string) => void
  setGeminiKey: (k: string) => void
  setAIProvider: (provider: 'openrouter' | 'gemini') => void
  setSearchQuery: (q: string) => void
  fetchFiles: () => Promise<void>
  loadFile: (path: string) => Promise<void>
  saveFile: (path?: string, content?: string) => Promise<void>
  createNote: (opts: { title: string; folder?: string; tags?: string[]; content: string }) => Promise<string>
  deleteFile: (path: string) => Promise<void>
  moveFile: (oldPath: string, newPath: string, content: string) => Promise<void>
  getAllNotes: () => NoteFile[]
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      config: null, files: [], currentFile: null, editorContent: '',
      tags: [], backlinks: {}, isLoading: false, isSaving: false, openRouterKey: '', geminiKey: '', aiProvider: 'openrouter', searchQuery: '',

      setConfig: (c) => set({ config: c }),
      setCurrentFile: (f) => set({ currentFile: f }),
      setEditorContent: (c) => set({ editorContent: c }),
      setOpenRouterKey: (k) => set({ openRouterKey: k }),
      setGeminiKey: (k) => set({ geminiKey: k }),
      setAIProvider: (provider) => set({ aiProvider: provider }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      fetchFiles: async () => {
        const { config } = get()
        if (!config) return
        set({ isLoading: true })
        try {
          const tree = await fetchTree(config)
          const loadContent = async (nodes: NoteFile[]): Promise<NoteFile[]> => {
            const result: NoteFile[] = []
            for (const node of nodes) {
              if (node.isFolder && node.children) {
                result.push({ ...node, children: await loadContent(node.children) })
              } else if (!node.isFolder) {
                try {
                  const data = await githubFetch(config, node.path)
                  result.push({ ...node, content: fromBase64(data.content), sha: data.sha })
                } catch { result.push(node) }
              }
            }
            return result
          }
          const loaded = await loadContent(tree)
          set({ files: loaded, tags: extractTags(loaded), backlinks: buildBacklinks(loaded) })
        } catch (e) { console.error(e) }
        finally { set({ isLoading: false }) }
      },

      loadFile: async (path) => {
        const { config } = get()
        if (!config) return
        const data = await githubFetch(config, path)
        const content = fromBase64(data.content)
        set({ currentFile: { path, name: path.split('/').pop() || path, content, sha: data.sha }, editorContent: content })
      },
      syncAllToGitHub: async () => {
        const { config } = get()
        if (!config) return

        const blocks = useBlocksStore.getState().spaces
        const journal = useJournalStore.getState().entries
        const finance = useFinanceStore.getState()
        const tasks = useTasksStore.getState().tasks
        const learning = useLearningStore.getState().items

        await saveMarkdownFile(config, `${ROOT(config)}/data/thoughts.md`, blocksToMarkdown(blocks), 'Sync Cortex thoughts to GitHub')
        await saveMarkdownFile(config, `${ROOT(config)}/data/journal.md`, journalToMarkdown(journal), 'Sync Cortex journal to GitHub')
        await saveMarkdownFile(config, `${ROOT(config)}/data/finance.md`, financeToMarkdown(finance.transactions, finance.budgets, finance.savingsGoals, finance.currency), 'Sync Cortex finance data to GitHub')
        await saveMarkdownFile(config, `${ROOT(config)}/data/tasks.md`, tasksToMarkdown(tasks), 'Sync Cortex tasks to GitHub')
        await saveMarkdownFile(config, `${ROOT(config)}/data/learning.md`, learningToMarkdown(learning), 'Sync Cortex learning data to GitHub')

        await get().fetchFiles()
      },

      saveFile: async (path?, content?) => {
        const { config, currentFile, editorContent } = get()
        if (!config) return
        const filePath = path || currentFile?.path
        const fileContent = content ?? editorContent
        if (!filePath) return
        set({ isSaving: true })
        try {
          let sha: string | undefined
          try { sha = (await githubFetch(config, filePath)).sha } catch {}
          await githubFetch(config, filePath, {
            method: 'PUT',
            body: JSON.stringify({ message: `Update ${filePath}`, content: toBase64(fileContent), ...(sha ? { sha } : {}) }),
          })
        } catch (e) { console.error(e) }
        finally { set({ isSaving: false }) }
      },

      createNote: async ({ title, folder = '', tags = [], content }) => {
        const { config } = get()
        if (!config) throw new Error('No GitHub config')
        const path = buildPath(config, folder, title)
        const tagsYaml = tags.length > 0 ? `[${tags.join(', ')}]` : '[]'
        const fullContent = `---\ntitle: ${title}\ntags: ${tagsYaml}\ntype: note\n---\n\n${content}`
        await get().saveFile(path, fullContent)
        await get().fetchFiles()
        await get().loadFile(path)
        return path
      },

      deleteFile: async (path) => {
        const { config, currentFile } = get()
        if (!config) return
        const data = await githubFetch(config, path)
        await githubDelete(config, path, data.sha)
        if (currentFile?.path === path) set({ currentFile: null, editorContent: '' })
        await get().fetchFiles()
      },

      moveFile: async (oldPath, newPath, content) => {
        const { config } = get()
        if (!config) return
        let sha: string | undefined
        try { sha = (await githubFetch(config, newPath)).sha } catch {}
        await githubFetch(config, newPath, {
          method: 'PUT',
          body: JSON.stringify({ message: `Move ${oldPath} to ${newPath}`, content: toBase64(content), ...(sha ? { sha } : {}) }),
        })
        const oldData = await githubFetch(config, oldPath)
        await githubDelete(config, oldPath, oldData.sha)
        set({ currentFile: null, editorContent: '' })
        await get().fetchFiles()
        await get().loadFile(newPath)
      },

      getAllNotes: () => {
        const all: NoteFile[] = []
        const walk = (nodes: NoteFile[]) => { for (const n of nodes) { if (!n.isFolder) all.push(n); if (n.children) walk(n.children) } }
        walk(get().files)
        return all
      },
    }),
    { name: 'cortex-notes', partialize: (s) => ({ config: s.config, openRouterKey: s.openRouterKey, geminiKey: s.geminiKey, aiProvider: s.aiProvider }) }
  )
)
