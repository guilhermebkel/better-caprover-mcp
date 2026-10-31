const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export class NetworkBindUtil {
  static isLocalBindHost(host: string): boolean {
    return LOCAL_HOSTS.has(host.trim().toLowerCase());
  }
}
