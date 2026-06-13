@component
export class GlobeController extends BaseScriptComponent {
    @ui.label('<span style="color: #60A5FA;">GlobeController – Spins the globe around its vertical axis</span>')
    @input
    @hint("Rotation speed in degrees per second")
    rotationSpeed: number = 8.0

    private globeTransform: Transform

    onAwake() {
        this.globeTransform = this.getSceneObject().getTransform()
        this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    }

    private onUpdate() {
        const deltaAngle = this.rotationSpeed * getDeltaTime() * (Math.PI / 180)
        const deltaRotation = quat.angleAxis(deltaAngle, vec3.up())
        const currentRotation = this.globeTransform.getLocalRotation()
        this.globeTransform.setLocalRotation(deltaRotation.multiply(currentRotation))
    }
}