import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Brain, FileText, Edit3, DollarSign, CheckSquare,
  ChevronRight, Layers, Sparkles, Share2, Command, GraduationCap, Settings, Map
} from 'lucide-react'
import Dashboard from '@/components/dashboard/Dashboard'
import BlocksView from '@/components/blocks/BlocksView'
import JournalView from '@/components/journal/JournalView'
import FinanceDashboard from '@/components/finance/FinanceDashboard'
import TasksView from '@/components/dashboard/TasksView'
import LearningView from '@/components/learning/LearningView'
import SettingsView from '@/components/settings/SettingsView'
import RoadmapView from '@/components/roadmap/RoadmapView'
import { NotesSidebar, NotesEditor, NotesSettingsModal } from '@/components/notes/NotesComponents'
import GraphView from '@/components/notes/GraphView'
import CommandPalette from '@/components/ui/CommandPalette'
import AIPanel from '@/components/ui/AIPanel'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useTasksStore } from '@/store/tasksStore'
import { useJournalStore } from '@/store/journalStore'
import { useNotesStore } from '@/store/notesStore'
import { useLearningStore } from '@/store/learningStore'
import { Toaster } from 'sonner'

export type Tab = 'home' | 'thoughts' | 'notes' | 'journal' | 'finance' | 'tasks' | 'learning' | 'roadmap' | 'graph' | 'settings'

