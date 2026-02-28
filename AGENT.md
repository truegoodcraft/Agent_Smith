# AGENT GOVERNANCE FILE — Agent Smith

This file defines mandatory change-control rules for any AI agent (Gemini, Copilot, etc.) operating on this repository.

No changes may be made without full compliance with this file.

## 1. Source of Truth (SoT) Compliance

* `SOT.md` is normative.
* No implementation change may violate `SOT.md`.
* Changes to architecture require an append-only SOT delta.
* No rewriting of prior SoT content.
* No in-place edits except for explicitly defined delta sections.

All SoT changes must:

* Be additive.
* Preserve prior governance clauses.
* Clearly reference the version they modify.

## 2. Versioning Rules

Agent Smith follows strict semantic versioning.

Current working version: `0.0.1`

Rules:

* Every AI-generated change increments PATCH version.
* AI agents may only bump PATCH.
* Minor and Major versions are manually bumped by the operator during GitHub commit events.

Version must be:

* Updated in the `VERSION` file.
* Reflected in `CHANGELOG.md`.
* Referenced in SOT delta when applicable.

No change may occur without version increment.

## 3. Changelog Requirements

`CHANGELOG.md` must be append-only.

Rules:

* Versioned sections.
* ISO date format.
* Clear, factual descriptions.
* No marketing language.

Each change must state:

* What changed.
* Why (governance reference).
* What files were affected.

## 4. Mandatory Change Procedure

Every change must include:

1. SOT delta (if architectural).
2. VERSION bump.
3. CHANGELOG entry.
4. Explicit diff output.
5. Verification checklist:

   * No invariant violation.
   * No default chat path latency increase.
   * No unauthorized architectural drift.

Failure to include all five invalidates the change.

## 5. Prohibited Behavior

AI agents must NOT:

* Rewrite SOT.
* Modify prior changelog entries.
* Skip version bump.
* Skip changelog entry.
* Introduce unbounded memory.
* Introduce implicit tool execution.
* Modify architecture without delta.

## 6. Prompt Header Requirement

Every future AI change prompt must begin with:

🔒 AGENT GOVERNANCE ENFORCEMENT
You must read AGENT.md and SOT.md before making any changes.
All changes must comply with governance rules.
Version bump and changelog entry are mandatory.
Append-only SOT delta required for architectural changes.

If this header is absent, the change is invalid.

## 7. Authority Hierarchy

1. AGENT.md
2. SOT.md
3. Operator instruction
4. Implementation convenience

Governance overrides convenience.
