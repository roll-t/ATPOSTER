# Generating scene images with meaningful character poses

This skill normally assumes the user already has photos/illustrations for
every scene. When they don't — e.g. they have a script but no visuals yet,
and want an illustrated (not real-photo) video, like a stick-figure
character actually *doing* something that matches each line — check for
the purpose-built tool this monorepo already has for exactly that
**before** improvising a manual image-generation workflow.

## Use AGENT_TOOL's own pipeline first

`AGENT_TOOL` (the sibling app in this monorepo) already has an end-to-end
generator for this: its `/prompts` page, category **`stick_figure_slideshow`**
(`AGENT_TOOL/lib/prompts/categories.js`), takes a topic, drafts the script
+ per-scene beats with Gemini, builds each scene's image-gen prompt server-side
(`AGENT_TOOL/lib/prompts/buildSegmentedPrompts.js`, combining the fixed
"Người Que (Whiteboard)" style clause from `AGENT_TOOL/lib/prompts/imageStyles.js`
with that scene's own `visualDescription` — the same style-clause-stays-fixed/
scene-clause-varies idea as the manual template below, already wired up),
generates the images (via a Chrome extension driving Google's Flow tool —
`AGENT_TOOL/public/extension/content-flow.js`), generates narration with
word-level timestamps via ElevenLabs `/with-timestamps`
(`AGENT_TOOL/app/api/prompts/voiceover/route.js`), and writes everything
— images, audio, and a `manifest.json` with each scene's `textPrompt`/
`wordTimings` — straight into this skill's own
`remotion/public/<project>/` folder (`AGENT_TOOL/lib/remotionPaths.js`).
This is the same pipeline that already produced e.g.
`public/habit_complaining_instead_taking_.../` in this repo — a good
reference for what "good" looks like (a recurring character in a distinct,
line-matching pose every scene: arms crossed + a storm-cloud thought
bubble on a "feeling stuck" line, pointing at a wall labeled "PROBLEM" on
an "obstacle" line, a lightbulb that gets brighter as the narration turns
hopeful, etc.).

If the user already has (or can get) AGENT_TOOL running, point them there
instead of hand-rolling image generation — it already handles character
consistency, scene-appropriate poses, and wiring the output into this
skill's expected folder layout. The manual Canva-based workflow below is a
fallback for when AGENT_TOOL isn't set up/available, or for one-off
scenes outside its slideshow flow.

## Fallback: manual generation via Canva

Generate one illustration per scene with the **Canva** connector
(`generate-design`, `design_type: "poster"`) instead of falling back to
generic stock photos or a single reused image with only Ken Burns motion.

## Why this is the lever that matters, not the Remotion camera

The "flat slide with zoom/pan" feel the user is trying to get away from
comes from showing the *same kind of static image* every scene and letting
Ken Burns do all the work. `kenBurns`/`transitionStyle` in this skill only
move the camera over whatever is already in the image — they can't make a
character react, point, or shift pose. That has to be baked into the image
itself, scene by scene, matching what that scene's `caption`/narration line
actually says. A shrug on "I don't know what to say" and a pointing pose on
"here's how you start" is what reads as "the character is doing something
meaningful," not a slower or faster zoom.

## Why consistency needs deliberate prompting

Each Canva generation is independent — it has no memory of the previous
scene's exact character design. To keep the "same" character recognizable
across every scene, **repeat a fixed style + character description in every
single scene prompt**, and only vary the action/pose/setting.

## Recommended prompt template

```
Minimalist stick-figure illustration, thick rounded black outlines, flat
pastel color background, no text, clean vector style, 16:9 landscape.
Character: a single stick figure with a round head, no facial features
except two dot eyes, wearing [a small red hat / nothing distinctive — pick
one and reuse it every scene].
Scene: [the specific pose/action/reaction that matches THIS scene's
caption/narration line, e.g. "shrugging with both palms up, confused
expression, question mark above head" for a line about not knowing what to
say, or "pointing at a whiteboard with the words 'How are you?' written on
it, confident smile" for a line demonstrating an opening question].
```

Keep the **style clause** (line 1) and **character clause** (line 2)
byte-for-byte identical across every scene prompt in the same video — only
the **scene clause** changes, and it should always be derived from that
scene's own line, not a generic "character standing" filler.

## Multiple interacting characters

When a scene needs more than one character interacting (e.g. a demo
conversation), describe each one with its own fixed clause plus their
relative action/reaction:

```
Two stick figures: Character A (round head, small red hat) and Character B
(round head, blue scarf). Character A is waving and saying hi, Character B
is smiling and waving back, standing on a sidewalk background.
```

Reuse Character A's and B's clauses verbatim in every scene both appear in.

## Workflow per scene

1. Before generating anything, write out the scene list (caption + a short
   note on what pose/action each one needs) and show it to the user — get
   confirmation before batching 10-30 image generations against poses they
   haven't seen described.
2. For each scene, call `generate-design` with `design_type: "poster"` and
   a `query` built from the template above — the scene clause comes from
   that scene's own caption/narration line, not a generic filler pose.
3. Show the user the candidates for the first 1-2 scenes to confirm the
   style reads right before batching the rest.
4. `create-design-from-candidate` on the chosen candidate, then check
   `get-export-formats` for that design and `export-design` with
   `format.type: "png"` (or `"jpg"`) to get a downloadable file.
5. Save each exported image into
   `remotion/public/<video>/images/scene-01.jpg` (etc.) — the normal asset
   path this skill's config already expects (see main `SKILL.md`).
6. If the export isn't a clean 16:9 crop, either accept some cropping
   (`imageFit: "cover"`, the default) or set that scene's `imageFit` to
   `"contain"` so the pose/character isn't cropped out of frame.

## Pairing with sound effects

Once a scene's pose reflects a specific beat (a reveal, a reaction, an
entrance), that's usually also the right moment for a matching one-shot
`sfx` cue (a pop on the reveal, a whoosh on an entrance) — see the "Sound
effects" section in `SKILL.md` and `references/config_schema.md`.
