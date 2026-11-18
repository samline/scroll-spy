// DOM-free part of scroll-spy: types, constants and pure helpers. The DOM
// controller lives in src/vanilla/scroll-spy.ts.
import { type AutoInitController, type ElementTarget } from '@samline/internal'

export type { AutoInitController, ElementTarget }

export interface ScrollSpyChange {
  /** Id of the active section, or `null` when none is active. */
  id: string | null
  section: Element | null
  /** Every link in the navigation that points to the section. */
  links: HTMLAnchorElement[]
  /** Id of the previously active section. */
  previous: string | null
}

export interface ScrollSpyOptions {
  /**
   * Where the activation line sits, from the top of the viewport (or `root`):
   * pixels (`80`) or a percentage of its height (`'25%'`). A section becomes
   * active once its top crosses the line. Defaults to `'25%'`.
   */
  offset?: number | string
  /** Scroll container holding the sections. Defaults to the viewport. */
  root?: Element | null
  /** Links to watch inside the navigation. Defaults to `'a[href*="#"]'`. */
  links?: string
  /** `aria-current` value for active links, or `false` for none. Defaults to `'true'`. */
  ariaCurrent?: string | false
  /** Class added to active links. */
  activeClass?: string
  /** Keep a clicked link active while the page scrolls to it. Defaults to `true`. */
  lockOnClick?: boolean
  /** Scroll the navigation itself so the active link stays visible. Defaults to `true`. */
  followActive?: boolean
  /** Replace the URL hash with the active id (without a history entry). Defaults to `false`. */
  updateHash?: boolean
  onChange?: (change: ScrollSpyChange) => void
}

export interface AutoScrollSpyOptions extends ScrollSpyOptions {
  /** Navigations to watch. Defaults to `'[data-scroll-spy]'`. */
  selector?: string
  /** Where to look for them. Defaults to `document`. */
  scope?: ParentNode
  /** Also watch matching navigations added later. Defaults to `true`. */
  observe?: boolean
}

export interface ScrollSpy {
  /** Id of the active section, or `null`. */
  readonly active: string | null
  /** Read the links and sections again, for example after changing the page. */
  refresh: () => void
  /** Stop watching and remove every attribute and class it added. */
  destroy: () => void
}

export const ATTRIBUTE = 'data-scroll-spy'

export const noopSpy: ScrollSpy = { active: null, refresh: () => {}, destroy: () => {} }

/** `80` → 80 px; `'25%'` → a quarter of `height`; `'80px'` or `'80'` → 80 px. */
export const resolveOffset = (offset: number | string, height: number) => {
  if (typeof offset === 'number') return offset
  const value = parseFloat(offset)
  if (!Number.isFinite(value)) return height * 0.25
  return offset.trim().endsWith('%') ? (height * value) / 100 : value
}
