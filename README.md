# Avatar Lab

**Avatar Lab** is a browser-based tool for making an existing 2D avatar talk from audio. The current focus is simple and deliberate: choose a built-in character, load an audio file, and animate that character's mouth open and closed according to the audio volume. It does not generate a new face or replace the selected character.

## Main workflow

1. Choose one of the existing avatars.
2. Open **Audio** and select an audio file.
3. Adjust the mouth sensitivity if needed.
4. Preview the audio-driven mouth movement on the same character.
5. Use the existing expression and animation controls when you want to refine the character or its movement.
6. Export or save your work using the options available in the app.

## Design priorities

- Keep the selected character and its original appearance.
- Drive mouth opening and closing from audio volume; silence should keep the mouth closed.
- Keep the mouth attached to the face so it follows the character and its expression.
- Make the preview square, centered, and easy to use on mobile.
- Keep the preview clear: no unnecessary camera controls or branding links.
- Keep useful character, expression, animation, and export capabilities available for future improvements.
- Store the project locally in the browser unless an explicit backup/export option is used.

## Run locally

Requirements: Node.js 22.12+ and pnpm 10.34.5.

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173.

## Validation and production build

```bash
pnpm check
pnpm build
pnpm preview
```

The production build is written to `dist/`. The source code remains in `src/`; `dist/` is generated output for static hosting.

## Project structure

- `src/features/studio/` — workspace, tabs, preview, audio-mouth controls, and local project flow.
- `src/features/rendering/` — character rendering and live preview.
- `src/features/avatar/` — existing avatar shapes, face/eye geometry, and expressions.
- `src/features/animation/` — reusable expression-based animation behavior.
- `src/features/export/` — image and project export utilities.
- `src/app/styles.css` — responsive layout and interface styling.

## Notes

The mouth animation is volume-driven, not phoneme recognition or natural lip-sync. The goal is to make the selected character open and close its mouth in time with the audio while preserving the existing face and character design.
