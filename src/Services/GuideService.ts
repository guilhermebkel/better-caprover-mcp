import type { GuideTopic } from "@/Protocols/GuideProtocol.ts";
import { GUIDE_TOPICS } from "@/Schemas/GuideSchema.ts";

const MODES_TEXT = `# modes

Purpose: tells which calls this server accepts and how to ask for more access.

Syntax: the person sets \`CAPROVER_MCP_MODE\` and restarts the server. No call changes it.

Accepted values:
- \`readonly\` (default): read operations only.
- \`operate\`: also write operations (create, deploy, scale, set env vars).
- \`admin\`: also destructive operations (delete) and, with \`CAPROVER_MCP_ALLOW_CRITICAL=1\`, critical operations.

Restrictions:
- A critical operation can lock the server out or break every app (change the password, update CapRover, change the root domain, edit nginx, add a node, switch the self-hosted registry, delete images). It needs \`admin\` and \`CAPROVER_MCP_ALLOW_CRITICAL=1\`.
- \`CAPROVER_MCP_TOOLSETS\` picks which groups of operations are registered. Read \`get_access\` to see the active ones.
- A destructive or critical call runs in two steps: the first returns a preview and a \`confirmation_token\`; show the preview to the person and, only if they say yes, repeat the call with \`user_confirmed\` true and the token.

Example: \`get_access\` returns \`mode: "operate"\`; \`delete_app\` is then not registered.

BAD: calling a write operation in \`readonly\` mode again and again, or looking for another way around the mode.`;

const CODE_MODE_TEXT = `# code-mode

Purpose: explains the \`code\` surface, where the model writes a short script instead of calling one tool per step.

Syntax: with \`CAPROVER_MCP_SURFACE=code\` (or \`both\`) the server registers two tools. \`search\` takes a \`query\` and returns the matching operations with their \`caprover.<object>.<verb>\` signature, tier and description. \`execute\` takes a \`script\`: the body of an async function that calls \`await caprover.apps.list()\` and returns the value it needs.

Restrictions:
- A script goes through the same mode, tier, \`dry_run\` and redaction rules as a named operation; a call the mode forbids throws the same message.
- A destructive or critical call from a script is refused unless the client can ask the person directly (elicitation). \`dry_run: true\` previews it. A script cannot pass \`user_confirmed\` or a \`confirmation_token\`.
- The sandbox has no network, files, modules or timers, and a new one starts for every \`execute\`. It limits computing time, memory, stack, the number of \`caprover.*\` calls and the size of the output; the reply names the limit that was hit.
- \`CAPROVER_MCP_TOOLSETS\` shapes only the \`tools\` surface; \`search\` and \`execute\` cover every toolset the mode allows.

Example: \`search\` with \`query\` "env vars", then \`execute\` with \`return await caprover.envVars.set({ app_name: "web", env_vars: "A=1", dry_run: true });\`.

BAD: returning a whole list when the script needs one field, or retrying a call a limit stopped.`;

const APP_DEFINITION_TEXT = `# app-definition

Purpose: describes what an app is on CapRover and which operation changes which part of it.

Syntax: an app is named with lowercase letters, digits and single dashes (\`my-api\`); read it with \`get_app\`.

Accepted values by type:
- \`instance_count\`: integer from 0 to 50; 0 stops the app.
- \`image_name\`: a Docker image with a tag, for example \`nginx:1.27\`.
- \`domain\`: a lower-case host name, for example \`api.example.com\`.

Restrictions:
- An edit is a small named operation (\`scale_app\`, \`set_env_vars\`, \`add_custom_domain\`). The server never re-sends a whole definition.
- Renaming an app recreates its service, so check its domains afterwards.

Example: \`scale_app\` with \`{ "app_name": "web", "instance_count": 2 }\`.

BAD: \`{ "app_name": "Web App", "instance_count": "2" }\`: the name has a capital and a space, and the count is a text.`;

const ENV_VARS_TEXT = `# env-vars

Purpose: how to write env vars for \`set_env_vars\`, and what is never returned.

Syntax: dotenv text, one \`KEY=value\` per line. Blank lines and lines that start with \`#\` are skipped. A value may be quoted.

Accepted values: a key has letters, digits and underscores and does not start with a digit. \`remove_keys\` is a list of keys to delete (at most 20).

Restrictions: values are never returned by any operation; \`get_app\` shows each variable as \`key\` and \`isSet\`. Variables not named in the call keep their value.

Example: \`"DATABASE_URL=postgres://db/app\\nLOG_LEVEL=info"\`.

BAD: \`"DATABASE_URL postgres://db/app"\`: it has no \`=\`, and the error quotes only the start of the line.`;

const DEPLOY_TEXT = `# deploy

Purpose: the ways to put code on an app and how to tell that a deploy worked.

Syntax: \`create_app\` makes the empty app; \`deploy_image\` runs an image; \`deploy_archive\` uploads a source archive that CapRover builds; \`trigger_build\` calls the webhook of an app that builds from a repository; \`deploy_one_click\` installs a template and returns a \`job_id\` that \`get_one_click_deploy_progress\` reads.

Restrictions:
- A deploy returns when CapRover accepts it, not when the app runs. Read \`get_app_runtime\`, and \`get_build_logs\` when it fails.
- A one-click status of finished does not prove the app serves traffic; read \`get_app_runtime\` for each app it made.
- \`deploy_archive\` takes a tar archive in base64, at most 5 MB of text, with a \`captain-definition\` file at its root.

Example: \`deploy_image\` with \`{ "app_name": "web", "image_name": "nginx:1.27" }\`.

BAD: \`deploy_image\` with \`nginx\` and no tag, which can pull a different image tomorrow.`;

const ERRORS_TEXT = `# errors

Purpose: how to read an error and what to do next. A failed call is a result with \`isError\` true; it names what failed, why and what to do.

Cases:
- Denied by the mode or the tier: the person must change \`CAPROVER_MCP_MODE\` or \`CAPROVER_MCP_ALLOW_CRITICAL\` and restart. Do not try another way. See \`modes\`.
- Invalid input: the message lists each bad field. Fix the call; an unknown name comes back with the closest valid ones.
- Confirmation token missing, used, expired or from another call: the reply carries a new preview and token; show the preview to the person again.
- The person declined when the client asked them directly: nothing changed; do not call it again unless they ask.
- CapRover refused or could not be reached: the message says which; do not retry in a loop.
- The CapRover version lacks an endpoint: the message names the requirement.
- A batch stopped at an item: \`applied\` ran, \`notApplied\` did not, nothing after the failure ran. CapRover has no transactions, so applied items stay applied.

Example: \`{ "applied": ["sha256:a"], "notApplied": ["sha256:b", "sha256:c"] }\` means retry only the second and third.

BAD: repeating a denied call with the same arguments.`;

export class GuideService {
  static readonly TOPIC_TO_TEXT: Record<GuideTopic, string> = {
    "modes": MODES_TEXT,
    "code-mode": CODE_MODE_TEXT,
    "app-definition": APP_DEFINITION_TEXT,
    "env-vars": ENV_VARS_TEXT,
    "deploy": DEPLOY_TEXT,
    "errors": ERRORS_TEXT,
  };

  static listTopics(): readonly GuideTopic[] {
    return GUIDE_TOPICS;
  }

  static findTopic(name: string): GuideTopic | undefined {
    return GUIDE_TOPICS.find((topic) => topic === name);
  }

  static readTopic(topic: GuideTopic): string {
    return GuideService.TOPIC_TO_TEXT[topic];
  }
}
