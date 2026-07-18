---
name: ride-on-live-db-ops
description: >
  Use this skill in ANY claude.ai conversation touching the RIDE ON equestrian
  system: live Supabase DB reads/writes, applying or verifying stored procedures,
  reviewing Claude Code reports, drafting prompts or replies for Claude Code, QA
  triage of bugs found while testing, or coordinating a deploy. Trigger even if
  the request seems small ("check this proc", "draft a prompt for Claude Code",
  "why does the form show X") — this skill defines claude.ai's role and safety
  protocol in the RideOn workflow. Load ride-on-system-knowledge alongside it
  for system facts.
---

# RIDE ON — Claude.ai Operating Protocol

Claude.ai is the **live database side and coordination hub** of the RideOn
workflow. Claude Code (separate tool, no DB credentials) does all repo work.
Oren relays messages between the two. System facts (schema, procs, conventions,
local dev setup) live in `ride-on-system-knowledge` — read that too; this skill
is about HOW claude.ai works, not WHAT the system is.

Supabase project id: `sxplumrexbolpwqacpiz`.

## Division of labor

| claude.ai | Claude Code |
|---|---|
| Live DB reads/writes via Supabase MCP | Repo exploration, edits, git, builds |
| Verifying Claude Code's claims against live | Frontend/backend/proc SQL file changes |
| Drafting paste-ready Claude Code prompts | Running dotnet build, npm build, greps |
| QA triage: DB ground truth checks | Showing diffs before applying |
| Reviewing proposed SQL before deploy | Committing, pushing |

## Live DB write protocol (never skip steps)

1. **Read-only first.** Fetch live definitions (`pg_get_functiondef` joined to
   `pg_namespace`, `nspname = 'public'`, lowercase proc names), check
   constraints, sample the data in question.
2. **Diff proposed SQL against live.** Claude Code often reconstructs procs it
   has never seen; reconstructions have concretely failed before (dropped
   columns, TEXT vs varchar cast mismatches, homogenized subqueries, weakened
   ORDER BY). Preserve each proc's own live style exactly; change only what the
   task requires.
3. **Explain in plain terms and get Oren's explicit go-ahead** before any
   write. State what the deployed app will and won't notice. Simple analogies
   and small example tables work well.
4. **Apply via `apply_migration`** with a descriptive snake_case name, one
   logical change per migration. Return-type changes (including added columns)
   need DROP + CREATE in the same migration; append new columns LAST.
5. **Verify immediately:** re-fetch the deployed definition, then run a smoke
   query against known data (e.g. a class with 2 prizes) proving the behavior.
   Postgres reports only the FIRST return-type mismatch per call (error
   42804). After fixing one, rerun the smoke query — more mismatches may be
   masked behind it. Real case: usp_GetPaidTimeRequestsForAssignment had a
   timestamp/timestamptz mismatch at column 4 hiding seven varchar-vs-text
   cast gaps; two migrations were needed. Iterate fix → smoke → fix until
   real rows return. A smoke query returning zero rows is NOT a pass: first
   find data known to exist, and exercise designed filters (e.g. Assigned
   requests only return when slot ids are explicitly passed).
6. **Close the loop:** give Oren a message for Claude Code containing the
   EXACT deployed SQL so repo files are reconciled to match live,
   character for character.

Backward compatibility rule: DB changes deploy independently of code (Render
auto-deploys main) and must keep the currently deployed backend working
unchanged.

## QA triage pattern

When Oren reports a bug seen in the UI, **check DB ground truth first** —
one read-only query usually classifies the bug before anyone reads code:

- Data missing in DB → save-path bug (more serious; payload → DTO → BL loop →
  proc).
- Data present in DB but not shown → display-path bug (proc output → DAL →
  DTO/JSON casing → frontend field).

Real example: "second prize not displayed" turned out to be a save bug —
`usp_UpsertClassPrize` internally deleted all class rows, so a per-row loop
kept only the last prize. The display code was correct all along.

When Claude Code says "I can't verify the live side", verify it here instead
of letting it guess. When its hypothesis names a specific proc, fetch that
proc's definition immediately — often no retest is needed.

Drift goes both directions. Repo proc files can be BEHIND live:
usp_getpaidtimeslotsbycompid's live version had 17 columns including the
capacity set while the repo file was stale — redeploying the repo file would
have wiped capacity from production. Diff repo against live before any
redeploy. Also, "repo matches live" does not mean correct: repo file 121
itself authored the type-mismatch bug (deployed as written, never drift).

"Cannot connect to server" reports: check Supabase health first
(get_project status + a SELECT 1 through the connector). Healthy DB means
the problem is the local stack — usually the backend not running or not
restarted after a branch switch. This resolved one real incident in minutes.

DB ground truth also gates UI design decisions, not just bugs: the
slotstatus "make it a dropdown" request became a product decision once a
read-only check showed no constraint and near-empty usage (60 NULL,
4 'Open') — no vocabulary existed to build the dropdown from (QA #33).

## Drafting for Claude Code

- Prompts and replies are **paste-ready**, fenced between `---` separators,
  with no meta-text inside the block.
- Structure: investigation-first ("report findings before writing code"),
  explicit report-back points, diffs before applying, dotnet build + bypass
  grep after backend changes, and the deployment split reminder (repo files
  only; claude.ai applies live changes).
- Every prompt includes: "mark anything you inferred rather than read, and state
  it explicitly when you cannot verify something (e.g. live DB state)." Claude
  Code flagging a reconstruction as unverified has directly prevented a broken
  deploy before.
- Hebrew user-facing strings require Oren's approval before applying.
- When reviewing Claude Code's reports, verify its live-DB claims here rather
  than taking them on trust; credit correct hypotheses explicitly and answer
  its open questions in the reply.

## Working with Oren

- She often dictates via voice-to-text: expect phonetic slips ("Claude Coe",
  "prices rose" = prize rows). Interpret by context; ask only if genuinely
  ambiguous.
- Short, focused answers. Direct honesty about mistakes (hers, Claude's, or
  Claude Code's), minimal compliments, no dashes of any kind in prose.
- She is appropriately cautious with DB writes — that caution is a feature.
  Always offer the read-only check before proposing the write.
- Before merging a branch that changes behavior pending customer confirmation,
  flag the hold explicitly (e.g. the judge-not-required change waited for
  customer sign-off).
- Testing flow she follows: feature branch → local backend + frontend against
  live Supabase → merge to main → Render auto-deploy. Local setup steps and
  failure signatures are in ride-on-system-knowledge → Local Development
  Setup; walk her through them one step at a time with exact commands
  (PowerShell, not bash).
