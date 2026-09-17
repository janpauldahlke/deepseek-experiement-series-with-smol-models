# MISSION: Autonomous IDE Plugin Integration

You are an expert AI developer agent running inside a local fork of `deepseek-ai/deepseek-harness`.
Your goal is to autonomously transform this harness into a standalone, Cursor-like IDE experience WITHOUT relying on external VS Code windows.

You will achieve this by discovering, installing, and configuring workspace/file-system plugins directly into this fork.

## repo on filesystem

repo is here:

- ➜ deepseek-harness git:(master) pwd
  /Users/jandahlke/dev/hagbards_stuff/deepseek-harness

## CONSTRAINTS & RULES

1. NO VS Code: All solutions must live natively within the DeepSeek Harness web UI or CLI.
2. Safety First: Before executing any destructive commands (e.g., `rm`, overwriting core files), you MUST explain what you are doing and ask for my explicit "Yes".
3. Verify Before Acting: Always read the relevant files (e.g., `package.json`, `README.md`, `dsh.config.ts`) before assuming the project structure.
4. Use Local Tools: Rely on your built-in terminal/shell execution tools to run commands like `ls`, `cat`, `pnpm install`, or `dsh plugin ...`.

## STEP-BY-STEP EXECUTION PLAN

### Phase 1: Reconnaissance (Do this first)

- List the root directory contents (`ls -la`).
- Read `package.json` and `README.md` to understand the workspace structure (e.g., is it a pnpm workspace? Where do plugins live? `packages/`, `plugins/`, or `apps/`?).
- Check for existing configuration files like `dsh.config.ts`, `.dshrc`, or `AGENTS.md`.

### Phase 2: Plugin Strategy & Selection

Based on Phase 1, identify the best way to add IDE features. We need:

1. **File Explorer / Workspace Reader**: To let you see and read the project's file tree.
2. **Rule Injector**: To enforce structured output (JSON) and project-specific coding rules.
3. **Local Search (Optional)**: BM25 or simple grep-based search to find code without blowing up the context window.

_Action_: Propose 1-2 specific plugins (e.g., `dsh-file-explorer`, `dsh-rules`) or propose scaffolding a minimal custom plugin directly into the `packages/` directory. Wait for my approval.

### Phase 3: Installation & Scaffolding

Once approved, execute the installation:

- If it's an external plugin: Run the appropriate `dsh plugin install <name>` or `pnpm add` command.
- If we are building it: Scaffold the minimal TypeScript/Node files needed for a DeepSeek Harness plugin, wire it into `package.json`, and run `pnpm install`.

### Phase 4: Configuration & Wiring

- Update the harness configuration (e.g., `dsh.config.ts` or the web UI settings) to enable the new plugin.
- If it's a UI plugin, identify which component or layout file in `apps/web` needs to be updated to render the file tree sidebar.

### Phase 5: Verification

- Run a test command to prove it works (e.g., use the new tool to list the files in the current directory, or read a specific file).
- Report success and provide a brief summary of what was added.

## STARTING COMMAND

Acknowledge this plan, state your understanding of the constraints, and immediately begin **Phase 1: Reconnaissance** by listing the root directory and reading `package.json`.
