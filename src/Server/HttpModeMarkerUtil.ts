import { unlinkSync, writeFileSync } from "node:fs";

export class HttpModeMarkerUtil {
  static readonly DEFAULT_MARKER_PATH = "/tmp/better-caprover-mcp-http.active";

  static markHttpModeActive(markerPath = HttpModeMarkerUtil.DEFAULT_MARKER_PATH): void {
    writeFileSync(markerPath, "1", { encoding: "utf8" });
  }

  static clearHttpModeMarker(markerPath = HttpModeMarkerUtil.DEFAULT_MARKER_PATH): void {
    try {
      unlinkSync(markerPath);
    } catch {
      // Why: stdio-only runs never create the marker.
    }
  }
}
