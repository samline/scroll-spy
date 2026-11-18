import {
  autoInit,
  isBrowser,
  prefersReducedMotion,
  readBoolean,
  readString,
  resolveElements,
  type AutoInitController,
} from '@samline/internal'
import {
  type ScrollSpyOptions,
  type AutoScrollSpyOptions,
  type ScrollSpy,
  ATTRIBUTE,
  noopSpy,
  resolveOffset,
} from '../core/scroll-spy.js'

/** The id a same-page link points to, or `null`. */
const targetId = (link: HTMLAnchorElement) => {
  const href = link.getAttribute('href') ?? ''
  const hash = href.startsWith('#') ? href : link.hash
  if (!hash || hash === '#') return null
  if (!href.startsWith('#')) {
    // Only links to this document: same origin, path and query.
    const here = window.location
    if (
      link.origin !== here.origin ||
      link.pathname !== here.pathname ||
      link.search !== here.search
    )
      return null
  }
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return hash.slice(1)
  }
}

const isScrollable = (element: Element) => element.scrollHeight > element.clientHeight + 1

/**
 * Highlight the link of the section in view inside `nav`.
 *
 * Links pointing to `#id` sections of this page are watched. The active link
 * gets `aria-current="true"` (and `activeClass`). A section is active once
 * its top crosses the activation line (`offset`); at the very bottom of the
 * page, the last section in view is active. Returns `{ active, refresh, destroy }`.
 */
