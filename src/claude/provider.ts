import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { logger } from "../logger.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface QueryOptions {
  prompt: string;
  cwd: string;
  resume?: string;
  model?: string;
  systemPrompt?: string;
  permissionMode?: "default" | "acceptEdits" | "plan" | "bypassPermissions";
  images?: Array<{
    type: "image";
    source: { type: "base64"; media_type: string; data: string };
  }>;
  onPermissionRequest?: (toolName: string, toolInput: string) => Promise<boolean>;
  /** Called each time an assistant text chunk is produced. */
  onText?: (text: string) => Promise<void> | void;
  /** Called when OpenCode reports a tool call, with a human-readable summary. */
  onThinking?: (summary: string) => Promise<void> | void;
  /** Optional abort controller to cancel the query when a new message arrives. */
  abortController?: AbortController;
}

export interface QueryResult {
  text: string;
  sessionId: string;
  error?: string;
}

interface OpenCodeEvent {
  type?: string;
  sessionID?: string;
  part?: {
    type?: string;
    text?: string;
    tool?: string;
    state?: {
      input?: unknown;
      output?: string;
      title?: string;
      status?: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mediaTypeToExtension(mediaType: string): string {
  switch (mediaType.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/jpeg":
    case "image/jpg":
    default:
      return "jpg";
  }
}

function writeImageFiles(images: QueryOptions["images"]): { files: string[]; tempDir?: string } {
  if (!images?.length) return { files: [] };

  const tempDir = mkdtempSync(join(tmpdir(), "wechat-opencode-"));
  const files = images.map((image, index) => {
    const ext = mediaTypeToExtension(image.source.media_type);
    const filePath = join(tempDir, `image-${index + 1}.${ext}`);
    writeFileSync(filePath, Buffer.from(image.source.data, "base64"));
    return filePath;
  });

  return { files, tempDir };
}

function buildPrompt(prompt: string, systemPrompt?: string): string {
  if (!systemPrompt?.trim()) return prompt;
  return [
    "System instruction from WeChat bridge:",
    systemPrompt.trim(),
    "",
    "User message:",
    prompt,
  ].join("\n");
}

function formatToolUse(toolName: string, input: unknown): string {
  const icons: Record<string, string> = {
    bash: "🔧",
    read: "📖",
    write: "✏️",
    edit: "✏️",
    multiedit: "✏️",
    grep: "🔍",
    glob: "🔍",
    webfetch: "🌐",
    websearch: "🌐",
    todowrite: "📝",
    task: "🤖",
  };
  const icon = icons[toolName.toLowerCase()] ?? "⚙️";

  let detail = "";
  if (input && typeof input === "object") {
    const data = input as Record<string, unknown>;
    const value = data.command ?? data.filePath ?? data.file_path ?? data.pattern ?? data.query ?? data.url ?? data.description;
    if (value) detail = String(value).slice(0, 100);
  }

  return detail ? `${icon} ${toolName}: ${detail}` : `${icon} ${toolName}`;
}

function buildArgs(options: QueryOptions, imageFiles: string[]): string[] {
  const args = ["run", "--format", "json", "--dir", options.cwd];

  if (options.resume) args.push("--session", options.resume);
  else args.push("--title", "WeChat OpenCode");

  if (options.model) args.push("--model", options.model);
  if (options.permissionMode === "plan") args.push("--agent", "plan");
  if (options.permissionMode === "bypassPermissions") args.push("--dangerously-skip-permissions");

  for (const file of imageFiles) {
    args.push("--file", file);
  }

  args.push(buildPrompt(options.prompt, options.systemPrompt));
  return args;
}

function createOpenCodeEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };

  // opencode run starts its own local server. If these are inherited from an
  // existing OpenCode session, the CLI can send mismatched auth and fail with
  // "Session not found" before creating the run session.
  delete env.OPENCODE_SERVER_USERNAME;
  delete env.OPENCODE_SERVER_PASSWORD;

  return env;
}

function getOpenCodeCommand(): { command: string; prefixArgs: string[] } {
  if (process.platform !== "win32") {
    return { command: "opencode", prefixArgs: [] };
  }

  const appData = process.env.APPDATA;
  const psShim = appData ? join(appData, "npm", "opencode.ps1") : undefined;
  if (psShim && existsSync(psShim)) {
    return { command: "pwsh", prefixArgs: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psShim] };
  }

