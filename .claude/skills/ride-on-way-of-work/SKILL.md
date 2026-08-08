---
name: ride-on-way-of-work
description: "Oren's canonical three-stage delivery pipeline for RideOn. Load at the START of any party-mode, spec, or handoff session so the deliverable lands at the RIGHT layer. Triggers whenever the task is a triage/design discussion (party mode), a spec session, or preparing a handoff for a colleague — or whenever Oren says 'party mode', 'spec session', 'handoff', 'prompt for my colleague', or 'no implementation'. Defines exactly what each stage produces so sessions stop handing back the wrong-layer artifact."
---

# RideOn — Oren's Way of Work (Delivery Pipeline)

The single source of truth for how Oren runs feature work on RideOn. **Read this before producing any deliverable.** The recurring failure this skill prevents: a session hands back the *wrong layer* — e.g. writing the colleague's implementation prompt when the ask was a prompt for a spec session. Get the layer right first, everything else follows.

## The three stages (never collapse them)

```
STAGE 1  Party mode   →  deliverable: a PROMPT FOR A SPEC SESSION (that Oren runs)
STAGE 2  Spec session →  deliverable: SPEC.md + companions, INCLUDING the colleague implementation prompt
STAGE 3  Colleague    →  runs the implementation prompt cold → code on a new public branch → PR
```

Each stage's deliverable is the **input to the next stage**, not the stage after it. A party-mode session must not produce code, and must not produce the colleague implementation prompt — it produces the prompt that Oren feeds into `bmad-spec`, and `bmad-spec` produces the colleague prompt.

### Stage 1 — Party mode (`bmad-party-mode`)
- **Purpose:** triage the problem, surface options, let the room clash, drive Oren's decisions. Investigate against live code/DB first (this room's rule: *verify before designing*).
- **Mode:** **No implementation.** 80/20 — get to the locked decisions, don't over-explore.
- **Deliverable:** ONE file — a **spec-session prompt** named `*-SPEC-SESSION-PROMPT.md`, written under `_bmad-output/party-mode/` (or the relevant specs folder). It is addressed to a future `bmad-spec` session Oren will run, and it must:
  - state the Why, the locked capabilities/decisions, constraints, non-goals, success signal;
  - reference the exact files/endpoints verified during the party;
  - **explicitly instruct the spec session that a required companion output is the colleague implementation prompt** (see Stage 2);
  - carry the "Colleague execution rules" (below) so they survive into Stage 2.
- **Do NOT** in Stage 1: write code, write the colleague implementation prompt directly, or offer a keepsake / session-summary HTML (Oren never wants these — waste of tokens).

### Stage 2 — Spec session (`bmad-spec`, run by Oren)
- **Purpose:** distill the Stage-1 prompt into the canonical machine contract.
- **Deliverable:** `SPEC.md` (five-field kernel: Why, Capabilities, Constraints, Non-goals, Success signal) + companions, **and a required companion `implementation-prompt.md`** — the self-contained goal prompt the colleague runs cold. The spec session does NOT implement.
- The implementation prompt must embed the Colleague execution rules verbatim.

### Stage 3 — Colleague implementation
- The colleague runs `implementation-prompt.md` cold, with no access to this conversation. It must stand alone: full context, file paths, definition of done.
- Output: code on a **new branch off `main`**, pushed public, PR opened.

## Colleague execution rules (standing — must appear in every implementation prompt)
- New feature branch off `main`; never commit to `main`; never merge/integrate or delete branches without Oren's explicit approval; before any integration confirm no other session is active in the tree.
- Push everything to the **public** remote (`git push -u origin <branch>`) and open a PR against `main` — nothing left only local.
- **Investigate first:** read the current file + the endpoint/proc it consumes before editing; mark verified vs inferred; flag path/spec corrections instead of silently fixing.
- Respect the stated tech boundary (e.g. "frontend-only — no `.cs`, no procs"). If work seems to need backend, stop and raise it.
- After backend changes: `dotnet build` in `RideOnServer/`, then grep for call paths that bypass the changed logic. For DB writes: follow `ride-on-live-db-ops` — show exact SQL, confirm, re-read after.
- Frontend changes: `npm run lint` + `npm run build` in `RideOnClient/rideon-client/web` before the PR.

## Companion skills to load
- `ride-on-system-knowledge` — schema, roles, class taxonomy, conventions (any RideOn task).
- `ride-on-live-db-ops` — the live-DB protocol, for any read/write/proc work.

## Artifact naming & locations (keep consistent)
- Stage 1 output: `_bmad-output/party-mode/<topic>-SPEC-SESSION-PROMPT.md` (a BRIEF alongside it is optional, not required).
- Stage 2 outputs: `_bmad-output/specs/spec-<topic>/SPEC.md`, companions, and `implementation-prompt.md`.
- Memory: after each session, top up the party memlog and add/update a `project_*` memory + `MEMORY.md` pointer.

## Quick self-check before returning a deliverable
1. **Which stage am I in?** If party mode → my output is a *spec-session prompt*, not code and not the colleague prompt.
2. **Did I implement anything?** In Stage 1/2 the answer must be no.
3. **Does my Stage-1 prompt tell the spec session to emit the colleague implementation prompt?** It must.
4. **Are the Colleague execution rules carried through?** New branch, public, PR, tech boundary, verify-first.
5. **Did I avoid keepsakes / summary HTML?** Oren never wants them.
