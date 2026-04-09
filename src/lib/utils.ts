import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export function formatDate(date: string | Date, fmt: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (fmt === 'time') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (fmt === 'long') return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export function truncate(text: string, len = 80): string {
  return text.length > len ? text.slice(0, len) + '…' : text
}
