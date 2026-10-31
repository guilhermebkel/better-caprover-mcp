import { z } from "zod";
import type { AddNodeInput, ListNodesField } from "@/Protocols/ClusterInputProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import {
  ConfirmationTokenFieldSchema,
  DryRunFieldSchema,
  UserConfirmedFieldSchema,
} from "@/Schemas/ControlSchema.ts";
import { buildListInputSchema } from "@/Schemas/ListSchema.ts";

const MAX_PRIVATE_KEY_LENGTH = 20_000;
const MAX_SSH_PORT = 65_535;
const MAX_SSH_USER_LENGTH = 64;

const IpAddressFieldSchema = z.union([z.ipv4(), z.ipv6()]);

export const ListNodesInputSchema: z.ZodType<ListInput<ListNodesField>> = buildListInputSchema(
  ["nodeId", "nodeRole", "isLeader", "hostname", "architecture", "operatingSystem", "memoryBytes", "dockerEngineVersion",
    "ipAddress", "nodeState", "availability"],
  "nodes",
);

export const GetLoadBalancerInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});

export const AddNodeInputSchema: z.ZodType<AddNodeInput> = z.strictObject({
  node_role: z.enum(["manager", "worker"]).describe("`worker` runs apps; `manager` also takes part in cluster decisions."),
  private_key: z.string().min(1).max(MAX_PRIVATE_KEY_LENGTH).describe(
    "The SSH private key that CapRover uses to log in to the new node. It is sent to CapRover and never returned.",
  ),
  remote_node_ip_address: IpAddressFieldSchema.describe("The IP address of the new node, which CapRover reaches over SSH."),
  ssh_port: z.number().int().min(1).max(MAX_SSH_PORT).optional().describe("The SSH port of the new node. Default: 22."),
  ssh_user: z.string().min(1).max(MAX_SSH_USER_LENGTH).optional().describe("The SSH user of the new node. Default: root."),
  captain_ip_address: IpAddressFieldSchema.describe(
    "The IP address of this CapRover server as the new node sees it, for example `10.0.0.1`.",
  ),
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});
