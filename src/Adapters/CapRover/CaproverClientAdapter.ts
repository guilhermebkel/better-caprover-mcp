import type { CaproverApiClass } from "@/Protocols/CaproverAdapterProtocol.ts";
import CapRoverApi, { SimpleAuthenticationProvider } from "caprover-api";
import type { z } from "zod";
import { CaproverConfigError } from "@/Errors/CaproverConfigError.ts";
import { CaproverRequestError } from "@/Errors/CaproverRequestError.ts";
import type {
  CaproverAppList,
  CaproverAppRuntime,
  CaproverBuildLogs,
  CaproverClientPort,
  CaproverConfig,
  CaproverEnvVar,
  CaproverOneClickApp,
  CaproverSystemInfo,
  CaptainErrorBody,
  NewAppRequest,
} from "@/Protocols/CaproverClientProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import {
  AppListResponseSchema,
  AppLogsResponseSchema,
  AppRuntimeResponseSchema,
  BuildLogsResponseSchema,
  CaptainErrorSchema,
  OneClickAppsResponseSchema,
  SystemInfoResponseSchema,
} from "@/Schemas/CaproverResponseSchema.ts";
import { DockerLogUtil } from "@/Utils/DockerLogUtil.ts";
import { RedactUtil } from "@/Utils/RedactUtil.ts";

const IMAGE_DEFINITION_SCHEMA_VERSION = 2;
const MAX_HTTP_ERROR_LENGTH = 300;
const HTTP_NOT_FOUND = 404;
const HTTP_ERROR_PREFIX = /^HTTP (\d{3}):/;

const STATUS_WRONG_PASSWORD = 1105;
const STATUS_PASSWORD_BACK_OFF = 1113;
const STATUS_OTP_REQUIRED = 1114;

const STATUS_TO_MESSAGE = new Map<number, string>([
  [STATUS_WRONG_PASSWORD, "CapRover rejected the password. Tell the person to check CAPROVER_PASSWORD."],
  [STATUS_PASSWORD_BACK_OFF, "CapRover is slowing down login attempts after too many failures. Wait one minute, then try again."],
  [STATUS_OTP_REQUIRED, "This CapRover asks for a two-factor code. This server does not support two-factor login, so it cannot log in."],
]);

const isApiClass = (candidate: unknown): candidate is CaproverApiClass => typeof candidate === "function";

export class CaproverClientAdapter implements CaproverClientPort {
  private apiPromise: Promise<CapRoverApi> | undefined;

  constructor(private readonly config: CaproverConfig | undefined) {}

  static buildFromEnv(env: Env): CaproverClientAdapter {
    const { CAPROVER_URL: url, CAPROVER_PASSWORD: password } = env;
    const isConfigured = url !== undefined && password !== undefined;
    return new CaproverClientAdapter(isConfigured ? { url, password } : undefined);
  }

  async getSystemInfo(): Promise<CaproverSystemInfo> {
    return this.request(async (api) => {
      const [captain, version] = await Promise.all([api.getCaptainInfo(), api.getVersionInfo()]);
      return { captain, version };
    }, SystemInfoResponseSchema);
  }

  async listApps(): Promise<CaproverAppList> {
    return this.request((api) => api.getAllApps(), AppListResponseSchema);
  }

  async getAppRuntime(appName: string): Promise<CaproverAppRuntime> {
    try {
      return await this.request((api) => api.getAppRuntime(appName), AppRuntimeResponseSchema);
    } catch (error) {
      if (error instanceof CaproverRequestError && error.httpStatus === HTTP_NOT_FOUND) {
        throw new CaproverRequestError(
          "This CapRover version has no runtime endpoint (CapRover 1.15.5 has none). "
          + "To see how the app runs, use `get_app_logs` and `get_build_logs`.",
        );
      }
      throw error;
    }
  }

  async getAppLogs(appName: string): Promise<string> {
    const hex = await this.request((api) => api.fetchAppLogsInHex(appName), AppLogsResponseSchema);
    return DockerLogUtil.decodeHex(hex);
  }

  async getBuildLogs(appName: string): Promise<CaproverBuildLogs> {
    return this.request((api) => api.fetchBuildLogs(appName), BuildLogsResponseSchema);
  }

  async listOneClickApps(): Promise<CaproverOneClickApp[]> {
    return this.request((api) => api.getAllOneClickApps(), OneClickAppsResponseSchema);
  }

  async createApp(request: NewAppRequest): Promise<void> {
    await this.send((api) => api.registerNewApp(request.appName, "", request.hasPersistentData, false));
  }

