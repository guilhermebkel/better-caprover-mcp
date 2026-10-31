import type { ControlFields } from "@/Protocols/ControlProtocol.ts";

export type ListNodesField = "nodeId" | "nodeRole" | "isLeader" | "hostname" | "architecture" | "operatingSystem" | "memoryBytes"
  | "dockerEngineVersion" | "ipAddress" | "nodeState" | "availability";

export type AddNodeInput = ControlFields & {
  node_role: "manager" | "worker";
  private_key: string;
  remote_node_ip_address: string;
  ssh_port?: number;
  ssh_user?: string;
  captain_ip_address: string;
};
