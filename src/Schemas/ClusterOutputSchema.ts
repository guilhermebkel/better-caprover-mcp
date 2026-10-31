import {
  buildChangeOutputSchema,
  buildListOutputSchema,
  buildReadOutputSchema,
  CountOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const ListNodesOutputSchema = buildListOutputSchema("nodes");

export const AddNodeOutputSchema = buildChangeOutputSchema({
  nodeRole: TextOutputSchema,
  remoteNodeIpAddress: TextOutputSchema,
});

export const GetLoadBalancerOutputSchema = buildReadOutputSchema({
  activeConnections: CountOutputSchema,
  acceptedConnections: CountOutputSchema,
  handledConnections: CountOutputSchema,
  totalRequests: CountOutputSchema,
  readingConnections: CountOutputSchema,
  writingConnections: CountOutputSchema,
  waitingConnections: CountOutputSchema,
});
