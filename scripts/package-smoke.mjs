import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const TIMEOUT_MS = 30_000;
const GRACE_MS = 3000;
const FIRST_USER_ARG = 2;
const INITIALIZE_ID = 1;
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "better-caprover-mcp";
const DEFAULT_COMMAND = ["node", "dist/main.js"];
const MAX_SHOWN_CHARS = 80;
const ARGUMENT_SEPARATORS = new Set(["--"]);

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
  const [first, ...rest] = argv;
  const args = ARGUMENT_SEPARATORS.has(first) ? rest : argv;
  return args.length === 0 ? DEFAULT_COMMAND : args;
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
      child.kill();
      reject(new Error(`no reply to initialize after ${TIMEOUT_MS} ms`));
    }, TIMEOUT_MS);
    child.on("error", reject);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (hasInitializeReply(stdout)) {
        child.stdin.end();
        setTimeout(() => child.kill(), GRACE_MS);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = parseCommand(process.argv.slice(FIRST_USER_ARG));
  process.exit(await runSmoke(command));
}
