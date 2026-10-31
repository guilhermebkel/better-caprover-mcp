import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GuideService } from "@/Services/GuideService.ts";

export class GuideSurface {
  static readonly URI_PREFIX = "caprover://docs/";

  static register(server: McpServer): void {
    for (const topic of GuideService.listTopics()) {
      const uri = `${GuideSurface.URI_PREFIX}${topic}`;
      server.registerResource(
        `docs-${topic}`,
        uri,
        { title: `CapRover MCP guide: ${topic}`, description: `The guide topic ${topic}.`, mimeType: "text/markdown" },
        () => ({ contents: [{ uri, mimeType: "text/markdown", text: GuideService.readTopic(topic) }] }),
      );
    }
  }
}
