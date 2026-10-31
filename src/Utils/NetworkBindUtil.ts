const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const IPV4_WILDCARD = "0.0.0.0";
const IPV6_WILDCARD = "::";

export class NetworkBindUtil {
  static isLocalBindHost(host: string): boolean {
    return LOCAL_HOSTS.has(host.trim().toLowerCase());
  }

  static buildUrlHost(host: string): string {
    return host.includes(":") ? `[${host}]` : host;
  }

  static buildProbeHost(bindHost: string): string {
    const host = bindHost.trim().toLowerCase();
    if (host === IPV4_WILDCARD) {
      return NetworkBindUtil.buildUrlHost("127.0.0.1");
    }
    if (host === IPV6_WILDCARD) {
      return NetworkBindUtil.buildUrlHost("::1");
    }
    return NetworkBindUtil.buildUrlHost(host);
  }
}
