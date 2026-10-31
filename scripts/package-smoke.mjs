import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const TIMEOUT_MS = 30_000;
const GRACE_MS = 3000;
const FIRST_USER_ARG = 2;
const INITIALIZE_ID = 1;
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "better-caprover-mcp";
const DEFAULT_COMMAND = ["node", "dist/main.js"];
const MAX_SHOWN_CHARS = 80;
const HTTP_SMOKE_TOKEN = "smoke-http-token-12345678";
const HTTP_PORT = "3100";
const HTTP_OK = 200;
const HEALTH_WAIT_MS = 15_000;
const HEALTH_POLL_MS = 200;
const DOCKER_HEALTH_WAIT_MS = 60_000;
const DOCKER_HEALTH_POLL_MS = 500;
const SIGTERM = "SIGTERM";

export const waitForDockerHealthy = async (imageRef, spawnSyncFn = spawnSync) => {
  const deadline = Date.now() + DOCKER_HEALTH_WAIT_MS;
  while (Date.now() < deadline) {
    const list = spawnSyncFn("docker", ["ps", "-q", "--filter", `ancestor=${imageRef}`], { encoding: "utf8" });
    const containerId = list.stdout.trim().split("\n").find((line) => line.trim() !== "");
    if (containerId !== undefined && containerId !== "") {
      const inspect = spawnSyncFn("docker", ["inspect", "-f", "{{.State.Health.Status}}", containerId], { encoding: "utf8" });
      if (inspect.stdout.trim() === "healthy") {
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, DOCKER_HEALTH_POLL_MS));
  }
  throw new Error(`Docker HEALTHCHECK did not become healthy for ${imageRef} within ${DOCKER_HEALTH_WAIT_MS} ms`);
};

const readDockerImageRef = (args) => {
  const serveIndex = args.indexOf("serve");
  const beforeServe = serveIndex === -1 ? args : args.slice(0, serveIndex);
  return beforeServe[beforeServe.length - 1];
};

export const buildRequestLines = () => {
  const initialize = {
    jsonrpc: "2.0",
    id: INITIALIZE_ID,
    method: "initialize",
    params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "package-smoke", version: "0.0.0" } },
  };
  const initialized = { jsonrpc: "2.0", method: "notifications/initialized" };
  return [initialize, initialized].map((message) => JSON.stringify(message));
};

export const parseLines = (text) => {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`stdout carries a line that is not JSON: ${line.slice(0, MAX_SHOWN_CHARS)}`);
    }
  });
};

export const checkReplies = (replies) => {
  const problems = [];
  if (replies.some((reply) => reply.jsonrpc !== "2.0")) {
    problems.push("a stdout line is not a JSON-RPC 2.0 message");
  }
  const initializeReplies = replies.filter((reply) => reply.id === INITIALIZE_ID);
  if (initializeReplies.length !== 1) {
    problems.push(`expected one reply to initialize, got ${initializeReplies.length}`);
    return problems;
  }
  const result = initializeReplies[0].result ?? {};
  if (result.serverInfo?.name !== SERVER_NAME) {
    problems.push(`serverInfo.name is ${JSON.stringify(result.serverInfo?.name)}, expected ${SERVER_NAME}`);
  }
  if (!String(result.instructions ?? "").includes("Access mode: readonly")) {
    problems.push("the instructions do not say the server starts in readonly mode");
  }
  return problems;
};

export const parseCommand = (argv) => {
  const argvTokenToModeFlagKey = {
    "--stdio-only": "isStdioOnly",
    "--http-only": "isHttpOnly",
  };
  const modeFlags = { isStdioOnly: false, isHttpOnly: false };
  const separatorIndex = argv.indexOf("--");
  const beforeSeparator = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  const afterSeparator = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);
  for (const token of beforeSeparator) {
    const flagKey = argvTokenToModeFlagKey[token];
    if (flagKey !== undefined) {
      modeFlags[flagKey] = true;
    }
  }
  let command = afterSeparator;
  if (separatorIndex === -1) {
    command = argv.filter((token) => argvTokenToModeFlagKey[token] === undefined);
  }
  const resolved = command.length === 0 ? DEFAULT_COMMAND : command;
  return { command: resolved, isStdioOnly: modeFlags.isStdioOnly, isHttpOnly: modeFlags.isHttpOnly };
};

