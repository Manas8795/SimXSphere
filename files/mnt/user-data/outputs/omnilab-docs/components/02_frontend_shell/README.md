# 02 — Frontend Shell (Module A)

**Depends on:** 01. **Cloud:** none. **Next:** [03 Simulation Engine](../03_simulation_engine/README.md)

## Purpose
Build the navigable application skeleton and layout so simulations, saved experiments, and OmniPack have real pages to plug into.

## In Scope
- Landing/overview page.
- Simulation catalogue page (lists planned simulations; unavailable ones clearly labeled "coming later", not fake buttons).
- Simulation workspace layout: controls panel, run/reset, graph/canvas area, result summary, notes. Populated with real behavior in milestone 03.
- Saved experiments list and detail page shells (wired in 04).
- Export/import and share page shells (wired in 05 and 08).
- Responsive layout, keyboard navigation, labels, contrast, focus states.
- Loading, empty, and error state components.

## Out of Scope
Simulation math, storage, ZIP, networking.

## Rules
- **No UI-only mock buttons.** Anything not yet implemented is hidden or disabled with an explanation.
- Keep the design simple; no heavy design system or animation.

## Steps
1. Define routes and navigation.
2. Build shared layout, header, footer.
3. Build page shells with the state components.
4. Add accessibility basics (landmarks, labels, alt text, focus order).

## Tests / Checks
- Component/route render tests for each page.
- Manual: navigate every route at mobile (~375px) and desktop widths.
- Keyboard-only walkthrough; no focus traps.
- Empty and error states reachable and readable.

## Acceptance Gate
- [ ] All pages reachable and render without console errors.
- [ ] Responsive at mobile and desktop.
- [ ] No non-functional action buttons visible as if working.
- [ ] Basic accessibility checks pass.

## Agent Prompt
`docs/agent-prompts/02_FRONTEND_SHELL_PROMPT.md`

## Evidence
Screenshots: each page, mobile and desktop; keyboard walkthrough notes.
