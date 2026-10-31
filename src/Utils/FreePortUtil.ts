import { createServer } from "node:net";

export class FreePortUtil {
  static find(): Promise<number> {
    return new Promise((resolve, reject) => {
      const probe = createServer();
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => {
        const address = probe.address();
        const port = address !== null && typeof address === "object" ? address.port : undefined;
        probe.close(() => {
          if (port === undefined) {
            reject(new Error("No free port."));
            return;
          }
          resolve(port);
        });
      });
    });
  }
}
