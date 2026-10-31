import type { MaskedEnvVar } from "@/Protocols/AppViewProtocol.ts";
import type { CaproverApp, CaproverEnvVar } from "@/Protocols/CaproverClientProtocol.ts";

export class AppViewUtil {
  static buildConcise(app: CaproverApp): Record<string, unknown> {
    return {
      appName: app.appName,
      url: app.url,
      instanceCount: app.instanceCount,
      imageName: app.imageName,
      isBuilding: app.isBuilding,
    };
  }

  static buildDetailed(app: CaproverApp): Record<string, unknown> {
    return {
      ...AppViewUtil.buildConcise(app),
      deployedVersion: app.deployedVersion,
      hasPersistentData: app.hasPersistentData,
      isExposedAsWebApp: app.isExposedAsWebApp,
      hasForcedSsl: app.hasForcedSsl,
      hasDefaultDomainSsl: app.hasDefaultDomainSsl,
      containerHttpPort: app.containerHttpPort,
      customDomains: app.customDomains,
      ports: app.ports,
      volumes: app.volumes,
      envVars: AppViewUtil.maskEnvVars(app.envVars),
    };
  }

  static maskEnvVars(envVars: readonly CaproverEnvVar[]): MaskedEnvVar[] {
    return envVars.map((envVar) => ({ key: envVar.key, isSet: envVar.value !== "" }));
  }
}
