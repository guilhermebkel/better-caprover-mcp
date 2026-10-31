import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const FIRST_USER_ARG = 2;

export const buildLintCommands = ({ isFix, files, maxWarnings }) => {
  const warnings = maxWarnings === undefined ? [] : [`--max-warnings=${maxWarnings}`];
  const fix = isFix ? ["--fix"] : [];
  const targets = files.length === 0 ? ["."] : files;
  return [
    { name: "oxlint", command: "pnpm", args: ["--silent", "lint:oxlint", ...warnings, ...fix, ...targets] },
    { name: "eslint", command: "pnpm", args: ["--silent", "lint:eslint", ...warnings, ...fix, ...targets] },
  ];
};

export const parseArgs = (argv) => {
  const maxWarningsArg = argv.find((arg) => arg.startsWith("--max-warnings="));
  return {
    isFix: argv.includes("--fix"),
    maxWarnings: maxWarningsArg === undefined ? undefined : Number(maxWarningsArg.split("=")[1]),
    files: argv.filter((arg) => !arg.startsWith("--")),
  };
};

const runCommand = ({ command, args }) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
};

const runInOrder = async (commands) => {
  const codes = [];
  for (const command of commands) {
    codes.push(await runCommand(command));
  }
  return codes;
};

const runLint = async (options) => {
  const commands = buildLintCommands(options);
  // Why: with `--fix` the two linters would write the same file at once; Oxlint goes first because ESLint's rules never overlap its own.
  const codes = options.isFix ? await runInOrder(commands) : await Promise.all(commands.map(runCommand));
  return codes.every((code) => code === 0) ? 0 : 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(FIRST_USER_ARG));
  process.exit(await runLint(options));
}
