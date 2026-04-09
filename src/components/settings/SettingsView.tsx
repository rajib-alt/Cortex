import { useState } from 'react'
import { Settings, Download, Upload, Trash2, Github, Key, Palette, Database, AlertTriangle } from 'lucide-react'
import { useNotesStore } from '@/store/notesStore'
import { useFinanceStore } from '@/store/financeStore'
import { useBlocksStore } from '@/store/blocksStore'
import { useJournalStore } from '@/store/journalStore'
import { useTasksStore } from '@/store/tasksStore'
import { useLearningStore } from '@/store/learningStore'
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Card, CardContent, CardHeader, CardTitle, Separator } from '@/components/ui'
import { cn } from '@/lib/utils'

const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'AED', 'SAR']

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsView() {
  const notesStore = useNotesStore()
  const financeStore = useFinanceStore()
  const blocksStore = useBlocksStore()
  const journalStore = useJournalStore()
  const tasksStore = useTasksStore()
  const learningStore = useLearningStore()

  // GitHub config form
  const [pat, setPat] = useState(notesStore.config?.pat || '')
  const [username, setUsername] = useState(notesStore.config?.username || '')
  const [repo, setRepo] = useState(notesStore.config?.repo || '')

  // AI key
  const [aiKey, setAiKey] = useState(() => localStorage.getItem('cortex-openrouter-key') || '')

  // Currency
  const [currency, setCurrency] = useState(financeStore.currency)

  const [saved, setSaved] = useState(false)

  const saveGitHub = () => {
    if (pat && username && repo) notesStore.setConfig({ pat, username, repo })
    localStorage.setItem('cortex-openrouter-key', aiKey)
    financeStore.setCurrency(currency)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Export all data
  const exportAll = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      blocks: blocksStore.spaces,
      journal: journalStore.entries,
      finance: {
        transactions: financeStore.transactions,
        budgets: financeStore.budgets,
        savingsGoals: financeStore.savingsGoals,
        currency: financeStore.currency,
      },
      tasks: tasksStore.tasks,
      learning: learningStore.items,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cortex-os-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import data
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.blocks) {
          // Restore blocks
          // Note: we merge rather than replace to avoid data loss
          console.log('Import would restore:', Object.keys(data))
          alert('Import preview successful. Full restore will be implemented in next version.')
        }
      } catch { alert('Invalid backup file.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Stats
  const totalEntries = journalStore.entries.length
  const totalBlocks = blocksStore.spaces.reduce((s, sp) => s + sp.blocks.length, 0)
  const totalTxs = financeStore.transactions.length
  const totalTasks = tasksStore.tasks.length
  const totalLearnings = learningStore.items.length

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="font-heading text-xl font-bold">Settings</h1>
        </div>

        {/* GitHub Notes Sync */}
        <Section title="GitHub Notes Sync" icon={Github}>
          <p className="text-xs text-muted-foreground">Your markdown notes are stored in a GitHub repository. Notes auto-save every 1.2 seconds.</p>
          <div className="space-y-2">
            <Input placeholder="Personal Access Token (repo scope)" value={pat} onChange={e => setPat(e.target.value)} type="password" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="GitHub username" value={username} onChange={e => setUsername(e.target.value)} />
              <Input placeholder="Repository name" value={repo} onChange={e => setRepo(e.target.value)} />
            </div>
          </div>
          {notesStore.config && (
            <p className="text-xs text-green-400">✓ Connected to {notesStore.config.username}/{notesStore.config.repo}</p>
          )}
        </Section>

        {/* AI Assistant */}
        <Section title="AI Assistant" icon={Key}>
          <p className="text-xs text-muted-foreground">OpenRouter API key for the AI Assistant panel. Uses the free <code className="font-mono">stepfun/step-3.5-flash:free</code> model by default.</p>
          <Input placeholder="sk-or-…" value={aiKey} onChange={e => setAiKey(e.target.value)} type="password" />
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Get a free OpenRouter API key →</a>
        </Section>

        {/* Finance */}
        <Section title="Finance" icon={Database}>
          <Row label="Currency" sub="Used for all amounts">
            <Select value={currency} onValueChange={v => setCurrency(v)}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
        </Section>

        {/* Save button */}
        <Button className="w-full" onClick={saveGitHub}>
          {saved ? '✓ Saved!' : 'Save Settings'}
        </Button>

        {/* Data snapshot */}
        <Section title="Your Data" icon={Database}>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Thoughts',  value: totalBlocks },
              { label: 'Journal',   value: totalEntries },
              { label: 'Tasks',     value: totalTasks },
              { label: 'Finances',  value: totalTxs },
              { label: 'Learnings', value: totalLearnings },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-secondary">
                <p className="font-heading text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Export / Import */}
        <Section title="Backup & Restore" icon={Download}>
          <p className="text-xs text-muted-foreground">
            All data (thoughts, journal, finance, tasks, learning) is stored locally in your browser.
            Export a JSON backup to keep it safe.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={exportAll}>
              <Download className="h-4 w-4" />Export Backup
            </Button>
            <label className="flex-1">
              <div className="flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-border text-sm font-medium cursor-pointer hover:bg-secondary transition-colors">
                <Upload className="h-4 w-4" />Import Backup
              </div>
              <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone" icon={AlertTriangle}>
          <div className="space-y-3">
            <Row label="Clear all thoughts" sub="Permanently deletes all blocks in all spaces">
              <Button variant="destructive" size="sm" onClick={() => {
                if (confirm('Delete ALL thoughts? This cannot be undone.')) {
                  blocksStore.spaces.forEach(sp => {
                    sp.blocks.forEach(b => blocksStore.deleteBlock(sp.id, b.id))
                  })
                }
              }}>Clear</Button>
            </Row>
            <Separator />
            <Row label="Clear finance data" sub="Permanently deletes all transactions">
              <Button variant="destructive" size="sm" onClick={() => {
                if (confirm('Delete ALL finance data? This cannot be undone.')) {
                  financeStore.transactions.forEach(t => financeStore.deleteTransaction(t.id))
                }
              }}>Clear</Button>
            </Row>
          </div>
        </Section>

        {/* About */}
        <div className="text-center py-4 text-xs text-muted-foreground space-y-1">
          <p className="font-heading font-semibold text-foreground">Cortex OS v1.0</p>
          <p>Your private second brain — no tracking, no accounts needed.</p>
          <p>Built with React, Vite, Zustand, Tailwind CSS.</p>
        </div>
      </div>
    </div>
  )
}