const stopChildProcessTree = (child) => {
  if (child.pid === undefined) {
    child.kill();
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    return;
  }
  try {
    process.kill(-child.pid, SIGTERM);
  } catch {
    child.kill(SIGTERM);
  }
};

const hasInitializeReply = (text) => {
  try {
    return parseLines(text).some((reply) => reply.id === INITIALIZE_ID);
  } catch {
    return false;
  }
};

const runServer = (command) => {
  return new Promise((resolve, reject) => {
    const [program, ...args] = command;
    const child = spawn(program, args, { stdio: ["pipe", "pipe", "inherit"] });
    let stdout = "";
    const timer = setTimeout(() => {
      stopChildProcessTree(child);
      reject(new Error(`no reply to initialize after ${TIMEOUT_MS} ms`));
    }, TIMEOUT_MS);
    child.on("error", reject);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (hasInitializeReply(stdout)) {
        child.stdin.end();
        setTimeout(() => stopChildProcessTree(child), GRACE_MS);
      }
    });
    child.on("close", () => {
      clearTimeout(timer);
      resolve(stdout);
    });
    child.stdin.write(`${buildRequestLines().join("\n")}\n`);
  });
};

const runSmoke = async (command) => {
  const stdout = await runServer(command);
  const problems = checkReplies(parseLines(stdout));
  if (problems.length > 0) {
    process.stderr.write(`${problems.join("\n")}\n`);
    return 1;
  }
  process.stdout.write(`smoke ok: ${command.join(" ")}\n`);
  return 0;
};

const waitForHealth = async (url) => {
  const deadline = Date.now() + HEALTH_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.status === HTTP_OK) {
        return;
      }
    } catch {
      // Why: the server may not be listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
  }
  throw new Error(`HTTP health check did not pass at ${url}/health within ${HEALTH_WAIT_MS} ms`);
};

const programToAfterHealthHook = {
  docker: async (args) => {
    const imageRef = readDockerImageRef(args);
    if (imageRef !== undefined) {
      await waitForDockerHealthy(imageRef);
    }
  },
};

export const runHttpSmoke = async (command) => {
  const [program, ...args] = command;
  const httpArgs = [...args, "serve", "--http"];
  const childEnv = {
    ...globalThis.process.env,
    CAPROVER_MCP_HTTP_PORT: HTTP_PORT,
    CAPROVER_MCP_HTTP_TOKENS: JSON.stringify({ smoke: HTTP_SMOKE_TOKEN }),
    CAPROVER_MCP_HTTP_HOST: "127.0.0.1",
  };
  const child = spawn(program, httpArgs, {
    env: childEnv,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  const baseUrl = `http://127.0.0.1:${HTTP_PORT}`;
  try {
    await waitForHealth(baseUrl);
    const afterHealth = programToAfterHealthHook[program];
    if (afterHealth !== undefined) {
      await afterHealth(args);
    }
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${HTTP_SMOKE_TOKEN}` } },
    });
    const client = new Client({ name: "package-smoke-http", version: "0.0.0" });
    await client.connect(transport);
    const name = client.getServerVersion()?.name;
    const instructions = client.getInstructions() ?? "";
    await client.close();
    const problems = [];
    if (name !== SERVER_NAME) {
      problems.push(`HTTP serverInfo.name is ${JSON.stringify(name)}, expected ${SERVER_NAME}`);
    }
    if (!instructions.includes("Access mode: readonly")) {
      problems.push("HTTP instructions do not say readonly mode");
    }
    if (problems.length > 0) {
      process.stderr.write(`${problems.join("\n")}\n`);
      return 1;
    }
    process.stdout.write(`smoke http ok: ${[program, ...httpArgs].join(" ")}\n`);
    return 0;
  } finally {
    stopChildProcessTree(child);
  }
};

const runAllSmoke = async ({ command, isStdioOnly, isHttpOnly }) => {
  if (isHttpOnly) {
    return runHttpSmoke(command);
  }
  const stdioCode = await runSmoke(command);
  if (stdioCode !== 0 || isStdioOnly) {
    return stdioCode;
  }
  return runHttpSmoke(command);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const parsed = parseCommand(process.argv.slice(FIRST_USER_ARG));
  process.exit(await runAllSmoke(parsed));
}
