# Changelog

All notable changes to this package. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org/).

## [1.0.1] - 2026-11-17

### Changed

- The package moved from the `samline/utils` monorepo to its own repository, [samline/scroll-spy](https://github.com/samline/scroll-spy). Homepage, repository and documentation links point to the package's own site.

## [1.0.0] - 2026-11-13

### Added

- First release: `scrollSpy` and `autoScrollSpy` highlight the navigation link of the section in view with `aria-current` (and an optional class), using an activation line (`offset`, 25% by default) that handles short and tall sections, the last section at the bottom of the page, click locking during smooth or scripted scrolls, scroll containers (`root`), long navigations that follow the active link, an optional URL hash and `onChange`. ESM, CommonJS and a browser global (`window.ScrollSpy`) that starts on its own.
