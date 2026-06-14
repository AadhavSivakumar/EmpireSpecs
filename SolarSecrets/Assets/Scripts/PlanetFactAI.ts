/**
 * Specs Inc. 2026
 * Example implementations of OpenAI API calls. Demonstrates chat completions with GPT models,
 * DALL-E image generation and editing, TTS speech synthesis, and function calling with color
 * manipulation using tap/pinch gestures.
 */
import { OpenAI } from "../RemoteServiceGateway.lspkg/HostedExternal/OpenAI";
import { OpenAITypes } from "../RemoteServiceGateway.lspkg/HostedExternal/OpenAITypes";
import { Promisfy } from "../RemoteServiceGateway.lspkg/Utils/Promisfy";
import { Logger } from "Utilities.lspkg/Scripts/Utils/Logger";
import { bindStartEvent, bindUpdateEvent, bindLateUpdateEvent, bindDestroyEvent } from "SnapDecorators.lspkg/decorators";

@component
export class ExampleOAICalls extends BaseScriptComponent {
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">OpenAI API Examples</span>')
  @ui.label('<span style="color: #94A3B8; font-size: 11px;">Configure and test OpenAI chat, image, voice, and function calling capabilities</span>')

  @ui.group_start("Chat Completions Example")
  @input
  textDisplay: Text;
  @input
  @widget(new TextAreaWidget())
  private systemPrompt: string =
    "You are an incredibly smart but witty AI assistant who likes to answer life's greatest mysteries in under two sentences";
  @input
  @widget(new TextAreaWidget())
  private userPrompt: string = "Is a hotdog a sandwich";
  @input
  @label("Run On Tap")
  private doChatCompletionsOnTap: boolean = false;
  @ui.group_end
  
  @ui.separator
  @ui.group_start("Function Calling Example")
  @input
  @widget(new TextAreaWidget())
  private functionCallingPrompt: string = "Make the text display yellow";
  @input
  @label("Run On Tap")
  private doFunctionCallingOnTap: boolean = false;

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Logging Configuration</span>')
  @ui.label('<span style="color: #94A3B8; font-size: 11px;">Control logging output for this script instance</span>')

  @input
  @hint("Enable general logging (animation cycles, events, etc.)")
  enableLogging: boolean = false;

  @input
  @hint("Enable lifecycle logging (onAwake, onStart, onUpdate, onDestroy, etc.)")
  enableLoggingLifecycle: boolean = false;

  // Logger instance
  private logger: Logger;  @ui.group_end
  private rmm = require("LensStudio:RemoteMediaModule") as RemoteMediaModule;
  private internetModule =
    require("LensStudio:InternetModule") as InternetModule;
  private gestureModule: GestureModule = require("LensStudio:GestureModule");
  private loaderSpinnerImage: SceneObject;  /**
   * Called when component is initialized
   */
  onAwake(): void {
    // Initialize logger
    this.logger = new Logger("ExampleOAICalls", this.enableLogging || this.enableLoggingLifecycle, true);

    if (this.enableLoggingLifecycle) {
      this.logger.debug("LIFECYCLE: onAwake() - Component initializing");
    }



    if (global.deviceInfoSystem.isEditor()) {
      this.createEvent("TapEvent").bind(() => {
        this.onTap();
      });
    } else {
      this.gestureModule
        .getPinchDownEvent(GestureModule.HandType.Right)
        .add(() => {
          this.onTap();
        });
    }
  }
  private onTap() {
    if (this.doChatCompletionsOnTap) {
      this.doChatCompletions();
    }

    if (this.doFunctionCallingOnTap) {
      this.doFunctionCalling();
    }
  }
  doChatCompletions() {
    this.textDisplay.sceneObject.enabled = true;
    this.textDisplay.text = "Generating...";
    OpenAI.chatCompletions({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: this.systemPrompt,
        },
        {
          role: "user",
          content: this.userPrompt,
        },
      ],
      temperature: 0.7,
    })
      .then((response) => {
        this.textDisplay.text = response.choices[0].message.content;
      })
      .catch((error) => {
        this.textDisplay.text = "Error: " + error;
      });
  }



  doFunctionCalling() {
    this.textDisplay.sceneObject.enabled = true;
    this.textDisplay.text = "Processing function call...";

    // Define available functions
    const tools: OpenAITypes.Common.Tool[] = [
      {
        type: "function",
        function: {
          name: "set-text-color",
          description: "Set the color of the text display",
          parameters: {
            type: "object",
            properties: {
              r: {
                type: "number",
                description: "Red component of the color (0-255)",
              },
              g: {
                type: "number",
                description: "Green component of the color (0-255)",
              },
              b: {
                type: "number",
                description: "Blue component of the color (0-255)",
              },
            },
            required: ["r", "g", "b"],
          },
        },
      },
    ];

    OpenAI.chatCompletions({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "user",
          content: this.functionCallingPrompt,
        },
      ],
      tools: tools,
      tool_choice: "auto",
      temperature: 0.7,
    })
      .then((response) => {
        const message = response.choices[0].message;

        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0];

          if (toolCall.function.name === "set-text-color") {
            const args = JSON.parse(toolCall.function.arguments);
            this.textDisplay.textFill.color = new vec4(
              args.r / 255,
              args.g / 255,
              args.b / 255,
              1
            );
            this.textDisplay.text = `Text color set to RGB(${args.r}, ${args.g}, ${args.b})`;
          }
        }
      })
      .catch((error) => {
        this.textDisplay.text = "Error: " + error;
      });
  }

  // Returns a 1–3 sentence fact about a planet, for PlanetOrbits to display.
  generatePlanetFact(planetName: string): Promise<string> {
    return OpenAI.chatCompletions({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: "Tell me a quick interesting fun fact about the planet " + planetName + "." },
      ],
      temperature: 0.7,
    }).then((response) => response.choices[0].message.content || "");
  }
}
