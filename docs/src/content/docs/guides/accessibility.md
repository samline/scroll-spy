---
title: 'Accessibility and navigation'
titleAccent: 'navigation'
description: How @samline/scroll-spy marks the current link with aria-current, behaves with reduced motion and keeps keyboard navigation native.
locale: en
sidebar:
  group: guides
  order: 3
  label: Accessibility
---

## Responsibilities

Scroll Spy marks the link of the section being read. It guarantees `aria-current="true"` on the active link (or your `ariaCurrent` value), removes it from the others and restores any value a link had before on `destroy()`. Links stay plain `#id` anchors: clicking, keyboard activation and the browser's own jump are untouched. Your markup provides a labelled `nav` and sections the links point to.

## Keyboard and focus

Scroll Spy never moves focus and never scrolls the page. Tab, Enter and the browser's history work as without it. Combine it with [@samline/scroll-to](https://www.npmjs.com/package/@samline/scroll-to) or CSS `scroll-behavior` when you want smooth jumps that move focus to the section.

## Motion and state

- When a long navigation has its own scroll box, the active link is kept in view (`followActive`). That scroll is instant with reduced motion.
- `aria-current` is announced by screen readers when focus reaches the link; it is not a live region, so scrolling does not produce announcements.
- Choose `ariaCurrent: 'location'` when the links point to parts of one page and your audience benefits from the more specific value.

## Layout and contrast

Do not rely on color alone for the active link: pair it with weight, a border or an underline, as in the examples (`nav a[aria-current]`). Keep the active style's contrast at least as strong as the other links in both themes.
