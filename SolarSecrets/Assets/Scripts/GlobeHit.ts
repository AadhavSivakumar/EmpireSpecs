/**
 * WorldShot 2026
 * GlobeHit – Detects where a thrown dart lands on the globe and converts that
 * impact point into latitude / longitude, independent of the globe's rotation.
 * Add this component to the dart prefab (it replaces DartStick).
 */
@component
export class GlobeHit extends BaseScriptComponent {
    @ui.label('<span style="color: #60A5FA;">GlobeHit – Dart-to-globe hit detection</span><br/><span style="color: #94A3B8; font-size: 11px;">Detects the globe by name, converts the impact point to lat/lng, and sticks the dart to the spinning globe.</span>')
    @ui.separator

    @ui.label('<span style="color: #60A5FA;">Target</span>')
    @input
    @hint("The scene name of the globe object (must match exactly)")
    globeObjectName: string = "Globe"

    @input
    @hint("Stick the dart to the globe so it rotates along with it")
    stickToGlobe: boolean = true

    @ui.separator
    @ui.label('<span style="color: #60A5FA;">Calibration</span>')
    @input
    @hint("Rotate longitude to match the texture's prime meridian (degrees)")
    longitudeOffset: number = 0.0

    @input
    @hint("Flip longitude if east/west come out reversed")
    flipLongitude: boolean = false

    @ui.separator
    @ui.label('<span style="color: #60A5FA;">Audio (optional)</span>')
    @input
    hitSound: AudioComponent

    @input
    missSound: AudioComponent

    @ui.separator
    @ui.label('<span style="color: #60A5FA;">Logging</span>')
    @input
    enableLogging: boolean = true

    private body: BodyComponent | null = null
    private hasHit: boolean = false

    onAwake() {
        this.body = this.getSceneObject().getComponent("Physics.BodyComponent")
        if (!this.body) {
            print("GlobeHit ERROR: a Physics BodyComponent is required on the dart.")
            return
        }

        if (this.hitSound) this.hitSound.playbackMode = Audio.PlaybackMode.LowLatency
        if (this.missSound) this.missSound.playbackMode = Audio.PlaybackMode.LowLatency

        this.body.onCollisionEnter.add(this.onCollisionEnter.bind(this))
    }

    private onCollisionEnter(e: CollisionEnterEventArgs) {
        if (this.hasHit) return

        const hitObject = e.collision.collider.getSceneObject()

        // Only react to the globe; anything else is a miss.
        if (hitObject.name !== this.globeObjectName) {
            if (this.missSound) this.missSound.play(1)
            return
        }

        this.hasHit = true

        // 1. World-space impact point (the dart's position at the moment of contact).
        const dartTransform = this.getSceneObject().getTransform()
        const worldHitPoint = dartTransform.getWorldPosition()

        // 2. Convert it into the globe's LOCAL space, so the result does not depend
        //    on how far the globe has spun.
        const globeTransform = hitObject.getTransform()
        const localHitPoint = globeTransform.getInvertedWorldTransform().multiplyPoint(worldHitPoint)

        // 3. Direction from the globe centre → latitude / longitude.
        const dir = localHitPoint.normalize()
        const lat = Math.asin(Math.max(-1, Math.min(1, dir.y))) * (180 / Math.PI)
        let lng = Math.atan2(dir.x, dir.z) * (180 / Math.PI)
        if (this.flipLongitude) lng = -lng
        lng = (((lng + this.longitudeOffset + 180) % 360) + 360) % 360 - 180

        if (this.enableLogging) {
            print(`GlobeHit → lat ${lat.toFixed(2)}, lng ${lng.toFixed(2)}`)
        }

        if (this.stickToGlobe) this.stickDart(hitObject)
        if (this.hitSound) this.hitSound.play(1)

        this.handleGlobeHit(lat, lng)
    }

    /** Freeze the dart and parent it to the globe so it travels with the spin. */
    private stickDart(globe: SceneObject) {
        const t = this.getSceneObject().getTransform()
        const worldPos = t.getWorldPosition()
        const worldRot = t.getWorldRotation()
        const worldScale = t.getWorldScale()

        if (this.body) {
            this.body.dynamic = false
            this.body.velocity = vec3.zero()
        }

        this.getSceneObject().setParent(globe)
        t.setWorldPosition(worldPos)
        t.setWorldRotation(worldRot)
        t.setWorldScale(worldScale)
    }

    /**
     * Hook for the next stage. Right now it only reports the coordinates;
     * next we'll send lat/lng to reverse-geocoding + Gemini to build the card.
     */
    private handleGlobeHit(lat: number, lng: number) {
        // TODO (next step): GeoDetection.lookup(lat, lng) -> country -> Gemini -> KnowledgeCard
    }
}