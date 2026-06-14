@component
export class PlanetInfo extends BaseScriptComponent {
  @input @hint("Name shown in the popup")
  planetName: string = "Planet"

  @input @hint("3–5 facts. One is shown at random when the dart sticks.")
  facts: string[]

  getRandomFact(): string {
    if (!this.facts || this.facts.length === 0) return "(no facts set)"
    return this.facts[Math.floor(Math.random() * this.facts.length)]
  }
}