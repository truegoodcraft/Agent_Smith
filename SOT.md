# Source of Truth (SoT): Agent Smith

## 1. System Purpose

Agent Smith is a private, single-operator reasoning bridge between Discord and a local Ollama runtime.

Agent Smith exists to:
- Accept operator input from Discord.
- Build bounded conversation context.
- Request model inference from Ollama.
- Stream responses back to Discord.

Agent Smith is a controlled reasoning bridge and a personal AI console.

Agent Smith is not:
- A public bot.
- A multi-user service.
- An autonomous agent.
- A self-modifying system.

## 2. Architectural Boundaries

Agent Smith is defined by five layers. Each layer has fixed responsibilities.

### 2.1 Interaction Layer (Discord)
Responsibilities:
- Receive commands and chat input from the operator.
- Deliver streamed model output to Discord.
- Enforce channel-scoped interaction routing.

Non-responsibilities:
- Model inference.
- Memory policy decisions.
- Tool execution logic.

### 2.2 Orchestration Layer (Python)
Responsibilities:
- Validate and normalize inputs.
- Compose context payloads.
- Invoke Ollama inference calls.
- Coordinate streaming output.
- Apply deterministic reset behavior.
- Enforce policy gates for memory and tools.

Non-responsibilities:
- Owning persistent model memory.
- Unrestricted system control.

### 2.3 Reasoning Layer (Ollama)
Responsibilities:
- Perform text inference only.
- Return generated tokens for the provided prompt/context.

Non-responsibilities:
- State ownership.
- Persistent storage.
- Tool execution.
- External side effects.

### 2.4 Memory Layer (RAM + Disk)
Responsibilities:
- Maintain bounded per-channel short-term context in RAM.
- Persist transcripts to disk when enabled.
- Maintain future derived memory artifacts (summaries, structured state) under orchestration control.

Non-responsibilities:
- Autonomous memory mutation.
- Prompt-time policy control.

### 2.5 Tool Layer (Future)
Responsibilities:
- Execute explicitly requested, whitelisted operations only.
- Return structured outputs to orchestration.

Non-responsibilities:
- Implicit execution from free-form model output.
- Unbounded system access.

## 3. Memory Model

### 3.1 Core Rules
- Memory is channel-scoped and operator-controlled.
- Short-term memory is a bounded sliding window in RAM.
- Deterministic reset markers clear or segment active context by design.
- No persistent memory is required for current chat correctness.
- Short-term memory bounding must be deterministic and parameterized.
- Bounding must be message-count based OR token-count based.
- Unbounded short-term memory growth is prohibited.
- Bounding strategy must be explicitly defined in configuration and enforced by orchestration.

### 3.2 Ownership Rule
- The LLM never owns memory.
- Memory is injected, not inferred.

### 3.3 Persistence Rules
Current state:
- No mandatory disk-based memory store.
- No mandatory transcript persistence.

Allowed direction:
- Parallel transcript logging to disk is allowed.
- Transcript writes must be append-only and asynchronous relative to the live chat path.
- Transcript persistence must not block token streaming.

### 3.4 Future Summary Rules
- Mid-term memory is a rolling summary generated out-of-band.
- Summary generation is asynchronous and bounded.
- Summary content is injected by orchestration as explicit context.
- Default chat flow must not add extra inference calls for summary generation inline.

### 3.5 Future Structured State Rules
- Long-term memory is structured state, not raw conversational replay.
- Structured state fields are explicitly defined and versioned.
- Structured state updates are deterministic and auditable.
- Structured state is never modified directly by unconstrained model output.

## 4. Tooling Philosophy

- Tools are optional and command-driven.
- Tool usage must be explicit, never implicit.
- Tool invocation must be operator-initiated or policy-gated.
- Tool results are data inputs to orchestration, not autonomous directives.
- Default chat mode is direct reasoning via Ollama without tool execution.

## 5. Performance Constraints

- Minimal latency in the chat path is mandatory.
- Default chat flow must remain: one user request, one model stream.
- No additional LLM calls are allowed in default chat flow.
- Memory processing beyond sliding-window updates must run asynchronously.
- Transcript logging must be non-blocking for streamed response delivery.
- Future tool reasoning is on-demand only and excluded from default fast chat.

## 6. Security Constraints

- No raw shell execution by model output.
- No direct file system access by the LLM.
- No direct network autonomy by the LLM.
- All tools must be explicitly whitelisted and parameter-constrained.
- No self-modifying code paths.
- No background uncontrolled loops.
- All privileged operations require explicit orchestration control.

## 7. Execution Flow

### 7.1 Current Flow
Discord input -> Context assembly -> Ollama inference -> Stream response -> Store bounded context in RAM

Canonical current sequence:
1. Receive operator message from Discord.
2. Build per-channel bounded context window.
3. Send request to Ollama.
4. Stream tokens back to Discord.
5. Append interaction to in-memory channel context.

### 7.2 Future Flow
Discord input -> Context assembly -> Ollama inference -> Stream response
-> async transcript append (disk)
-> async summary update (future)

Canonical future sequence:
1. Receive operator message from Discord.
2. Build per-channel bounded context window.
3. Send request to Ollama.
4. Stream tokens back to Discord.
5. In parallel, append transcript asynchronously.
6. In parallel, schedule bounded summary update asynchronously (when enabled).
7. Inject approved memory artifacts in subsequent requests.

## 8. Non-Goals

Agent Smith does not target:
- Multi-tenant user management.
- Public SaaS deployment patterns.
- Autonomous task execution.
- Autonomous internet browsing.
- Self-updating or self-rewriting runtime behavior.
- Unbounded background agent loops.
- General-purpose system administration by model output.

## 9. Allowed Evolution Path

### 9.1 Allowed Expansions
- Direct-to-Ollama fast chat optimization.
- Removal of rate limiting controls when operationally acceptable.
- Larger but bounded context windows.
- Asynchronous transcript logging to disk.
- Layered memory architecture:
  - Short-term: sliding window.
  - Mid-term: rolling summary.
  - Long-term: structured state.
- Explicit, whitelisted tool invocation layer.
- Optional agent mode toggle with strict policy gating.

### 9.2 Forbidden Expansions
- Autonomous internet browsing without explicit command and policy gate.
- Self-updating or self-modifying logic.
- Uncontrolled background loops.
- Implicit tool execution from plain conversational text.
- Removal of orchestration authority over memory or tools.

## 10. Governance and Precedence

- This document is normative for architecture and behavior.
- Future changes must conform to these constraints unless this SoT is explicitly amended.
- In case of conflict, this SoT overrides implementation convenience.
- Any approved expansion must preserve the identity, performance, and security constraints defined above.
