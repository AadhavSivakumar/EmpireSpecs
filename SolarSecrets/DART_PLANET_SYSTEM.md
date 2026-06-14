# Dart & Planet System — Code Reference

A breakdown of the TypeScript logic for the SolarSecrets lens, organized by goal.
Covers the scripts we built/changed plus the pre-existing throw system they plug into.

**Files**
| File | Role | Authored |
|---|---|---|
| `Assets/Scripts/PlanetOrbits.ts` | Orbits, sizing, popup, billboard, test layout | Built this session |
| `Assets/Scripts/DartStick.ts` | Dart sticks to a planet + triggers the popup | Rewritten this session |
| `Assets/Scripts/PlanetInfo.ts` | Per-planet data (name + facts) | Data holder |
| `Assets/Scripts/FollowUser.ts` | Keeps an object in front of the user | New this session |
| `Assets/Scripts/GrabbableObject.ts` | Grab + throw + dart aiming | Pre-existing (throw lab) |

---

## 1. Orbiting Planets — `PlanetOrbits.ts`

Each planet revolves around the PlanetOrbits object on its own ring; inner planets orbit faster.

| Input | Default | Meaning |
|---|---|---|
| `planets` | — | Planet objects in order: Mercury → Neptune |
| `innerRadius` | 90 | Radius of the innermost orbit (cm) |
| `radiusStep` | 35 | How much farther each next planet orbits |
| `baseOrbitSpeed` | 20 | Speed of the innermost planet (deg/sec); inner = faster |
| `planetYOffsets` | [] | Per-planet vertical nudge (cm) for off-center pivots |

- `onUpdate()` — advances each planet's angle and sets its world position on a circle. Skipped while a popup is up (`paused`) or in test layout.

## 2. Planet Sizes / Proportions — `PlanetOrbits.ts` (`setup()`)

| Input | Default | Meaning |
|---|---|---|
| `minPlanetScale` | 4 | World size of the smallest planet |
| `maxPlanetScale` | 10 | World size of the biggest planet |
| `sizeContrast` | 0.5 | How strongly real diameter differences show (1 = true, lower = compressed) |
| `perspectiveCompensation` | 0.5 | Scale farther planets up to offset distance (0 = off, 1 = full) |

Pipeline per planet: `metric = (diameter/earth)^sizeContrast` → normalized into `[min,max]` → `× perspective` → divided by the **parent's world scale** so on-screen size matches the formula. Result stored in `planetScales[]` (used to lift the popup).
> Ringed planets (Saturn/Uranus) must be listed at the **same hierarchy level** as the others (the node that directly holds the sphere), or an extra parent scale renders them small.

## 3. Dart Sticks to a Planet — `DartStick.ts`

| Input | Default | Meaning |
|---|---|---|
| `planetOrbits` | (optional) | Manual ref; falls back to the PlanetOrbits singleton |
| `hitSound` / `bounceSound` | — | Stick / bounce sounds |
| `tipOffset` | −0.66 | Tip position offset when pinning |

- `onCollisionEnter(e)` — asks `PlanetOrbits.findPlanetIndex()` (identity match, not component lookup). Planet → `stickTo()` + `showFactForPlanet()`; else bounce.
- `stickTo()` — body non-dynamic, zero velocity, parent to planet at contact pose.
- `resolveOrbits()` — inspector ref or singleton (so **spawned** darts work).

## 4. Planet Facts Data — `PlanetInfo.ts`

| Input | Default | Meaning |
|---|---|---|
| `planetName` | "Planet" | Popup title |
| `facts` | [] | Pool; one chosen at random per hit |

- `getRandomFact()` — random fact (or placeholder if empty).

## 5. Popup — Trigger & Contents — `PlanetOrbits.ts`

| Input | Default | Meaning |
|---|---|---|
| `popupPanel` | — | Popup object; enabled/disabled and rotated to face you |
| `popupTitle` / `popupBody` | — | Text components for name / fact |
| `popupDuration` | 5 | Seconds the popup stays up |
| `popupHeightOffset` | 15 | Height above the planet |

Chain: dart sticks → `showFactForPlanet(index)` (resolve name+fact, position above planet) → `showFact(name, fact)` (set text, enable panel, pause orbits, schedule hide after `popupDuration`).

## 6. Popup Faces the User — `PlanetOrbits.ts` (`facePopupToUser()`)

| Input | Default | Meaning |
|---|---|---|
| `camera` | — | The user's head; provides the position to face |

