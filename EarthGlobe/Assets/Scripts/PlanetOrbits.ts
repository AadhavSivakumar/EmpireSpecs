@component
export class PlanetOrbits extends BaseScriptComponent {
  @input @hint("Drag each planet object here (one entry per planet)")
  planets: SceneObject[] = []

  @input @hint("Earth's diameter in scene units (cm). Other planets use real diameter ratios.")
  planetScale: number = 8

  @input @hint("Radius of the innermost orbit (cm)")
  innerRadius: number = 90

  @input @hint("How much farther each next planet orbits (cm)")
  radiusStep: number = 35

  @input @hint("Orbit speed of the innermost planet (deg/sec). Inner planets go faster.")
  baseOrbitSpeed: number = 20

  // ── Popup (wired once here; shared by all planets) ──
  @input @hint("The popup panel object to show/hide on a hit") @allowUndefined
  popupPanel: SceneObject | null = null
  @input @hint("Text3D for the planet name") @allowUndefined
  popupTitle: Text | null = null
  @input @hint("Text3D for the fact") @allowUndefined
  popupBody: Text | null = null
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
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i]
      if (!p) continue
      const earthDiameterKm = 12742
      const planetDiameterKm = this.planetDiametersKm[i] || earthDiameterKm
      const relativeScale = planetDiameterKm / earthDiameterKm
      const sceneScale = this.planetScale * relativeScale
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
      p.getTransform().setWorldPosition(new vec3(x, center.y, z))
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