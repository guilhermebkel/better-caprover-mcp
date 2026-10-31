import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CreateAppInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { CreateAppInputSchema } from "@/Schemas/AppInputSchema.ts";

export class CreateAppOperation implements OperationPort<CreateAppInput> {
  static readonly NAME = "createApp";

  readonly description = "Creates an empty app on the CapRover server. Use it before the first deploy of a new app; "
    + "to run an image on the app, use `deploy_image`. The app runs nothing until it is deployed. "
    + "It returns the app name; it fails if the name is taken. It writes to the server; with `dry_run` it only checks the name.";

  readonly inputSchema = CreateAppInputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: CreateAppInput): Promise<OperationResult> {
    const { apps } = await this.client.listApps();
    const isTaken = apps.some((app) => app.appName === input.app_name);
    const outcome = isTaken ? "The name is taken, so the call would fail." : "The name is free.";
    return {
      summary: `Would create the app ${input.app_name}. ${outcome}`,
      data: { appName: input.app_name, hasPersistentData: input.has_persistent_data ?? false, isNameTaken: isTaken },
    };
  }

  async execute(input: CreateAppInput): Promise<OperationResult> {
    const hasPersistentData = input.has_persistent_data ?? false;
    await this.client.createApp({ appName: input.app_name, hasPersistentData });
    return {
      summary: `Created the app ${input.app_name}. It runs nothing until an image is deployed.`,
      data: { appName: input.app_name, hasPersistentData },
    };
  }
}