Each frame while visible: `yaw = atan2(Δx, Δz)` then `setWorldRotation(quat.angleAxis(yaw, vec3.up()))` — spins around the **vertical axis only**. Needs `camera` wired; text objects must be **children** of `popupPanel`.

## 7. Dart Aims Where You Face + Throwing — `GrabbableObject.ts` (pre-existing)

| Input | Default | Meaning |
|---|---|---|
| `objectType` | Ball | Set to **Darts** for dart behavior |
| `dartThrowForce` | 800 | Impulse on release |

- `applyTypeSpecificRotation()` — points the dart's nose where the camera faces.
- `onRelease()` → `throwDart()` — re-enables physics, throws along camera forward.

## 8. Dart Spawn Point Follows the User — `FollowUser.ts`

| Input | Default | Meaning |
|---|---|---|
| `camera` | — | Head to stay in front of |
| `distance` | 35 | How far in front |
| `drop` | 25 | How far below eye level |
| `side` | 15 | Sideways offset (+right, −left) |
| `followSpeed` | 0.25 | Per-frame responsiveness (1 = snap) |

- `onUpdate()` — body-locked: flattens camera forward/right to the ground so height stays steady, lerps toward a point in front of you.

## 9. Testing & Debug — `PlanetOrbits.ts`

| Input | Default | Meaning |
|---|---|---|
| `lineUpForTesting` | false | Static equal-distance row, no orbit/perspective — compare true sizes |
| `lineupSpacing` | 8 | Gap in the test row |

`print(...)` in `setup()` / `showFactForPlanet()` log sizing (`target/parentScale/local`) and popup wiring. **Remove once dialed in.**

**Singleton:** `PlanetOrbits` sets `PlanetOrbits.instance = this` in `onAwake()` and exposes `getInstance()`, so spawned darts find it without a wired reference.

---

## Inspector Wiring Checklist

Set up from scratch in this order:

**Popup hierarchy** (build first)
```
FactPopup          ← popupPanel
 ├── Title (Text)   ← popupTitle
 └── Body  (Text)   ← popupBody  (placed below Title)
```

**PlanetOrbits** (on a central solar-system root object)
- [ ] `planets[]` → 8 planet objects, **Mercury → Neptune order** (ringed planets: the node that directly holds the sphere)
- [ ] `popupPanel` → FactPopup · `popupTitle` → Title · `popupBody` → Body
- [ ] `camera` → the Camera object
- [ ] Size/orbit values: `minPlanetScale`, `maxPlanetScale`, `sizeContrast`, `perspectiveCompensation`, `innerRadius`, `radiusStep`, `baseOrbitSpeed`
- [ ] `lineUpForTesting` = OFF for the real game

**Each planet object**
- [ ] Add a **PlanetInfo** component → set `planetName` + `facts`
- [ ] Add a **Physics Body** (Sphere shape, non-dynamic) so the dart can hit it

**Dart prefab**
- [ ] **DartStick** component (leave `planetOrbits` empty — singleton handles it)
- [ ] **GrabbableObject** with `objectType = Darts`
- [ ] A **Physics Body** (dynamic) — required, or DartStick logs "BodyComponent is required!"

**Dart spawn point**
- [ ] **FollowUser** component → wire `camera`, tune `distance`/`drop`/`side`

---

## Saving the Scene to GitHub (don't lose it again)

**Why the scene was lost before:** scene edits live in `Assets/Scene.scene`. They only reach GitHub if you **Save in Lens Studio** (writes the file) **and then commit**. Previously the hierarchy was never committed, and a merge/revert overwrote the unsaved working copy.

**Good news about this repo**
- `Scene.scene` is **tracked** and **excluded from LFS** (stored as plain text), so it commits reliably.
- `git-lfs` is **not installed on the command line**, but **GitHub Desktop has LFS built in** — so commit through GitHub Desktop (the binary assets like meshes/textures *are* LFS-tracked).

**The habit (do after any hierarchy change)**
1. **Lens Studio → Save** (Cmd+S). This writes `Assets/Scene.scene`.
2. **GitHub Desktop** → you'll see `Scene.scene` changed → write a message → **Commit** → **Push**.
3. Do this **often**, especially after building hierarchy.

**Cautions**
- Commit via **GitHub Desktop**, not the CLI (CLI has no git-lfs → can mishandle the LFS-tracked binaries).
- This is a **shared repo** (collaborators exist). **Pull before editing** the scene; scene merges can conflict (that's what caused the original mess). Avoid two people editing the scene at once.
- To verify your scene is captured, you can check that `Assets/Scene.scene` contains your objects (e.g. it currently references `PlanetOrbits`, `DartStick`, and the planet names).
