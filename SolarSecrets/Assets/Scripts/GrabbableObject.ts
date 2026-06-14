/**
 * Specs Inc. 2026
 * Grabbable Object component for the Throw Lab Spectacles lens.
 */
import TrackedHand from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/TrackedHand"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {MatchTransform} from "./MatchTransform"
import {Logger} from "Utilities.lspkg/Scripts/Utils/Logger"

/**
 * Makes an object grabbable via pinch or grab gesture.
 * Requires a MatchTransform component and a Physics Body component.
 */
@component
export class GrabbableObject extends BaseScriptComponent {
  public onGrabStartEvent: Event = new Event()
  public onGrabEndEvent: Event = new Event()

  @ui.label('<span style="color: #60A5FA;">GrabbableObject – Physics grab and throw with hand tracking</span><br/><span style="color: #94A3B8; font-size: 11px;">Requires a MatchTransform and Physics.BodyComponent on the same object.</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Object Settings</span>')
  @input
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Ball", "Ball"),
      new ComboBoxItem("Racket", "Racket"),
      new ComboBoxItem("Darts", "Darts")
    ])
  )
  @hint("Type of object - determines grab behavior and rotation")
  objectType: string = "Ball"

  @input
  @hint("Reference to the MatchTransform component on this object")
  matchTransform: MatchTransform

  @input
  @hint("Time in seconds before destroying the object after it's dropped")
  destroyDelay: number = 4.5

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Dart Settings</span>')
  @input
  @hint("For Darts: The dartboard/scoreboard (no longer used for aiming)")
  @showIf("objectType", "Darts")
  scoreBoard: SceneObject

  @input
  @hint("For Darts: Force applied when releasing (throw strength)")
  @showIf("objectType", "Darts")
  dartThrowForce: number = 800.0

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Throw Settings</span>')
  @input
  @hint("For Ball/Racket: Force applied when releasing (throw strength)")
  ballThrowForce: number = 150.0

  @input
  @hint("For Ball/Racket: Multiplier for hand velocity")
  handVelocityMultiplier: number = 0.3

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Logging</span>')
  @input
  @hint("Enable general logging")
  enableLogging: boolean = false

  @input
  @hint("Enable lifecycle logging")
  enableLoggingLifecycle: boolean = false

  private logger: Logger
  private bodyComponent: BodyComponent | null = null
  private colliderComponent: ColliderComponent | null = null
  private isGrabbed: boolean = false
  private destroyEvent: DelayedCallbackEvent | null = null
  private grabbedHand: TrackedHand | null = null
  private updateEvent: SceneEvent | null = null
  private previousHandPosition: vec3 = vec3.zero()
  private handVelocity: vec3 = vec3.zero()
  private worldCamera: Camera | null = null

  onAwake() {
    this.logger = new Logger("GrabbableObject", this.enableLogging || this.enableLoggingLifecycle, true)
    this.bodyComponent = this.getSceneObject().getComponent("Physics.BodyComponent")
    if (!this.bodyComponent) {
      this.colliderComponent = this.getSceneObject().getComponent("Physics.ColliderComponent")
    }
    if (!this.matchTransform) {
      this.logger.warn("MatchTransform component is required!")
    }
  }

  onGrab(hand: TrackedHand) {
    if (this.isGrabbed) return
    this.isGrabbed = true
    this.grabbedHand = hand

    if (this.destroyEvent) {
      this.destroyEvent.cancel()
      this.destroyEvent = null
    }

    const currentWorldPos = this.getSceneObject().getTransform().getWorldPosition()
    const currentWorldRot = this.getSceneObject().getTransform().getWorldRotation()
    this.getSceneObject().setParent(null)
    this.getSceneObject().getTransform().setWorldPosition(currentWorldPos)
    this.getSceneObject().getTransform().setWorldRotation(currentWorldRot)

    if (this.bodyComponent && this.bodyComponent.dynamic) {
      this.bodyComponent.dynamic = false
    }

    if (
      this.matchTransform &&
      this.matchTransform.resetOffset &&
      this.matchTransform.setTarget &&
      this.matchTransform.enableMatching
    ) {
      this.matchTransform.resetOffset()
      this.matchTransform.setTarget(hand.indexTip.position, hand.indexTip.rotation)
      this.matchTransform.enableMatching()
      if (this.objectType === "Darts") {
        this.matchTransform.disableRotationUpdates()
      } else {
        this.matchTransform.enableRotationUpdates()
      }
    } else {
      this.logger.error("MatchTransform not available or missing methods!")
    }

    this.previousHandPosition = hand.indexTip.position
    this.handVelocity = vec3.zero()

    this.updateEvent = this.createEvent("UpdateEvent")
    this.updateEvent.bind(this.onUpdateWhileGrabbed.bind(this))

    this.onGrabStartEvent.invoke()
    this.logger.info(`(${this.getSceneObject().name}): Grabbed! [v6 facing-aim build]`)
  }

  private onUpdateWhileGrabbed() {
    if (!this.isGrabbed || !this.grabbedHand || !this.matchTransform) return
    if (!this.grabbedHand.isTracked()) {
      this.onRelease()
      return
    }

    const currentHandPos = this.grabbedHand.indexTip.position
    if (getDeltaTime() > 0) {
      this.handVelocity = currentHandPos.sub(this.previousHandPosition).uniformScale(1 / getDeltaTime())
    }
    this.previousHandPosition = currentHandPos

    if (this.matchTransform.setTarget) {
      if (this.objectType === "Ball") {
        this.matchTransform.setTarget(this.grabbedHand.indexTip.position, this.grabbedHand.indexTip.rotation)
      } else if (this.objectType === "Racket") {
        this.matchTransform.setTarget(this.grabbedHand.indexTip.position, this.grabbedHand.wrist.rotation)
      } else {
        this.matchTransform.setTarget(
          this.grabbedHand.indexTip.position,
          this.getSceneObject().getTransform().getWorldRotation()
        )
      }
    }

    this.applyTypeSpecificRotation()
  }

  // While holding a dart, point its nose where you're FACING (so it follows your turn).
  private applyTypeSpecificRotation() {
    if (this.objectType !== "Darts") return
    const cam = this.getWorldCamera()
    if (!cam) return
    const dir = cam.getTransform().getWorldTransform()
      .multiplyDirection(new vec3(0, 0, -1)).normalize()
    this.getSceneObject().getTransform().setWorldRotation(this.aimRotation(dir))
  }

  getGestureType(): "pinch" | "grab" {
    return this.objectType === "Racket" ? "grab" : "pinch"
  }

  onRelease() {
    if (!this.isGrabbed) return
    this.isGrabbed = false

    if (this.updateEvent) {
      this.updateEvent.enabled = false
      this.updateEvent = null
    }
    if (this.matchTransform && this.matchTransform.disableMatching) {
      this.matchTransform.disableMatching()
    }

    if (this.bodyComponent) {
      this.bodyComponent.dynamic = true
      if (this.objectType === "Darts") {
        this.throwDart()
      } else if (this.objectType === "Ball") {
        this.throwBall()
      }
    }

    this.grabbedHand = null
    this.handVelocity = vec3.zero()
    this.previousHandPosition = vec3.zero()
    this.scheduleDestroy()

    this.logger.info(`(${this.getSceneObject().name}): Released!`)
    this.onGrabEndEvent.invoke()
  }

  private throwDart() {
    if (!this.bodyComponent) return
    const cam = this.getWorldCamera()
    if (!cam) {
      this.logger.error("No Camera found in the scene — cannot determine facing direction.")
      return
    }
    // Throw where you're facing (camera looks down local -Z). If it flies BEHIND you, change -1 to 1.
    const dir = cam.getTransform().getWorldTransform()
      .multiplyDirection(new vec3(0, 0, -1)).normalize()
    this.getSceneObject().getTransform().setWorldRotation(this.aimRotation(dir))
    this.bodyComponent.angularVelocity = vec3.zero()
    this.bodyComponent.angularDamping = 0.95
    this.bodyComponent.addForce(dir.uniformScale(this.dartThrowForce), Physics.ForceMode.Impulse)
  }

  // Orients the dart so its nose points along `dir`. If the nose looks wrong, append
  // .multiply(quat.angleAxis(Math.PI / 2, vec3.right())) and tweak the angle/axis.
  private aimRotation(dir: vec3): quat {
    return quat.lookAt(dir, vec3.up()).multiply(quat.angleAxis(Math.PI / 2, vec3.right()))
  }

  // Finds the scene camera once, then caches it.
  private getWorldCamera(): Camera | null {
    if (this.worldCamera) return this.worldCamera
    const count = global.scene.getRootObjectsCount()
    for (let i = 0; i < count; i++) {
      const found = this.searchForCamera(global.scene.getRootObject(i))
      if (found) {
        this.worldCamera = found
        return found
      }
    }
    return null
  }

  private searchForCamera(obj: SceneObject): Camera | null {
    const cam = obj.getComponent("Component.Camera") as Camera
    if (cam) return cam
    const n = obj.getChildrenCount()
    for (let i = 0; i < n; i++) {
      const found = this.searchForCamera(obj.getChild(i))
      if (found) return found
    }
    return null
  }

  private throwBall() {
    if (!this.bodyComponent) return
    let throwVelocity = this.handVelocity.uniformScale(this.handVelocityMultiplier)
    if (throwVelocity.length < 2) {
      if (this.grabbedHand) {
        const handForward = this.grabbedHand.indexTip.rotation.multiplyVec3(vec3.forward())
        throwVelocity = handForward.uniformScale(this.ballThrowForce)
      } else {
        throwVelocity = vec3.forward().uniformScale(this.ballThrowForce)
      }
    } else if (this.grabbedHand) {
      const handForward = this.grabbedHand.indexTip.rotation.multiplyVec3(vec3.forward())
      throwVelocity = throwVelocity.add(handForward.uniformScale(this.ballThrowForce))
    }
    this.bodyComponent.addForce(throwVelocity, Physics.ForceMode.Impulse)
  }

  private scheduleDestroy() {
    if (this.destroyEvent) this.destroyEvent.cancel()
    this.destroyEvent = this.createEvent("DelayedCallbackEvent")
    this.destroyEvent.bind(() => {
      if (this.objectType === "Darts" && this.scoreBoard) {
        if (this.getSceneObject().getParent() === this.scoreBoard) return
      }
      this.getSceneObject().destroy()
    })
    this.destroyEvent.reset(this.destroyDelay)
  }

  isCurrentlyGrabbed(): boolean {
    return this.isGrabbed
  }

  getCollider(): ColliderComponent | null {
    return this.bodyComponent || this.colliderComponent
  }
}
