/**
 * Template Registry — types and registry map for image templates.
 *
 * Templates are React components used by both UI preview rendering
 * and server-side Satori rendering. They must be Satori-compatible:
 * - flexbox only (no grid, no position: absolute)
 * - no hooks
 * - explicit image dimensions
 */

import type { ReactElement } from 'react'

/** Slot specification — defines the size of a single cover slot. */
export interface SlotSpec {
  id: string
  w: number  // Width in pixels relative to preset
  h: number  // Height in pixels relative to preset
}

/** Cover asset passed to a template component. */
export interface CoverAsset {
  src: string           // Base64 data URL or placeholder SVG data URL
  isPlaceholder: boolean
}

/** Props passed to every template component. */
export interface TemplateProps {
  width: number
  height: number
  title: string
  description?: string
  username: string
  covers: CoverAsset[]
  /** For tier templates: tier labels and how many covers belong to each tier. */
  tiers?: { label: string; coverCount: number }[]
}

/** Which list types a template supports. */
export type ListType = 'RECOMMENDATION' | 'TIER'

/** Template registry entry. */
export interface TemplateRegistryEntry {
  id: string
  name: string
  description?: string
  slotCount: number
  supportedSizes: ('og' | 'square')[]
  /** Which list types this template can be used with. Defaults to ['RECOMMENDATION'] if omitted. */
  listTypes?: ListType[]
  getSlotSpecs: (preset: 'og' | 'square') => SlotSpec[]
  Component: (props: TemplateProps) => ReactElement
}

/** Central template registry map. */
const registry = new Map<string, TemplateRegistryEntry>()

/** Register a template. */
export function registerTemplate(entry: TemplateRegistryEntry): void {
  registry.set(entry.id, entry)
}

/** Get a template by ID. */
export function getTemplate(id: string): TemplateRegistryEntry | undefined {
  return registry.get(id)
}

/** Get all registered templates (sorted alphabetically by name). */
export function getAllTemplates(): TemplateRegistryEntry[] {
  return Array.from(registry.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/** Get template list for API response (without Component). */
export function getTemplateList(listType?: ListType) {
  let templates = getAllTemplates()
  if (listType) {
    templates = templates.filter((t) => {
      const types = t.listTypes ?? ['RECOMMENDATION']
      return types.includes(listType)
    })
  }
  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    slotCount: t.slotCount,
    supportedSizes: t.supportedSizes,
    listTypes: t.listTypes ?? ['RECOMMENDATION'],
  }))
}
