@component
export class PlanetOrbits extends BaseScriptComponent {
  @input @hint("Drag each planet object here (one entry per planet)")
  planets: SceneObject[] = []

  @input @hint("Earth's diameter in scene units (cm). Other planets scale relative to this by real diameter ratios.")
  planetScale: number = 12

  @input @hint("How strongly to compress real diameter differences. 1 = true scale, 0.5 = square-root (proportional but playable), 0 = all equal.")
  sizeRelativityExponent: number = 0.5

  @input @hint("Safety ceiling on visible size (scene units). Set high so planets stay distinct; lower only if a giant is too big.")
  maxPlanetScale: number = 60

  @input @hint("Safety floor on visible size (scene units). Keeps the tiniest planet from vanishing.")
  minPlanetScale: number = 5

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
  popupPanel: SceneObject | null = null
  @input @hint("Text3D for the planet name") @allowUndefined
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD:EarthGlobe/Assets/Scripts/PlanetOrbits.ts
  popupTitle: Text | null = null
  @input @hint("Text3D for the fact") @allowUndefined
  popupBody: Text | null = null
=======
  popupTitle: Text3D = null
  @input @hint("Text3D for the fact") @allowUndefined
  popupBody: Text3D = null
>>>>>>> parent of 4aa6ab2 (Planets Equal Size):EarthGlobe/Assets/PlanetOrbits.ts
=======
  popupTitle: Text3D = null
  @input @hint("Text3D for the fact") @allowUndefined
  popupBody: Text3D = null
>>>>>>> parent of 4aa6ab2 (Planets Equal Size)
=======
  popupTitle: Text3D = null
  @input @hint("Text3D for the fact") @allowUndefined
  popupBody: Text3D = null
>>>>>>> parent of 4aa6ab2 (Planets Equal Size)
  @input @hint("Seconds the popup stays up")
  popupDuration: number = 5

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
  private paused: boolean = false

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.setup())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    if (this.popupPanel) this.popupPanel.enabled = false
  }

  private setup(): void {
    const earthDiameterKm = 12742
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i]
      if (!p) continue
      const planetDiameterKm = this.planetDiametersKm[i] || earthDiameterKm
      const relativeScale = Math.pow(planetDiameterKm / earthDiameterKm, this.sizeRelativityExponent)
      const sceneScale = Math.max(this.minPlanetScale, Math.min(this.planetScale * relativeScale, this.maxPlanetScale))
      p.getTransform().setLocalScale(new vec3(sceneScale, sceneScale, sceneScale))
      this.angles[i] = (i / this.planets.length) * 2 * Math.PI // spread them around the ring
    }
  }

  private onUpdate(): void {
    if (this.paused) return
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