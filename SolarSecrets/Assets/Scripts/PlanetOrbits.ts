import { PlanetInfo } from "./PlanetInfo"

@component
export class PlanetOrbits extends BaseScriptComponent {
  @input @hint("Drag each planet object here, in order: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.")
  planets: SceneObject[]

  // ── Sizing (relative, but bounded so every planet stays dart-hittable) ──
  @input @hint("Size of the SMALLEST planet (scene units). Raise this if the little planets are too hard to hit.")
  minPlanetScale: number = 4

  @input @hint("Size of the BIGGEST planet (scene units). Lower this if the gas giants are too big.")
  maxPlanetScale: number = 10

  @input @hint("How much real diameter differences show. 1 = true proportions (giants dwarf the rest), lower = compress giants toward the small planets. 0.5 is a good playable middle.")
  sizeContrast: number = 0.5

  @input @hint("Counteract distance so farther planets don't look too small and closer ones too big (e.g. Jupiter vs the farther Saturn). 0 = off (true size, closer looks bigger), ~0.5 natural, 1 = full compensation.")
  perspectiveCompensation: number = 0.5

  @input @hint("TESTING: line planets up in a static row at equal distance (no orbit, no perspective) so you can compare true relative sizes. Turn OFF for the real game.")
  lineUpForTesting: boolean = false

  @input @hint("Gap between planets when lined up for testing (scene units).")
  lineupSpacing: number = 8

  // ── Orbits ──
  @input @hint("Radius of the innermost orbit (cm)")
  innerRadius: number = 90

  @input @hint("How much farther each next planet orbits (cm)")
  radiusStep: number = 35

  @input @hint("Orbit speed of the innermost planet (deg/sec). Inner planets go faster.")
  baseOrbitSpeed: number = 20

  @input @hint("Per-planet vertical nudge (cm), same order as Planets. Use to lift a model whose pivot sits off-center (e.g. Saturn).")
  planetYOffsets: number[] = []

  // ── Popup (wired once here; shared by all planets) ──
  @input @hint("The popup panel object to show/hide on a hit") @allowUndefined
  popupPanel: SceneObject = null
  @input @hint("Text3D for the planet name") @allowUndefined
  popupTitle: Text = null
  @input @hint("Text3D for the fact") @allowUndefined
  popupBody: Text = null
  @input @hint("Seconds the popup stays up")
  popupDuration: number = 5

  @input @hint("How high above the hit planet the popup appears (scene units)")
  popupHeightOffset: number = 15

  @input @hint("The camera / user head. The popup rotates around its vertical axis to face this.") @allowUndefined
  camera: SceneObject = null

  // Real mean diameters (km), same order the Planets list expects.
  private readonly planetDiametersKm: number[] = [
    4879,   // Mercury
    12104,  // Venus
    12742,  // Earth
    6779,   // Mars
    139820, // Jupiter
    116460, // Saturn
    50724,  // Uranus
    49244,  // Neptune
  ]

  private angles: number[] = []
  private planetScales: number[] = []
  private paused: boolean = false

  // Singleton so spawned darts can reach the popup without an inspector reference.
  private static instance: PlanetOrbits
  static getInstance(): PlanetOrbits {
    return PlanetOrbits.instance
  }

  onAwake(): void {
    PlanetOrbits.instance = this
    this.createEvent("OnStartEvent").bind(() => this.setup())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    if (this.popupPanel) this.popupPanel.enabled = false
  }

  private setup(): void {
    // Compress real diameters by sizeContrast, then fit the spread into
    // [minPlanetScale, maxPlanetScale] so the smallest planet lands on the
    // floor and the biggest on the ceiling, others proportionally between.
    // Scale is applied uniformly to the planet object, so its sphere and ring
    // children scale together and stay aligned.
    const earthDiameterKm = 12742
    const metrics: number[] = []
    let metricMin = Infinity
    let metricMax = -Infinity
    for (let i = 0; i < this.planets.length; i++) {
      const diameterKm = this.planetDiametersKm[i] || earthDiameterKm
      const m = Math.pow(diameterKm / earthDiameterKm, this.sizeContrast)
      metrics[i] = m
      if (this.planets[i]) {
        if (m < metricMin) metricMin = m
        if (m > metricMax) metricMax = m
      }
    }
    const range = metricMax - metricMin

    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i]
      if (!p) continue
      const t = range > 0 ? (metrics[i] - metricMin) / range : 0.5
      const baseScale = this.minPlanetScale + t * (this.maxPlanetScale - this.minPlanetScale)

      // Perspective compensation: outer planets are farther from the viewer, so
      // scale them up by their orbit distance to keep apparent sizes honest
      // (otherwise Jupiter looks huge next to a farther, similar-sized Saturn).
      const radius = this.innerRadius + i * this.radiusStep
      const perspective = (this.lineUpForTesting || this.innerRadius <= 0)
        ? 1
        : Math.pow(radius / this.innerRadius, this.perspectiveCompensation)
      const sceneScale = baseScale * perspective