  async deployImage(appName: string, imageName: string): Promise<void> {
    const definition = { schemaVersion: IMAGE_DEFINITION_SCHEMA_VERSION, imageName };
    await this.send((api) => api.uploadCaptainDefinitionContent(appName, definition, "", true));
  }

  async setEnvVars(appName: string, envVars: CaproverEnvVar[]): Promise<void> {
    await this.send((api) => api.patchAppDefinition(appName, { envVars }));
  }

  async setInstanceCount(appName: string, instanceCount: number): Promise<void> {
    await this.send((api) => api.patchAppDefinition(appName, { instanceCount }));
  }

  async addCustomDomain(appName: string, domain: string): Promise<void> {
    await this.send((api) => api.attachNewCustomDomainToApp(appName, domain));
  }

  async enableSsl(appName: string, domain: string | undefined): Promise<void> {
    await this.send((api) => (domain === undefined
      ? api.enableSslForBaseDomain(appName)
      : api.enableSslForCustomDomain(appName, domain)));
  }

  async deleteApp(appName: string, volumeNames: string[]): Promise<void> {
    await this.send((api) => api.deleteApp(appName, volumeNames, undefined));
  }

  private async request<Result>(
    call: (api: CapRoverApi) => Promise<unknown>,
    schema: z.ZodType<Result>,
  ): Promise<Result> {
    const response = await this.send(call);
    return schema.parse(response);
  }

  private async send(call: (api: CapRoverApi) => Promise<unknown>): Promise<unknown> {
    const api = await this.getApi();
    try {
      return await call(api);
    } catch (error) {
      throw this.translateError(error);
    }
  }

  private async getApi(): Promise<CapRoverApi> {
    this.apiPromise ??= this.connect();
    try {
      return await this.apiPromise;
    } catch (error) {
      this.apiPromise = undefined;
      throw error;
    }
  }

  private async connect(): Promise<CapRoverApi> {
    if (this.config === undefined) {
      throw new CaproverConfigError();
    }
    const { url, password } = this.config;
    const apiClass = CaproverClientAdapter.loadApiClass();
    const api = new apiClass(url, new SimpleAuthenticationProvider(() => Promise.resolve({ password })));
    try {
      await api.login(password);
    } catch (error) {
      throw this.translateError(error);
    }
    return api;
  }

  private static loadApiClass(): CaproverApiClass {
    // Why: the SDK is CommonJS. Node and the bundle give the module object as the default import, with the class in its
    // own "default" member, while the test runner gives the class itself.
    const loaded: unknown = CapRoverApi;
    if (isApiClass(loaded)) {
      return loaded;
    }
    if (typeof loaded === "object" && loaded !== null && "default" in loaded && isApiClass(loaded.default)) {
      return loaded.default;
    }
    throw new CaproverRequestError("The CapRover SDK did not load: its default export is not a class.");
  }

  private translateError(error: unknown): CaproverRequestError {
    const captainError = CaptainErrorSchema.safeParse(error);
    const message = captainError.success
      ? CaproverClientAdapter.describeCaptainError(captainError.data)
      : this.describeTransportError(error);
    const secrets = this.config === undefined ? [] : [this.config.password];
    const isTransportError = !captainError.success && error instanceof Error;
    const httpStatus = isTransportError ? CaproverClientAdapter.readHttpStatus(error) : undefined;
    return new CaproverRequestError(RedactUtil.redactText(message, secrets), httpStatus);
  }

  private static describeCaptainError(error: CaptainErrorBody): string {
    const known = STATUS_TO_MESSAGE.get(error.captainStatus);
    return known ?? `CapRover refused the request (code ${error.captainStatus}): ${error.captainMessage ?? "no message"}`;
  }

  private static readHttpStatus(error: Error): number | undefined {
    const match = HTTP_ERROR_PREFIX.exec(error.message);
    return match?.[1] === undefined ? undefined : Number(match[1]);
  }

  private static readErrorCode(error: unknown): string | undefined {
    if (!(error instanceof Error)) {
      return undefined;
    }
    // Why: node-fetch puts the code on the error itself, while the native fetch puts it on the error's cause.
    const holder = "code" in error ? error : error.cause;
    return holder instanceof Error && "code" in holder ? String(holder.code) : undefined;
  }

  private describeTransportError(error: unknown): string {
    const url = this.config?.url ?? "the configured URL";
    const code = CaproverClientAdapter.readErrorCode(error);
    if (code !== undefined) {
      return `Cannot reach CapRover at ${url} (${code}). Tell the person to check CAPROVER_URL and that the server is online.`;
    }
    const detail = error instanceof Error ? error.message.slice(0, MAX_HTTP_ERROR_LENGTH) : "unknown error";
    return `CapRover at ${url} answered with an error: ${detail}`;
  }
}
