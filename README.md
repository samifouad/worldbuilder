# worldbuilder

A viability prototype for prompt-driven 3D storytelling: a world is a JSON
document, cameras are objects, and takes are real video files — all in the
browser with three.js. No build step, no backend, no AI (yet).

The whole world lives in the `SCENE` object at the top of `main.js`. Later,
an LLM writes that object; today it's hand-written.

## Run

```
npm install
npm start          # serves on http://localhost:8642
```

## Controls

| input | action |
|---|---|
| WASD (+ shift) | walk (run) |
| right-drag | look around |
| left-drag empty space | look around |
| left-drag object | move it (red = invalid spot, snaps back) |
| middle-click | placement menu (works on ground and walls) |
| Q / E (shift) | rotate selected/held object (15° / 5°) |
| scroll wheel | raise/lower selected/held object (stacking works) |
| G | toggle grid snapping |
| T | third person |
| Del | remove selected object |
| 1–9 | switch camera |
| R | record a take (.webm, listed bottom-left) |

## Verify

Headless end-to-end check (placement, red-deny, cancel, move, rotate,
elevate, wall mounting, camera add, take recording):

```
npm run verify
```

## What's real vs. faked

Real: world-as-data, collision registry shared by placement + player + actor
steering, wall mounting with surface normals, height-aware validity
(stacking), in-browser take recording.

Faked: the actor is a capsule with a bob (no rig), no physics engine (clamps
and push-out), no real reflections, no audio.
