/**
 * Specs Inc. 2026
 * Keeps an object (e.g. the dart spawn point) at a comfortable, reachable spot
 * in front of the user, following where they turn. Body-locked: it follows the
 * user's horizontal facing only, so it stays at a steady height even when the
 * user looks up or down. Attach to the spawn-point object.
 */
@component
export class FollowUser extends BaseScriptComponent {
  @input @hint("The camera / user head this should stay in front of.")
  camera: SceneObject

  @input @hint("Distance in front of the user (scene units).")
  distance: number = 35

  @input @hint("How far below eye level it sits (scene units, positive = lower).")
  drop: number = 25

  @input @hint("Sideways offset (scene units, positive = right, negative = left).")
  side: number = 15

  @input @hint("Follow responsiveness per frame. 1 = snap instantly, lower = smoother/laggier.")
  followSpeed: number = 0.25

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private onUpdate(): void {
    if (!this.camera) return
    const camT = this.camera.getTransform()
    const camPos = camT.getWorldPosition()

    // Flatten the camera's forward/right onto the ground plane so pitch (looking
    // up/down) doesn't change the spawn height — only turning moves it.
    const fwd = camT.forward
    const flatFwd = new vec3(fwd.x, 0, fwd.z).normalize()
    const right = camT.right
    const flatRight = new vec3(right.x, 0, right.z).normalize()

    const target = camPos
      .add(flatFwd.uniformScale(this.distance))
      .add(flatRight.uniformScale(this.side))
      .add(new vec3(0, -this.drop, 0))

    const t = this.getTransform()
    const next = vec3.lerp(t.getWorldPosition(), target, this.followSpeed)
    t.setWorldPosition(next)
  }
}
