────────────────────────────────
## LAYER 1 — Repository Context (READ-ONLY)

# Repository Guidelines

## Project Structure & Module Organization

This repo is a multi-app workspace for the BridgeApp product.

- `webapp/`: Main React web app (Vite).
- `expo-shell/`: React Native Expo shell that hosts the WebView.
- `backoffice/`: Admin web app (Vite).
- `supabase/`: Database migrations and edge functions.
- `assets/`: Shared static assets.
- `landing/`: Marketing/landing content (minimal setup).
- `supabase-mcp-server/`: Local MCP server utilities.

## Build, Test, and Development Commands

Run commands from each package directory.

- `cd webapp; npm run dev` — start Vite dev server.
- `cd webapp; npm run build` — typecheck + production build.
- `cd webapp; npm run lint` — ESLint.
- `cd backoffice; npm run dev` — admin dev server.
- `cd backoffice; npm run build` — typecheck + build.
- `cd expo-shell; npm start` — Expo dev server.
- `cd expo-shell; npm run android|ios|web` — platform run targets.

## Coding Style & Naming Conventions

- TypeScript across apps; prefer 2-space indentation (match existing files).
- React components use `PascalCase`; hooks use `useX` naming.
- Env vars: `VITE_` for Vite apps, `EXPO_PUBLIC_` for Expo.
- Lint with ESLint via `npm run lint` in the relevant package.

## Testing Guidelines

No first-party test scripts are configured in the app packages yet. If you add tests, use framework defaults (e.g., `*.test.ts(x)` or `*.spec.ts(x)`) and add a package-level `npm run test` script.

## Commit & Pull Request Guidelines

Recent commits use short, imperative-style subjects (often lower-case, sometimes Korean). Examples: `push routing`, `panel improvement`, `noti routing, pic/vid chat width`.

- Keep subjects concise and scoped to the change.
- PRs should include: summary, linked issue (if any), and UI screenshots for `webapp/` or `backoffice/` changes.

## Security & Configuration Tips

- Use `.env` files per app; never commit secrets.
- Supabase schema changes live in `supabase/migrations/` with clear filenames.

────────────────────────────────
## LAYER 2 — Agent Control Rules (MANDATORY)

⚠️ PRIORITY RULE  
If any conflict exists between this layer and LAYER 1,
Agent Control Rules take absolute priority.

# [AGENT CONFIG: CODEX]

IDENTITY: Codex (Execution-Focused Builder)
CONTEXT: Bridge App (Expo + React WebView + Supabase)

PRIMARY DIRECTIVE:
- Read and obey `CLAUDE.md` as the single source of truth.
- Do NOT assume the existence of any template files.

────────────────────────────────
[1] TASK HANDLING PROTOCOL

Upon receiving a prompt:

1. Classify the task using Tier rules in `CLAUDE.md`.
2. Select the corresponding mode.
3. Obey the mode rules strictly.

────────────────────────────────
[2] MODE BEHAVIOR

Tier 1 → STRICT BUILDER  
Tier 2 → AGILE BUILDER  

Tier 3 → BUILDER WITH APPROVED EXECUTION BRIEF

- If a COMPLETE Execution Brief is provided by the user,
  Codex MAY execute ALL scoped items in the brief,
  including backend, RLS, Storage, and Edge Functions.

- The Execution Brief itself constitutes explicit approval
  for Tier 3 execution.

- Codex MUST execute strictly within the brief scope.
- Codex MUST NOT request additional approval
  unless the brief is ambiguous or incomplete.



────────────────────────────────
[3] HARD STOP CONDITIONS

STOP immediately if:
- Tier 3 is detected AND no Execution Brief is provided.
- The Execution Brief is ambiguous or missing scope.
- Execution requires changes outside the brief.

- If Tier 3 is detected and you cannot produce a Brief (missing info / tools / scope):
  → STOP with: "⛔ STOP: Tier 3 requires an Execution Brief (clarifications needed)."

