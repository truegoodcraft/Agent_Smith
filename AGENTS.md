# Agent Smith Repository Governance

**Agents must read this file before modifying Agent Smith.**

## Mandatory Change Control

This repository is under strict change-control discipline. For every change to Agent Smith, without exception, the agent must execute all of the following in the same work pass:

1. **Update CHANGELOG.md** with a concrete entry describing the changes
2. **Update SOT.md** to reflect the current state of the codebase
3. **Bump the project version** everywhere it is defined
4. **Report all file changes and the version bump** in the final response

### No Exceptions

- Not for small changes
- Not for internal refactors
- Not for config-only edits
- Not for docs-only edits
- Not for security changes
- Not for cleanup/renames
- Not if the user forgets to request it

If any repository file is modified, the task is **incomplete** until CHANGELOG.md, SOT.md, and the version have also been updated.

## Versioning Policy

Version bumps follow semantic versioning:

- **Patch bump** (0.0.x): fixes, internal hardening, cleanups, doc/config alignment, compliance corrections
- **Minor bump** (0.x.0): new capability, new command surface, meaningful scope expansion, or operator-facing behavior changes
- **Major bump** (x.0.0): deliberate breaking contract changes

## Anti-Drift Rule

**Implementation and documentation must move together.**

- The repository source of truth (SOT.md) must always reflect current actual behavior.
- CHANGELOG.md must always be updated when behavior changes.
- VERSION must always be bumped when any file is modified.
- Do not claim completion if implementation changed but changelog, SOT, and version were not updated.

## Required Final Report

Every task must conclude with a concise report containing:

- Files changed
- Previous version → new version
- CHANGELOG updated: yes/no
- SOT updated: yes/no
- Governing instruction file updated: yes/no

## SOT Hierarchy

Newest SOT entries supersede all older wording. Agents must read the full SOT.md from top to bottom and treat the most recent entries as authoritative. Historical SOT deltas are preserved for audit purposes only and do not override current assertions.

## Configuration and Contracts

All configuration must be environment-driven through `config/settings.py` and `.env.example`. Public API surfaces (slash commands, Discord interactions) must not diverge from documentation. If they do, documentation moves first, then behavior is brought into alignment in the same change.

---

**Last updated:** 2026-03-09
