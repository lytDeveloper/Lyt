# CLAUDE.md
# Development Constitution — Bridge App

This document is the **absolute development constitution** for Bridge App.  
All models (Opus, Codex, Sonnet, Haiku) **must strictly adhere** to this document.  
The default behavior is **STOP, not GUESS**.

────────────────────────────────

## 0. Project Context (Invariants)

**Lyt App** - A hybrid mobile app connecting brands, artists, creatives, and fans

| App | Framework | UI | State | Backend |
|-----|-----------|-----|-------|---------|
| webapp | Vite + React 19 + TS | MUI 7 | Zustand + TanStack Query | Supabase |
| backoffice | Vite + React 19 + TS | Ant Design 5 | - | Supabase |
| expo-shell | Expo 54 + RN 0.81 | - | AsyncStorage | Supabase |

**Architecture**: WebView-based hybrid app. expo-shell loads webapp in a WebView and provides native feature bridges (OAuth, push notifications, secure storage).

**Security Invariants**:
- All DB access must comply with RLS
- Secret keys must never exist on the client
- Payments and authentication are handled server-side only


────────────────────────────────

## 1. Task Tier Classification (MANDATORY)

Before starting any task, you **must classify it into one Tier**.

### Tier 1 — Simple Task
- Typos, text changes
- Minor style adjustments (colors, spacing)
- Logs or comments
- Single file, isolated edits

**Process**: No planning phase → Execute immediately

### Tier 2 — Standard Feature
- Isolated component or screen
- Standard CRUD following existing patterns
- Local UI state logic
- No global impact

**Process**: Agile reasoning → Self-review before output

### Tier 3 — Critical Architecture (AUTO-TRIGGER)

- If Opus is unavailable (quota/outage), an Architect-grade fallback may produce the Execution Brief, but still MUST output brief only and no code.

If **any** of the following apply, classify as Tier 3:
- Payments, authentication, RLS, secret keys, personal data
- Global state or shared utilities
- WebView ↔ Native bridge protocol changes
- DB schema or migrations
- Complex transactions
- New libraries or unfamiliar technologies

**Process**:
1. ARCHITECT mode only
2. Create complete EXECUTION BRIEF
3. No code generation
- An approved Execution Brief serves as explicit authorization
for all Tier 3 work defined within its scope.
────────────────────────────────

## 2. Model Assignment by Tier

| Tier | Assigned Model | Role |
|------|----------------|------|
| Tier 1 | Haiku / Codex | STRICT BUILDER |
| Tier 2 | Sonnet | AGILE BUILDER |
| Tier 3 | Opus | ARCHITECT |

> [!CAUTION]
> Codex must not perform Tier 3 work without an approved Execution Brief.

────────────────────────────────

## 2.1. Codex MCP Integration

**Available Models**:
- `gpt-5.2-codex` - Stable version
- `gpt-5.3-codex` - Latest version (recommended)

**Reasoning Level Configuration**:

Use the `config.reasoning_effort` parameter to control reasoning depth:

| Level | Use Case | Characteristics |
|-------|----------|-----------------|
| `low` | Simple tasks | Fast execution, minimal reasoning |
| `medium` | Standard tasks | Balanced speed and reasoning |
| `high` | Complex tasks | Detailed reasoning with explanations |
| `xhigh` | Critical tasks | Thorough validation and verification |

**Recommended Settings by Tier**:
- Tier 1: `medium` (fast execution)
- Tier 2: `high` (balanced reasoning)
- Tier 3: `xhigh` (thorough verification required)

**Usage Example**:

```typescript
mcp__codex__codex({
  model: "gpt-5.3-codex",
  config: {
    reasoning_effort: "xhigh"
  },
  prompt: `[Execution Brief content in Korean]

MODE: STRICT BUILDER
- Modify only specified files
- No refactoring
- Code only output

[Detailed implementation instructions]`,
  cwd: "/path/to/project",
  sandbox: "workspace-write",
  approval_policy: "on-request"
})
```

**Workflow: Execution Brief → Codex**:
1. Architect (Opus/Sonnet) creates Execution Brief in Korean
2. User reviews and approves the brief
3. Architect invokes Codex MCP with approved brief
4. Codex executes in STRICT BUILDER mode
5. Architect reviews and reports results

────────────────────────────────

## 3. Operation Modes (ENFORCED)

### MODE: ARCHITECT
- Risk and architecture analysis
- Clarification questions when needed
- **No code writing**
- Output: Execution Brief only

### MODE: AGILE BUILDER
- Output short execution plan
- Implement following existing patterns
- Self-review before final output

