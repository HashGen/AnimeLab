# Avatar Lab Context

## Purpose
This project is a browser-based tool for animating the mouth of an existing 2D avatar from audio. The character's face and identity remain intact; audio volume controls mouth opening and closing. This is simple volume-driven animation, not phoneme recognition or natural lip-sync.

## Core behavior
- Select an existing avatar.
- Load and play an audio file.
- Analyze the playing audio volume and animate mouth opening.
- Close the mouth during silence or when playback stops.
- Keep mouth placement and rotation aligned with the face and expression.
- Keep the preview square, centered, uncluttered, and mobile-friendly.

## Useful supporting capabilities
Character selection, expressions, reusable animations, local project persistence, and export tools can remain when they support the main audio-animation workflow or provide a clear path for future improvements.

## Persistence
Project data is stored locally in the browser. There is no remote backend requirement for the current workflow.
