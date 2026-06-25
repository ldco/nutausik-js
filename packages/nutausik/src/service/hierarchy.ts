import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import { ServiceError } from '../utils/helpers.js'
import { validateSlug, validateLength } from './validation.js'

export function epicAdd(be: SQLiteBackend, slug: string, title: string, description?: string | null, status?: string): string {
  validateSlug(slug)
  validateLength(title, 'Title')
  const existing = crud.epicGet(be, slug)
  if (existing) throw new ServiceError(`Epic '${slug}' already exists.`)
  return crud.epicAdd(be, slug, title, description, status)
}

export function epicGet(be: SQLiteBackend, slug: string) {
  const epic = crud.epicGet(be, slug)
  if (!epic) throw new ServiceError(`Epic '${slug}' not found.`)
  return epic
}

export function epicList(be: SQLiteBackend, status?: string) {
  return crud.epicList(be, status)
}

export function epicUpdate(be: SQLiteBackend, slug: string, fields: Record<string, unknown>) {
  epicGet(be, slug)
  return crud.epicUpdate(be, slug, fields)
}

export function epicDelete(be: SQLiteBackend, slug: string): string {
  epicGet(be, slug)
  return crud.epicDelete(be, slug)
}

export function storyAdd(be: SQLiteBackend, epicSlug: string, slug: string, title: string, description?: string | null): string {
  validateSlug(slug)
  validateLength(title, 'Title')
  const epic = crud.epicGet(be, epicSlug)
  if (!epic) throw new ServiceError(`Epic '${epicSlug}' not found.`)
  const existing = crud.storyGet(be, slug)
  if (existing) throw new ServiceError(`Story '${slug}' already exists.`)
  return crud.storyAdd(be, epicSlug, slug, title, description)
}

export function storyGet(be: SQLiteBackend, slug: string) {
  const story = crud.storyGet(be, slug)
  if (!story) throw new ServiceError(`Story '${slug}' not found.`)
  return story
}

export function storyList(be: SQLiteBackend, options?: { epic?: string; status?: string }) {
  return crud.storyList(be, options)
}

export function storyUpdate(be: SQLiteBackend, slug: string, fields: Record<string, unknown>) {
  storyGet(be, slug)
  return crud.storyUpdate(be, slug, fields)
}

export function storyDelete(be: SQLiteBackend, slug: string): string {
  storyGet(be, slug)
  return crud.storyDelete(be, slug)
}