### MODE: STRICT BUILDER
- Modify **only** specified files/lines
- No refactoring without explicit instruction
- Output: **Code only** (no explanations)

────────────────────────────────

## 4. Execution Brief (Tier 3 ONLY)

Execution Brief is a **command, not a suggestion**.

> [!IMPORTANT]
> **Execution Brief must be written in Korean (한글)** for team communication clarity.

**Rules**:
- Create new one for each task
- Only explicitly scoped items are allowed
- Anything not listed is forbidden
- No ambiguous language
- **Must be written in Korean**

**Required Sections**:
- Goal & Critical Path
- Scope of Change (Allowed / Forbidden)
- Implementation Plan (Diff-focused)
- Constraints & Invariants
- Risk & Validation Checklist
- Non-Goals

────────────────────────────────

## 5. Scope Enforcement Rules

- Files not explicitly listed are **READ-ONLY**
- No implicit file discovery
- No "small refactoring while we're here"
- No out-of-scope formatting/linting

**If scope expansion is needed → STOP and escalate**

────────────────────────────────

## 6. 🚫 Build-Related Prohibitions (ABSOLUTE)

> [!WARNING]
> The following changes are **absolutely forbidden** unless explicitly requested by the user

- Vite's `manualChunks` configuration
- Rollup's chunk splitting rules
- Vendor chunk splitting logic for React, Emotion, MUI, Router, etc.
- Library grouping/restructuring during build
- ESBuild/SWC/webpack evaluation order changes

**Potential issues from violations**:
- `Cannot access 'React' before initialization`
- Runtime crashes occurring only in Vercel build environment
- Undebugable abnormal vendor chunk generation

**Principle**: Stability > Performance optimization

────────────────────────────────

## 7. Stop & Escalation Rules (HARD STOP)

**STOP immediately** in the following cases:
- Tier increases during execution
- Scope exceeds allowed files/logic
- Requirements become ambiguous
- Security, RLS, or secret key exposure risks detected

**Do not continue after STOP.**

────────────────────────────────

## 8. Quick Reference

### Quick Start Commands

```bash
# webapp (Main Application)
cd webapp && npm install && npm run dev    # http://localhost:5173

# backoffice (Admin Dashboard)
cd backoffice && npm install && npm run dev  # http://localhost:5174

# expo-shell (Native Container)
cd expo-shell && npm install && npm start
```

### Routing (webapp)

Routing configuration: `webapp/src/main.tsx`

- Public: `/login`, `/auth/callback`, `/banned`
- Protected: `/home`, `/magazine/:id`, `/explore`, `/lounge`
- Onboarding: `/onboarding/nickname`, `/onboarding/welcome`, `/onboarding/profile`

### WebView Bridge Communication

```typescript
// webapp → expo-shell
window.ReactNativeWebView?.postMessage(JSON.stringify({
  type: 'SESSION_UPDATE',
  session: { access_token, refresh_token, expires_at, user }
}));
```

────────────────────────────────

## Standards Pointers
- The single source of truth for React/Performance decisions is `docs/standards/react-performance-rules.md`
- Stack assumptions are in `docs/standards/stack-context.md`
- Proposals must include rationale/expected effects/metrics
- Check for conflicts with these documents before making changes
- Mark unverified content as "unverified"

## Supabase Environment Handling

> [!CAUTION]
> **Development (dev) and production (prod) environments must be strictly distinguished.**

**Project Identification**:
- **Dev**: `https://xianrhwkdarupnvaumti.supabase.co` (ref: `xianrhwkdarupnvaumti`)
- **Prod**: `https://ywaldpxprcusqmfdnlfk.supabase.co` (ref: `ywaldpxprcusqmfdnlfk`)

**Default Rules**:
- All work without explicit specification targets the **Dev environment**
- **Prod environment** work requires explicit user approval
- When using Supabase MCP, always verify the target project URL/ref before proceeding

**For Tier 3 Work**:
- Specify target environment (dev/prod) in the Execution Brief
- Prod environment changes require a separate approval section

## 9. Reference Documents

Refer to separate documents for detailed technical guides and checklists:

| Document | Target | Content |
|----------|--------|---------|
| [REFERENCE_TECHNICAL.md](./REFERENCE_TECHNICAL.md) | Sonnet/Opus | Services, Hooks, Performance Optimization |
| [REFERENCE_CHECKLIST.md](./REFERENCE_CHECKLIST.md) | All Models | Release Checklist, UI/UX Rules |

────────────────────────────────

**Violating rules is failure.**