      // Target WORLD scale, not local: planets can sit under parents with their
      // own scale (the pack nests them under scaled groups). Dividing by the
      // parent's world scale makes on-screen size match the formula regardless.
      const parent = p.getParent()
      const rawParentScale = parent ? parent.getTransform().getWorldScale().x : 1
      const parentScale = rawParentScale !== 0 ? rawParentScale : 1
      const local = sceneScale / parentScale
      p.getTransform().setLocalScale(new vec3(local, local, local))
      this.planetScales[i] = sceneScale
      this.angles[i] = (i / this.planets.length) * 2 * Math.PI // spread them around the ring

      print(`PlanetOrbits[${i}] "${p.name}": target=${sceneScale.toFixed(2)} parentScale=${parentScale.toFixed(2)} local=${local.toFixed(2)}`)
    }

    if (this.lineUpForTesting) this.layoutRow()
  }

  /** Static test layout: planets in a row at equal distance so true relative sizes are visible. */
  private layoutRow(): void {
    const center = this.getTransform().getWorldPosition()
    const positions: number[] = []
    let cursor = 0
    for (let i = 0; i < this.planets.length; i++) {
      positions[i] = cursor
      cursor += (this.planetScales[i] || 1) + this.lineupSpacing
    }
    const totalWidth = cursor - this.lineupSpacing
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i]
      if (!p) continue
      const px = center.x + positions[i] - totalWidth / 2
      p.getTransform().setWorldPosition(new vec3(px, center.y, center.z))
    }
  }

  private onUpdate(): void {
    this.facePopupToUser()
    if (this.lineUpForTesting || this.paused) return
    const center = this.getTransform().getWorldPosition()
    const dt = getDeltaTime()
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i]
      if (!p) continue
      const radius = this.innerRadius + i * this.radiusStep
      const speed = (this.baseOrbitSpeed / (i + 1)) * Math.PI / 180 // inner faster (radians/sec)
      this.angles[i] += speed * dt
      const x = center.x + Math.cos(this.angles[i]) * radius
      const z = center.z + Math.sin(this.angles[i]) * radius
      const yOffset = this.planetYOffsets[i] || 0
      p.getTransform().setWorldPosition(new vec3(x, center.y + yOffset, z))
    }
  }

  /**
   * If the hit object is one of our planets, return its index (matched by identity,
   * walking up parents so a child collider still resolves). Otherwise -1.
   */
  findPlanetIndex(obj: SceneObject): number {
    let current: SceneObject = obj
    for (let depth = 0; current && depth < 6; depth++) {
      for (let i = 0; i < this.planets.length; i++) {
        if (this.planets[i] === current) return i
      }
      current = current.getParent()
    }
    return -1
  }

  /** Show the fact popup for a planet by index. Falls back to the object name if PlanetInfo can't be read. */
  showFactForPlanet(index: number): void {
    const planet = this.planets[index]
    let name = planet ? planet.name : "Planet"
    let fact = ""

    // Try to read a PlanetInfo on the planet or its descendants for nicer text.
    const info = this.findPlanetInfo(planet)
    if (info) {
      if (info.planetName) name = info.planetName
      fact = info.getRandomFact()
    }

    // Position the popup above the hit planet's surface (orbits are paused while it's up).
    // Lift by the planet's own scale so it clears even giant planets like Jupiter.
    if (planet && this.popupPanel) {
      const pos = planet.getTransform().getWorldPosition()
      const lift = (this.planetScales[index] || 0) + this.popupHeightOffset
      this.popupPanel.getTransform().setWorldPosition(new vec3(pos.x, pos.y + lift, pos.z))
    }

    print(`PlanetOrbits.showFact: name="${name}" fact="${fact}" panel=${!!this.popupPanel} title=${!!this.popupTitle} body=${!!this.popupBody}`)

    this.showFact(name, fact)
  }

  /** Best-effort PlanetInfo lookup (object + descendants), typed first then duck-typed. */
  private findPlanetInfo(obj: SceneObject): any {
    if (!obj) return null
    const typed = obj.getComponent(PlanetInfo.getTypeName())
    if (typed) return typed
    const scripts = obj.getComponents("Component.ScriptComponent") as any[]
    for (let s = 0; s < scripts.length; s++) {
      const comp = scripts[s]
      if (comp && typeof comp.getRandomFact === "function" && comp.planetName !== undefined) return comp
    }
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      const found = this.findPlanetInfo(obj.getChild(i))
      if (found) return found
    }
    return null
  }

  /** While the popup is visible, rotate it around its vertical axis to face the user. */
  private facePopupToUser(): void {
    if (!this.popupPanel || !this.popupPanel.enabled || !this.camera) return
    const panelPos = this.popupPanel.getTransform().getWorldPosition()
    const camPos = this.camera.getTransform().getWorldPosition()
    const yaw = Math.atan2(camPos.x - panelPos.x, camPos.z - panelPos.z) // Y-axis only
    this.popupPanel.getTransform().setWorldRotation(quat.angleAxis(yaw, vec3.up()))
  }

  // Called by DartStick when a dart sticks to a planet.
  showFact(name: string, fact: string): void {
    if (this.popupTitle) this.popupTitle.text = name
    if (this.popupBody) this.popupBody.text = fact
    if (this.popupPanel) this.popupPanel.enabled = true
    this.paused = true // freeze orbits while reading

    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => {
      if (this.popupPanel) this.popupPanel.enabled = false
      this.paused = false
    })
    hide.reset(this.popupDuration)
  }
}
