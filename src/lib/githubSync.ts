import { GitHubConfig } from '@/store/notesStore'
import { Budget, SavingsGoal, Transaction } from '@/store/financeStore'
import { JournalEntry } from '@/store/journalStore'
import { LearningItem } from '@/store/learningStore'
import { Space } from '@/store/blocksStore'
import { Task } from '@/store/tasksStore'

const toBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)))

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

export async function saveMarkdownFile(config: GitHubConfig, path: string, content: string, message: string) {
  let sha: string | undefined
  try {
    const existing = await githubFetch(config, path)
    sha = existing.sha
  } catch {
    sha = undefined
  }

  await githubFetch(config, path, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: toBase64(content),
      ...(sha ? { sha } : {}),
    }),
  })
}

const formatDate = (date: string | number | Date) => new Date(date).toISOString().split('T')[0]

export function blocksToMarkdown(spaces: Space[]) {
  const lines = [
    '# Thoughts Export',
    `Generated: ${formatDate(new Date())}`,
    '',
    'This file contains your Cortex thoughts as markdown, including spaces, blocks, tags, and subtasks.',
    '',
  ]

  for (const space of spaces) {
    lines.push(`## ${space.icon} ${space.name}`)
    lines.push('')
    if (space.blocks.length === 0) {
      lines.push('- _No blocks in this space yet_')
    }
    for (const block of space.blocks) {
      const tags = block.tags?.map(t => `#${t}`).join(' ') || ''
      const annotation = block.annotation ? `
> ${block.annotation}` : ''
      lines.push(`- **[${block.type}]** ${block.text}${tags ? ` ${tags}` : ''}${annotation}`)
      if (block.subTasks?.length) {
        for (const task of block.subTasks) {
          lines.push(`  - [${task.isDone ? 'x' : ' '}] ${task.text}`)
        }
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function journalToMarkdown(entries: JournalEntry[]) {
  const lines = [
    '# Journal Export',
    `Generated: ${formatDate(new Date())}`,
    '',
  ]

  if (entries.length === 0) {
    lines.push('No journal entries yet.')
    return lines.join('\n')
  }

  for (const entry of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    lines.push(`## ${entry.date} — ${entry.title}`)
    lines.push('')
    if (entry.mood) lines.push(`- Mood: ${entry.mood}`)
    if (entry.tags.length) lines.push(`- Tags: ${entry.tags.map(t => `#${t}`).join(' ')}`)
    lines.push(`- Created: ${formatDate(entry.createdAt)}`)
    lines.push(`- Updated: ${formatDate(entry.updatedAt)}`)
    lines.push('')
    if (entry.gratitude.length) {
      lines.push('### Gratitude')
      lines.push(...entry.gratitude.map(item => `- ${item}`))
      lines.push('')
    }
    if (entry.intentions.length) {
      lines.push('### Intentions')
      lines.push(...entry.intentions.map(item => `- ${item}`))
      lines.push('')
    }
    lines.push(entry.content || '_No content yet_')
    lines.push('')
  }

  return lines.join('\n')
}

export function financeToMarkdown(transactions: Transaction[], budgets: Budget[], savingsGoals: SavingsGoal[], currency: string) {
  const lines = [
    '# Finance Export',
    `Generated: ${formatDate(new Date())}`,
    `Currency: ${currency}`,
    '',
    '## Transactions',
    '',
  ]

  if (transactions.length === 0) {
    lines.push('- No transactions yet.')
  } else {
    lines.push('| Date | Type | Category | Amount | Note | Tags |')
    lines.push('| --- | --- | --- | --- | --- | --- |')
    for (const tx of [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())) {
      lines.push(`| ${tx.date} | ${tx.incomeExpense} | ${tx.type || '-'} | ${tx.amount} ${currency} | ${tx.description || '-'} | ${tx.tags?.map(t => `#${t}`).join(' ') || '-'} |`)
    }
  }

  lines.push('', '## Budgets', '')
  if (budgets.length === 0) {
    lines.push('- No budgets set.')
  } else {
    for (const budget of budgets) {
      lines.push(`- **${budget.category}** — ${budget.limit} ${currency} / ${budget.period}`)
    }
  }

  lines.push('', '## Savings Goals', '')
  if (savingsGoals.length === 0) {
    lines.push('- No savings goals yet.')
  } else {
    for (const goal of savingsGoals) {
      lines.push(`- **${goal.name}** — ${goal.currentAmount}/${goal.targetAmount} ${currency}${goal.deadline ? `, deadline: ${goal.deadline}` : ''}`)
    }
  }

  return lines.join('\n')
}

export function tasksToMarkdown(tasks: Task[]) {
  const lines = [
    '# Tasks Export',
    `Generated: ${formatDate(new Date())}`,
    '',
  ]

  if (tasks.length === 0) {
    lines.push('No tasks yet.')
    return lines.join('\n')
  }

  const groups = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    acc[task.category] = [...(acc[task.category] || []), task]
    return acc
  }, {})

  for (const category of Object.keys(groups)) {
    lines.push(`## ${category}`)
    lines.push('')
    for (const task of groups[category]) {
      lines.push(`- **[${task.status}] ${task.title}** (${task.priority})${task.dueDate ? ` — due ${task.dueDate}` : ''}`)
      if (task.description) lines.push(`  - ${task.description}`)
      if (task.tags.length) lines.push(`  - Tags: ${task.tags.map(t => `#${t}`).join(' ')}`)
      if (task.subTasks.length) {
        for (const sub of task.subTasks) {
          lines.push(`  - [${sub.done ? 'x' : ' '}] ${sub.text}`)
        }
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function learningToMarkdown(items: LearningItem[]) {
  const lines = [
    '# Learning Export',
    `Generated: ${formatDate(new Date())}`,
    '',
  ]

  if (items.length === 0) {
    lines.push('No learning items yet.')
    return lines.join('\n')
  }

  for (const item of items) {
    lines.push(`## ${item.title}`)
    lines.push('')
    lines.push(`- Category: ${item.category}`)
    lines.push(`- Status: ${item.status}`)
    lines.push(`- Next review: ${item.nextReviewDate}`)
    lines.push(`- Ease: ${item.ease}`)
    lines.push(`- Interval: ${item.interval} days`)
    lines.push('')
    if (item.source) lines.push(`- Source: ${item.source}`)
    if (item.tags.length) lines.push(`- Tags: ${item.tags.map(t => `#${t}`).join(' ')}`)
    lines.push('')
    lines.push(item.content || '_No content yet_')
    lines.push('')
  }

  return lines.join('\n')
}
