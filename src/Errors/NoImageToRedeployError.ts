import { ToolFailureError } from "@/Errors/ToolFailureError.ts";

export class NoImageToRedeployError extends ToolFailureError {
  constructor(appName: string) {
    super(
      `App "${appName}" has no image name, so there is no image to send again. `
      + "To run an image, use `deploy_image`; to build from source, use `deploy_archive`.",
    );
    this.name = "NoImageToRedeployError";
  }
}
