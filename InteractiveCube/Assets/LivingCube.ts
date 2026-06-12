@component
export class LivingCube extends BaseScriptComponent {
  @input @hint("Text near the X edge") xLabel: Text3D
  @input @hint("Text near the Y edge") yLabel: Text3D
  @input @hint("Text near the Z edge") zLabel: Text3D
  @input @hint("Text panel for the volume equation") volumePanel: Text3D

  @input
  @allowUndefined
  @hint("Optional: drag the visible cube object here if the labels stay blank.")
  cubeObject: SceneObject = null

  @input
  @hint("Gap (cm) between a face and its label")
  labelMargin: number = 4

  private visual: RenderMeshVisual = null

  onAwake(): void {
    const root = this.cubeObject ? this.cubeObject : this.getSceneObject()
    this.visual = this.findVisual(root)
    if (!this.visual) {
      print("[LivingCube] No mesh found on '" + root.name + "' or its children. Drag the visible cube onto the 'Cube Object' input.")
    }
    this.createEvent("UpdateEvent").bind(() => this.refresh())
  }

  // Search this object and all its descendants for the cube's mesh.
  private findVisual(obj: SceneObject): RenderMeshVisual {
    const v = obj.getComponent("Component.RenderMeshVisual")
    if (v) return v
    const count = obj.getChildrenCount()
    for (let i = 0; i < count; i++) {
      const found = this.findVisual(obj.getChild(i))
      if (found) return found
    }
    return null
  }

  refresh(): void {
    if (!this.visual) return

    const min = this.visual.worldAabbMin()
    const max = this.visual.worldAabbMax()
    const center = min.add(max).uniformScale(0.5)
    const size = max.sub(min) // x = width, y = height, z = depth (cm)

    this.xLabel.text = "x = " + size.x.toFixed(1)
    this.yLabel.text = "y = " + size.y.toFixed(1)
    this.zLabel.text = "z = " + size.z.toFixed(1)

    const volume = size.x * size.y * size.z
    this.volumePanel.text =
      "Volume = x · y · z\n" +
      "= " + size.x.toFixed(1) + " · " + size.y.toFixed(1) + " · " + size.z.toFixed(1) + "\n" +
      "= " + volume.toFixed(1)

    this.xLabel.getTransform().setWorldPosition(new vec3(max.x + this.labelMargin, center.y, center.z))
    this.yLabel.getTransform().setWorldPosition(new vec3(center.x, max.y + this.labelMargin, center.z))
    this.zLabel.getTransform().setWorldPosition(new vec3(center.x, center.y, max.z + this.labelMargin))

    this.volumePanel.getTransform().setWorldPosition(
      new vec3(center.x, max.y + this.labelMargin + 15, center.z)
    )
  }
}