export const scrollSpy = (nav: Element | string, options: ScrollSpyOptions = {}): ScrollSpy => {
  if (!isBrowser()) return noopSpy
  const container = resolveElements(nav)[0]
  if (!container) return noopSpy

  const offsetOption: number | string =
    readString(container, 'data-scroll-spy-offset', '') || (options.offset ?? '25%')
  const activeClass = readString(container, 'data-scroll-spy-class', options.activeClass ?? '')
  const ariaCurrent = options.ariaCurrent === undefined ? 'true' : options.ariaCurrent
  const lockOnClick = readBoolean(container, 'data-scroll-spy-lock', options.lockOnClick ?? true)
  const followActive = readBoolean(
    container,
    'data-scroll-spy-follow',
    options.followActive ?? true
  )
  const updateHash = readBoolean(container, 'data-scroll-spy-hash', options.updateHash ?? false)
  const root = options.root ?? null
  const scroller: Element | Window = root ?? window

  let entries: Array<{ id: string; section: Element; links: HTMLAnchorElement[] }> = []
  let active: string | null = null
  let locked = false
  let frame = 0
  let idle: ReturnType<typeof setTimeout> | undefined
  const originals = new Map<HTMLAnchorElement, string | null>()
  const restore = (link: HTMLAnchorElement) => {
    if (activeClass) link.classList.remove(activeClass)
    if (!originals.has(link)) return
    const original = originals.get(link)
    if (original === null || original === undefined) link.removeAttribute('aria-current')
    else link.setAttribute('aria-current', original)
  }

  const read = () => {
    const byId = new Map<string, HTMLAnchorElement[]>()
    for (const link of container.querySelectorAll<HTMLAnchorElement>(
      options.links ?? 'a[href*="#"]'
    )) {
      const id = targetId(link)
      if (id) byId.set(id, [...(byId.get(id) ?? []), link])
    }
    entries = []
    byId.forEach((links, id) => {
      const section = document.getElementById(id)
      if (section) entries.push({ id, section, links })
    })
    entries.sort((a, b) =>
      a.section.compareDocumentPosition(b.section) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    )
  }

  const bounds = () => {
    if (root) {
      const box = root.getBoundingClientRect()
      return { top: box.top, bottom: box.bottom, height: box.height }
    }
    return { top: 0, bottom: window.innerHeight, height: window.innerHeight }
  }

  const atBottom = () => {
    const element = root ?? document.scrollingElement ?? document.documentElement
    const top = root ? root.scrollTop : window.scrollY
    return top > 0 && top + element.clientHeight >= element.scrollHeight - 2
  }

  /** The section that should be active for the current scroll position. */
  const compute = (): string | null => {
    const view = bounds()
    const line = view.top + resolveOffset(offsetOption, view.height)
    let current: string | null = null
    for (const entry of entries) {
      if (entry.section.getBoundingClientRect().top <= line + 1) current = entry.id
    }
    if (atBottom()) {
      for (const entry of entries) {
        if (entry.section.getBoundingClientRect().top < view.bottom) current = entry.id
      }
    }
    return current
  }

  const follow = (link: HTMLAnchorElement) => {
    // Scroll the closest scrollable ancestor inside the navigation, never the page.
    let box: Element | null = link.parentElement
    while (box && box !== container.parentElement && !isScrollable(box)) box = box.parentElement
    if (!box || box === container.parentElement || !isScrollable(box)) return
    const linkBox = link.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()
    if (linkBox.top >= boxRect.top && linkBox.bottom <= boxRect.bottom) return
    const top = box.scrollTop + linkBox.top - boxRect.top - (boxRect.height - linkBox.height) / 2
    box.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  const setActive = (id: string | null) => {
    if (id === active) return
    const previous = active
    active = id
    let current: (typeof entries)[number] | undefined
    for (const entry of entries) {
      const on = entry.id === id
      if (on) current = entry
      for (const link of entry.links) {
        if (ariaCurrent !== false) {
          if (!originals.has(link)) originals.set(link, link.getAttribute('aria-current'))
          if (on) link.setAttribute('aria-current', ariaCurrent)
          else link.removeAttribute('aria-current')
        }
        if (activeClass) link.classList.toggle(activeClass, on)
      }
    }
    if (current && followActive) follow(current.links[0]!)
    if (updateHash) {
      const url = new URL(window.location.href)
      url.hash = id ? `#${encodeURIComponent(id)}` : ''
      history.replaceState(history.state, '', url)
    }
    options.onChange?.({
      id,
      section: current?.section ?? null,
      links: current?.links ?? [],
      previous,
    })
  }

  const update = () => {
    frame = 0
    if (!locked) setActive(compute())
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }

  /** Unlock once scrolling has been quiet for a moment. */
  const settle = () => {
    clearTimeout(idle)
    idle = setTimeout(() => {
      locked = false
      schedule()
    }, 150)
  }

  const onScroll = () => {
    if (locked) settle()
    schedule()
  }

  const onClick = (event: Event) => {
    const mouse = event as MouseEvent
    // Prevented clicks still count: they usually scroll with JavaScript instead.
    if (mouse.button > 0) return
    if (mouse.metaKey || mouse.ctrlKey || mouse.shiftKey || mouse.altKey) return
    const link = (event.target as Element | null)?.closest?.('a')
    if (!link || !container.contains(link)) return
    const entry = entries.find(item => item.links.includes(link as HTMLAnchorElement))
    if (!entry) return
    setActive(entry.id)
    if (lockOnClick) {
      locked = true
      settle()
    }
  }

  read()
  update()

  scroller.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', schedule)
  container.addEventListener('click', onClick)

  let destroyed = false
  return {
    get active() {
      return active
    },
    refresh: () => {
      if (destroyed) return
      read()
      active = null
      locked = false
      for (const [link] of originals) {
        if (!entries.some(entry => entry.links.includes(link))) {
          restore(link)
          originals.delete(link)
        }
      }
      update()
    },
    destroy: () => {
      if (destroyed) return
      destroyed = true
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', schedule)
      container.removeEventListener('click', onClick)
      cancelAnimationFrame(frame)
      clearTimeout(idle)
      for (const entry of entries) for (const link of entry.links) restore(link)
      originals.forEach((_, link) => restore(link))
      originals.clear()
    },
  }
}

/**
 * Watch every `[data-scroll-spy]` navigation in `scope`, including ones added
 * later, and clean up ones that are removed. Returns a controller with
 * `refresh()` and `destroy()`.
 */
export const autoScrollSpy = ({
  selector = `[${ATTRIBUTE}]`,
  scope,
  observe = true,
  ...options
}: AutoScrollSpyOptions = {}): AutoInitController => {
  return autoInit({
    selector,
    observe,
    ...(scope && { root: scope }),
    init: element => scrollSpy(element, options).destroy,
  })
}
