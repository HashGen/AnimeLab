# AGENTS.md

## Project purpose
Avatar Lab is focused on animating an existing 2D character's mouth from audio volume. Preserve the selected character; do not replace it with a generated face.

## Commands
```bash
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## Engineering priorities
- Keep audio-driven mouth opening and closing reliable, with a closed mouth during silence.
- Keep the mouth attached to the face and responsive to the selected character's expression and movement.
- Prioritize a clear, centered, square mobile preview.
- Keep the Audio, character selection, expression, animation, and export workflows useful and accessible.
- Preserve local project persistence and avoid adding a backend unless explicitly requested.
- Use TypeScript and add focused tests for behavior changes.
- The standalone engine file is generated; update it through the existing generator.