  return { command: "pwsh", prefixArgs: ["-NoProfile", "-Command", "opencode"] };
}

async function handleLine(
  line: string,
  state: { sessionId: string; textParts: string[] },
  options: QueryOptions,
): Promise<void> {
  let event: OpenCodeEvent;
  try {
    event = JSON.parse(line) as OpenCodeEvent;
  } catch {
    logger.debug("Ignoring non-JSON opencode output", { line });
    return;
  }

  if (event.sessionID) state.sessionId = event.sessionID;

  if (event.type === "text" && event.part?.text) {
    state.textParts.push(event.part.text);
    await options.onText?.(event.part.text);
    return;
  }

  if (event.type === "tool_use" && event.part?.tool) {
    await options.onThinking?.(formatToolUse(event.part.tool, event.part.state?.input));
  }
}

function waitForProcess(
  child: ChildProcess,
  abortController?: AbortController,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      child.kill();
      reject(new DOMException("OpenCode query aborted", "AbortError"));
    };

    if (abortController?.signal.aborted) {
      abort();
      return;
    }

    abortController?.signal.addEventListener("abort", abort, { once: true });

    child.once("error", (err) => {
      abortController?.signal.removeEventListener("abort", abort);
      reject(err);
    });

    child.once("exit", (code, signal) => {
      abortController?.signal.removeEventListener("abort", abort);
      resolve({ code, signal });
    });
  });
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

export async function opencodeQuery(options: QueryOptions): Promise<QueryResult> {
  const { files: imageFiles, tempDir } = writeImageFiles(options.images);
  const args = buildArgs(options, imageFiles);
  const state = { sessionId: options.resume ?? "", textParts: [] as string[] };
  let errorMessage: string | undefined;
  let stderr = "";

  logger.info("Starting OpenCode query", {
    cwd: options.cwd,
    model: options.model,
    permissionMode: options.permissionMode,
    resume: !!options.resume,
    hasImages: imageFiles.length > 0,
  });

  try {
    const opencode = getOpenCodeCommand();
    const child = spawn(opencode.command, [...opencode.prefixArgs, ...args], {
      cwd: options.cwd,
      env: createOpenCodeEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdoutBuffer = "";
    const lineHandlers: Promise<void>[] = [];
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) {
          lineHandlers.push(handleLine(line, state, options));
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const timeout = setTimeout(() => child.kill(), 5 * 60 * 1000);
    const { code, signal } = await waitForProcess(child, options.abortController);
    clearTimeout(timeout);

    if (stdoutBuffer.trim()) {
      lineHandlers.push(handleLine(stdoutBuffer.trim(), state, options));
    }
    await Promise.all(lineHandlers);

    if (code !== 0) {
      errorMessage = stderr.trim() || `opencode exited with code ${code}${signal ? ` (${signal})` : ""}`;
    }
  } catch (err: unknown) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("OpenCode query threw", { error: errorMessage });
  } finally {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        logger.warn("Failed to clean up temporary image files", { tempDir });
      }
    }
  }

  const fullText = state.textParts.join("\n").trim();
  if (!fullText && !errorMessage) {
    errorMessage = "OpenCode returned an empty response.";
  }

  logger.info("OpenCode query completed", {
    sessionId: state.sessionId,
    textLength: fullText.length,
    hasError: !!errorMessage,
  });

  return {
    text: fullText,
    sessionId: state.sessionId,
    error: errorMessage,
  };
}
