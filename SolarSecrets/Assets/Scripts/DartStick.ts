/**
 * Specs Inc. 2026
 * Dart Stick component for the EarthGlobe Spectacles lens.
 */
import { Logger } from "Utilities.lspkg/Scripts/Utils/Logger"
import { PlanetOrbits } from "./PlanetOrbits"

/**
 * Sticks a thrown dart to any planet it hits and reveals that planet's fact popup.
 * A "planet" is any object (or near ancestor) carrying a PlanetInfo component.
 * Works with the GrabbableObject / MatchTransform throwing system.
 * Add this component to dart objects.
 */
@component
export class DartStick extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">DartStick – Stick dart to a planet and show its fact</span><br/><span style="color: #94A3B8; font-size: 11px;">The dart sticks to any object with a PlanetInfo component, then asks PlanetOrbits to show the fact popup.</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @input
  @allowUndefined
  @hint("The PlanetOrbits controller that owns the fact popup. Required to reveal a planet's fact when the dart sticks.")
  planetOrbits: PlanetOrbits

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Audio</span>')
  @input
  @hint("Sound to play when the dart sticks to a planet")
  hitSound: AudioComponent

  @input
  @hint("Sound to play when the dart bounces off a non-planet")
  bounceSound: AudioComponent

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Stick Settings</span>')
  @input
  @hint("Offset for tip positioning (default: -0.66)")
  tipOffset: number = -0.66

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Logging</span>')
  @input
  @hint("Enable general logging")
  enableLogging: boolean = false

  @input
  @hint("Enable lifecycle logging (onAwake, onStart, onUpdate, onDestroy)")
  enableLoggingLifecycle: boolean = false

  private logger: Logger
  private bodyComponent: BodyComponent | null = null
  private hasStuck: boolean = false

  onAwake() {
    this.logger = new Logger("DartStick", this.enableLogging || this.enableLoggingLifecycle, true)
    if (this.enableLoggingLifecycle) this.logger.debug("LIFECYCLE: onAwake()")

    this.bodyComponent = this.getSceneObject().getComponent("Physics.BodyComponent")

    if (!this.bodyComponent) {
      this.logger.error("Physics.BodyComponent is required!")
      return
    }

    if (this.hitSound) {
      this.hitSound.playbackMode = Audio.PlaybackMode.LowLatency
    }
    if (this.bounceSound) {
      this.bounceSound.playbackMode = Audio.PlaybackMode.LowLatency
    }

    this.bodyComponent.onCollisionEnter.add(this.onCollisionEnter.bind(this))
  }

  /**
   * Called when the dart collides with something. Sticks only to planets.
   */
  private onCollisionEnter(e: CollisionEnterEventArgs) {
    if (this.hasStuck) return

    const hitObject = e.collision.collider.getSceneObject()
    const orbits = this.resolveOrbits()

    // A planet is any object in PlanetOrbits' Planets list (matched by identity,
    // walking up parents). Reliable regardless of custom-component lookup quirks.
    const planetIndex = orbits ? orbits.findPlanetIndex(hitObject) : -1

    this.logger.info(
      `Collision with "${hitObject.name}": planetIndex=${planetIndex}, orbitsAvailable=${!!orbits}`
    )

    if (planetIndex < 0) {
      // Not one of the orbiting planets (the globe, ground, etc.) - bounce.
      if (this.bounceSound) this.bounceSound.play(1)
      return
    }

    this.stickTo(hitObject)
    if (orbits) orbits.showFactForPlanet(planetIndex)
  }

  /** Freeze the dart and parent it to the hit object at the contact pose. */
  private stickTo(hitObject: SceneObject): void {
    const myTransform = this.getSceneObject().getTransform()
    const touchPoint = myTransform.getWorldPosition()
    const touchRotation = myTransform.getWorldRotation()
    const touchScale = myTransform.getWorldScale()

    this.logger.info(`Sticking to ${hitObject.name}.`)

    if (this.bodyComponent) {
      this.bodyComponent.dynamic = false
      this.bodyComponent.velocity = vec3.zero()
    }

    const childLocalPosition = new vec3(0, 0, this.tipOffset)
    const parentWorldPosition = touchPoint.sub(touchRotation.multiplyVec3(childLocalPosition.mult(touchScale)))

    this.getSceneObject().setParent(hitObject)
    myTransform.setWorldPosition(parentWorldPosition)
    myTransform.setWorldRotation(touchRotation)
    myTransform.setWorldScale(touchScale)

    this.hasStuck = true

    if (this.hitSound) this.hitSound.play(1)

    this.logger.info(`Dart stuck at ${parentWorldPosition}`)
  }

  /** Use the inspector ref if set, otherwise the PlanetOrbits singleton (works for spawned darts). */
  private resolveOrbits(): PlanetOrbits | null {
    return this.planetOrbits || PlanetOrbits.getInstance()
  }
}
