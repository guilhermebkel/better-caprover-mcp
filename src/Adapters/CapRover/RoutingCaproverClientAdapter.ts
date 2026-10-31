import type { CaproverClientPort, NewAppRequest } from "@/Protocols/CaproverClientProtocol.ts";
import { CaproverServerRegistryService } from "@/Services/CaproverServerRegistryService.ts";

export class RoutingCaproverClientAdapter implements CaproverClientPort {
  private get delegate(): CaproverClientPort {
    const active = CaproverServerRegistryService.activeStorage.getStore();
    if (active === undefined) {
      throw new Error("No CapRover server is active for this call.");
    }
    return active.client;
  }

  async getSystemInfo() {
    return this.delegate.getSystemInfo();
  }

  async listApps() {
    return this.delegate.listApps();
  }

  async getAppRuntime(appName: string) {
    return this.delegate.getAppRuntime(appName);
  }

  async getAppLogs(appName: string) {
    return this.delegate.getAppLogs(appName);
  }

  async getBuildLogs(appName: string) {
    return this.delegate.getBuildLogs(appName);
  }

  async listOneClickApps() {
    return this.delegate.listOneClickApps();
  }

  async createApp(request: NewAppRequest) {
    return this.delegate.createApp(request);
  }

  async deployImage(appName: string, imageName: string) {
    return this.delegate.deployImage(appName, imageName);
  }

  async setEnvVars(appName: string, envVars: Parameters<CaproverClientPort["setEnvVars"]>[1]) {
    return this.delegate.setEnvVars(appName, envVars);
  }

  async setInstanceCount(appName: string, count: number) {
    return this.delegate.setInstanceCount(appName, count);
  }

  async addCustomDomain(appName: string, domain: string) {
    return this.delegate.addCustomDomain(appName, domain);
  }

  async enableSsl(appName: string, domain?: string) {
    return this.delegate.enableSsl(appName, domain);
  }

  async deleteApp(appName: string, volumeNames: string[]) {
    return this.delegate.deleteApp(appName, volumeNames);
  }
}