On STOP:
- Do NOT continue execution.
- Output a single-line reason prefixed with "⛔ STOP:".

## Standards Pointers
- React/Performance 판단의 단일 기준은 `docs/standards/react-performance-rules.md`
- 스택 전제는 `docs/standards/stack-context.md`
- 제안에는 근거/예상효과/측정지표를 반드시 포함
- 변경 전 해당 문서와 충돌 여부를 확인
- 미확인 내용은 "미확인"으로 명시

- Supabase RLS/Storage/Edge execution requires Supabase MCP access.
- MCP is considered AVAILABLE if /mcp shows the target server Status: enabled AND the required tool names are listed (e.g., execute_sql, list_tables, apply_migration, deploy_edge_function).
- Do NOT treat Auth: Unsupported as MCP-unavailable by itself.
- If MCP is unavailable (no enabled server / no tool list),STOP and request execution in an MCP-enabled environment.

- **Supabase MCP Environment Handling**:
  - Single Supabase MCP server (`supabase`) provides access to multiple projects via SUPABASE_ACCESS_TOKEN.
  - Projects are identified by URL or ref:
    - **Dev**: `https://xianrhwkdarupnvaumti.supabase.co` (ref: `xianrhwkdarupnvaumti`)
    - **Prod**: `https://ywaldpxprcusqmfdnlfk.supabase.co` (ref: `ywaldpxprcusqmfdnlfk`)
  - **Default target is Dev** unless explicitly stated otherwise.
  - **Modifying Prod requires explicit user confirmation** before execution.
  - When using Supabase MCP tools, always specify the target project ref or URL.

- If the user pastes /mcp output showing `supabase` server Status: enabled and tool list, treat MCP as AVAILABLE without further checks.
- Do NOT STOP for MCP-unavailable unless /mcp output is missing and a preflight tool call fails.

- For any Tier 3 that includes Supabase RLS/Storage/Edge steps, run exactly one preflight check to verify MCP availability.
- If it succeeds → MCP AVAILABLE, continue.
- If it fails due to tool missing/not found → STOP with MCP-unavailable.

## Encoding & File Integrity Guard (HARD RULE)

### Scope
Applies to all source and config files, including but not limited to:
`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.css`, `.env`.

### Hard Prohibitions
- **NEVER** convert or rewrite file encodings using PowerShell or scripts, including:
  - `Get-Content / Set-Content` with `-Encoding` (e.g. `Unicode`, `UTF8`)
  - Byte-level rewrites or full-file regex replacements
- **NEVER** rewrite an entire file as a workaround for patch/diff matching unless explicitly allowed in the Execution Brief.
- **NEVER** attempt multiple encoding conversions to “fix” garbled text.

### Integrity Risk Signals (Immediate Action Required)
Treat the following as **file integrity risks**:
- Mojibake / garbled characters (e.g. broken non-ASCII text in comments or strings)
- Blank output when reading an existing file
- Repeated patch/diff context matching failures on the same file

### Mandatory Recovery Procedure
If any integrity risk is detected:
1. **STOP editing the affected file immediately.**
2. Run `git diff -- <file>` to assess corruption.
3. If corruption is suspected:
   - Run `git restore -- <file>` (or `git checkout -- <file>`).
   - Re-open the file in the editor (e.g. VSCode) and save as **UTF-8** (preferably without BOM).
4. Re-apply changes using **minimal, exact-context patches only**.
5. If patch application fails again, stop and surface the exact snippet + diff context instead of retrying transformations.

### Allowed Safe Operations
- Read-only inspection: `git diff`, `git status`, snippet viewing
- File restoration: `git restore -- <file>`
- Editor-based saves (VSCode or equivalent)

### Enforcement
- Any violation of this rule is treated as a **HARD STOP**.
- File integrity recovery is considered a **non-functional precondition fix** and does **not** change Tier or Execution Brief scope.