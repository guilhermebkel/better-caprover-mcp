import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetGuideOutputSchema } from "@/Schemas/AppOutputSchema.ts";
import { GetGuideInputSchema, type GetGuideInput } from "@/Schemas/GuideSchema.ts";
import { GuideService } from "@/Services/GuideService.ts";

export class GetGuideOperation implements OperationPort<GetGuideInput> {
  static readonly NAME = "getGuide";

  readonly description = "Read-only. Returns one documentation topic by name: what the access modes allow, how to write env vars, "
    + "how to deploy, how to read an error. Use it when an error or a field points to a topic, or before you write "
    + "an input whose syntax you are not sure of. It returns the topic text in `text`; an unknown name returns "
    + "an error with the valid topic names.";

  readonly inputSchema = GetGuideInputSchema;

  readonly outputSchema = GetGuideOutputSchema;

  readonly risk: RiskTier = "read";

  execute(input: GetGuideInput): Promise<OperationResult> {
    const topic = GuideService.findTopic(input.topic);
    if (topic === undefined) {
      const topics = GuideService.listTopics();
      return Promise.resolve({
        isError: true,
        summary: `There is no topic "${input.topic}". Valid topics: ${topics.join(", ")}.`,
        data: { topics: [...topics] },
      });
    }
    return Promise.resolve({
      summary: `Topic ${topic}.`,
      data: { topic, text: GuideService.readTopic(topic), topics: [...GuideService.listTopics()] },
    });
  }
}