const NAV_ITEMS: { id: Tab; icon: any; label: string; color: string; shortcut: string }[] = [
  { id: 'home',     icon: Home,          label: 'Dashboard', color: 'text-foreground',  shortcut: '1' },
  { id: 'thoughts', icon: Brain,         label: 'Thoughts',  color: 'text-yellow-400',  shortcut: '2' },
  { id: 'notes',    icon: FileText,      label: 'Notes',     color: 'text-blue-400',    shortcut: '3' },
  { id: 'journal',  icon: Edit3,         label: 'Journal',   color: 'text-pink-400',    shortcut: '4' },
  { id: 'finance',  icon: DollarSign,    label: 'Finance',   color: 'text-primary',     shortcut: '5' },
  { id: 'tasks',    icon: CheckSquare,   label: 'Tasks',     color: 'text-green-400',   shortcut: '6' },
  { id: 'learning', icon: GraduationCap, label: 'Learning',  color: 'text-teal-400',    shortcut: '7' },
  { id: 'roadmap',  icon: Map,           label: 'Roadmap',   color: 'text-orange-400',  shortcut: '8' },
  { id: 'graph',    icon: Share2,        label: 'Graph',     color: 'text-purple-400',  shortcut: '9' },
]

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [collapsed, setCollapsed] = useState(false)
  const [showNotesSettings, setShowNotesSettings] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showAI, setShowAI] = useState(false)

  const overdueTasks = useTasksStore(s => s.getOverdue())
  const { entries } = useJournalStore()
  const learningStats = useLearningStore(s => s.getStats())
  const todayHasEntry = entries.some(e => e.date === new Date().toISOString().split('T')[0])
  const config = useNotesStore(s => s.config)
  const [hasPromptedGitHub, setHasPromptedGitHub] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette(s => !s); return }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); setShowAI(s => !s); return }
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const num = parseInt(e.key)
        if (num >= 1 && num <= 9) { const tab = NAV_ITEMS[num - 1]?.id; if (tab) setActiveTab(tab) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!config && !hasPromptedGitHub) {
      setHasPromptedGitHub(true)
      setActiveTab('settings')
    }
  }, [config, hasPromptedGitHub])

  const navigate = useCallback((tab: string) => setActiveTab(tab as Tab), [])

  const getBadge = (id: Tab): string | null => {
    if (id === 'tasks' && overdueTasks.length > 0) return String(overdueTasks.length)
    if (id === 'journal' && !todayHasEntry) return '·'
    if (id === 'learning' && learningStats.dueToday > 0) return String(learningStats.dueToday)
    return null
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar */}
        <nav className={cn(
          'flex flex-col border-r border-border bg-panel/60 backdrop-blur transition-all duration-200 shrink-0',
          collapsed ? 'w-14' : 'w-52'
        )}>
          {/* Logo */}
          <div className={cn('flex items-center gap-2 px-3 h-12 border-b border-border shrink-0', collapsed && 'justify-center px-0')}>
            <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 ml-1">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && <span className="font-heading font-bold text-sm text-foreground">Cortex OS</span>}
            <button onClick={() => setCollapsed(s => !s)} className={cn('ml-auto mr-2 text-muted-foreground hover:text-foreground transition-colors', collapsed && 'ml-0 mr-0')}>
              <ChevronRight className={cn('h-4 w-4 transition-transform duration-200', !collapsed && 'rotate-180')} />
            </button>
          </div>

          {/* ⌘K search */}
          {!collapsed && (
            <button onClick={() => setShowCommandPalette(true)} className="mx-2 mt-2 mb-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 text-xs text-muted-foreground hover:bg-secondary transition-colors">
              <Command className="h-3 w-3 shrink-0" />
              <span className="flex-1 text-left">Search everything…</span>
              <kbd className="text-[9px] bg-background rounded px-1 border border-border py-0.5">⌘K</kbd>
            </button>
          )}

          {/* Nav */}
          <div className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.id
              const badge = getBadge(item.id)
              if (collapsed) return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button onClick={() => setActiveTab(item.id)} className={cn('relative w-full h-9 flex items-center justify-center rounded-lg transition-colors', isActive ? 'bg-primary/10' : 'hover:bg-secondary')}>
                      <item.icon className={cn('h-4 w-4', isActive ? item.color : 'text-muted-foreground')} />
                      {badge && <span className="absolute top-0.5 right-0.5 h-3.5 min-w-3.5 px-0.5 bg-destructive rounded-full text-[8px] text-white flex items-center justify-center leading-none">{badge}</span>}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label} <kbd className="ml-1 text-[9px] opacity-60">{item.shortcut}</kbd></TooltipContent>
                </Tooltip>
              )
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={cn('relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors', isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                  <item.icon className={cn('h-4 w-4 shrink-0', isActive ? item.color : '')} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge ? (
                    <span className="h-4 min-w-4 px-1 bg-destructive rounded-full text-[9px] text-white flex items-center justify-center leading-none">{badge}</span>
                  ) : (
                    <kbd className="text-[9px] text-muted-foreground/40">{item.shortcut}</kbd>
                  )}
                </button>
              )
            })}
          </div>

          {/* Bottom: AI + Settings */}
          <div className="p-2 border-t border-border space-y-0.5">
            {collapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setShowAI(s => !s)} className={cn('w-full h-9 flex items-center justify-center rounded-lg transition-colors', showAI ? 'bg-primary/10' : 'hover:bg-secondary')}>
                      <Sparkles className={cn('h-4 w-4', showAI ? 'text-primary' : 'text-muted-foreground')} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">AI Assistant ⌘/</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setActiveTab('settings')} className={cn('w-full h-9 flex items-center justify-center rounded-lg transition-colors', activeTab === 'settings' ? 'bg-primary/10' : 'hover:bg-secondary')}>
                      <Settings className={cn('h-4 w-4', activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground')} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <button onClick={() => setShowAI(s => !s)} className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors', showAI ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">AI Assistant</span>
                  <kbd className="text-[9px] text-muted-foreground/40">⌘/</kbd>
                </button>
                <button onClick={() => setActiveTab('settings')} className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors', activeTab === 'settings' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                  <Settings className={cn('h-4 w-4 shrink-0', activeTab === 'settings' ? 'text-primary' : '')} />
                  <span className="flex-1 text-left">Settings</span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="flex-1 overflow-hidden flex">
              {activeTab === 'home'     && <Dashboard onNavigate={navigate} />}
              {activeTab === 'thoughts' && <BlocksView />}
              {activeTab === 'notes'    && (
                <div className="flex flex-1 overflow-hidden">
                  <div className="w-60 shrink-0"><NotesSidebar onShowSettings={() => setShowNotesSettings(true)} /></div>
                  <div className="flex-1 overflow-hidden flex flex-col"><NotesEditor /></div>
                </div>
              )}
              {activeTab === 'journal'  && <JournalView />}
              {activeTab === 'finance'  && <FinanceDashboard />}
              {activeTab === 'tasks'    && <TasksView />}
              {activeTab === 'learning' && <LearningView />}
              {activeTab === 'roadmap'  && <RoadmapView />}
              {activeTab === 'settings' && <SettingsView />}
              {activeTab === 'graph'    && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
                    <Share2 className="h-4 w-4 text-purple-400" />
                    <span className="font-heading font-semibold text-sm">Knowledge Graph</span>
                    <span className="text-xs text-muted-foreground ml-1">— notes, thoughts & tags</span>
                  </div>
                  <div className="flex-1 overflow-hidden"><GraphView /></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <AIPanel open={showAI} onClose={() => setShowAI(false)} />
        </div>
      </div>

      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} onNavigate={navigate} />
      <NotesSettingsModal open={showNotesSettings} onOpenChange={setShowNotesSettings} />
      <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: 'hsl(25 12% 7%)', border: '1px solid hsl(25 8% 16%)', color: 'hsl(35 20% 88%)' } }} />
    </TooltipProvider>
  )
}
