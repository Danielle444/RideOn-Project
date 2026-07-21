---
name: ride-on-live-db-ops
description: "Use this skill in ANY claude.ai conversation touching the RIDE ON equestrian system: live Supabase DB reads/writes, applying or verifying stored procedures, reviewing Claude Code reports, drafting prompts or replies for Claude Code, QA triage of bugs found while testing, or coordinating a deploy. Trigger even if the request seems small (\"check this proc\", \"draft a prompt for Claude Code\", \"why does the form show X\") — this skill defines claude.ai's role and safety protocol in the RideOn workflow. Load ride-on-system-knowledge alongside it for system facts."
---


# RIDE ON — Claude.ai Operating Protocol

Claude.ai is the **live database side and coordination hub** of the RideOn
workflow. Claude Code does all repo work and, since 2026-07-20, ALSO has
live DB access through the Supabase MCP — the "Claude Code has no DB
credentials" split below is HISTORICAL. Reads are free on both sides;
Claude Code shows every write as exact SQL and confirms with Oren before
running it. Treat the division-of-labor table as a description of who
usually does what, not as a capability boundary.
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
   For procs that WRITE, smoke test with zero side effects via a `DO $$` block:
   insert test rows, call the proc, capture counts into variables, then
   `RAISE EXCEPTION 'SMOKE_RESULT a=% b=%'` — the exception carries the
   results out in the error message AND rolls everything back. Always confirm
   the rollback with a follow-up read. One trap inside this pattern: `now()`
   is frozen per transaction, so computedat-style columns won't visibly move
   between two calls in the same DO block — not a bug, each production call
   is its own transaction.
   Postgres reports only the FIRST return-type mismatch per call (error
   42804). After fixing one, rerun the smoke query — more mismatches may be
   masked behind it. Real case: usp_GetPaidTimeRequestsForAssignment had a
   timestamp/timestamptz mismatch at column 4 hiding seven varchar-vs-text
   cast gaps; two migrations were needed. Iterate fix → smoke → fix until
   real rows return. A smoke query returning zero rows is NOT a pass: first
   find data known to exist, and exercise designed filters (e.g. Assigned
   requests only return when slot ids are explicitly passed).
   Exception to zero-rows-is-not-a-pass: when empty output IS the designed
   behavior (e.g. a read proc for a competition with no cache rows), prove
   the empty case AND separately prove real rows return for known data —
   both, never just one.
6. **Close the loop:** give Oren a message for Claude Code containing the
   EXACT deployed SQL so repo files are reconciled to match live,
   character for character. Note: `pg_get_functiondef` returns the stored
   body with its original indentation — a chat paste that arrives flattened
   is a transport artifact, and Claude Code re-indenting to repo style may
   actually MATCH live (confirmed once in Phase 6); verify against the
   functiondef output, not the paste.

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

Features designed to fail silently (e.g. PredictionService swallows all
exceptions so saves never break) CANNOT be verified through the UI — a
successful save proves nothing about the silent part. Verify via DB reads
(fresh rows/timestamps) or backend logs, always. Corollary for attribution:
a fresh batch can be pinned to local vs deployed backend by combining batch
timestamps with knowledge of which backend was running at that moment.

**Three-path verification for silent READ features** (established in Phase
6, prediction display — the read-side twin of the rule above, since a blank
cell looks identical whether the feature degraded gracefully or never ran):

1. Positive path — compare displayed values against DB ground truth fetched
   here first, including any derived math (e.g. band = predicted ± rmse,
   then rounding), not just raw values.
2. Per-row absence — SELECT the exact row first with full precision
   (`::text` casts on numerics/timestamps), DELETE it, user refreshes and
   confirms that row alone degrades while siblings hold, INSERT it back
   identically, prove the restore with a read.
3. Full failure — DROP the proc live, user refreshes, the page must render
   completely normally (no toast, nothing blocked), recreate immediately
   from the exact deployed SQL held in-conversation, re-verify with a read.

DROP-testing live is safe ONLY while the feature branch is unmerged (the
deployed backend never calls the new proc). Each restore happens
immediately after its observation — never batch restores to the end.

## QA tracker entry format

When drafting tracker entries, output a JSON array (wrapped in `[]`) even
for a single entry. Latest issue number: **45** (37 update-model recompute
button, 38 wizard prediction display, 39 duplication-hook verification
blocked on 36, 41 competitionday entity parked, 45 day origin ignores a real
starttime when null-orderInDay classes sort ahead of it).
NOTE: entries drafted Claude-Code-side on 2026-07-21 were accepted into the
tracker under DIFFERENT numbers than drafted — the schedule-serialization and
registration-window items were drafted as 40 and 42 but renumbered on entry,
and the day-origin item drafted as 43 landed as 45. **Never assume a drafted
number survives; confirm the assigned number with Oren before citing it in
code comments, commit messages or skill notes.** Issue 40 is nonetheless
referenced as "iss 40" throughout the Phase 7 schedule work and commit
`a3ade7b` — that reference predates the renumbering and may point at a
different tracker row.
Fields, in this order:

- `id`: `"iss_<epoch ms>"` matching `createdAt`
- `num`: next sequential integer
- `title`: one line, imperative or descriptive
- `severity`: Low / Medium / High; `priority`: Later / Next / Now
- `layer`: Frontend / Backend / DB; `usecase`: the user flow affected
- `component`: files or areas involved
- `desc`: full narrative incl. dates of DB checks, and mark unconfirmed
  hypotheses explicitly as unconfirmed
- `status`: "Open"; `dateFound`: YYYY-MM-DD; `relatedTo`: null or issue num
- `prompt`: a full paste-ready Claude Code prompt (Branch / Context / Issue /
  Symptom / Where / Expected / Instructions, investigation-first, diffs
  before applying, dotnet build, repo-only reminder). Parked features and
  tasks blocked on another issue get `""` — don't draft prompts for work
  that has no implementation decision yet.
- `promptStatus`: "drafted" when a prompt exists, "none" when it doesn't;
  `createdAt`: epoch ms; `dateResolved`: null
- `foundBy`: a PERSON (usually "Oren"), never a tool name; `assignee`: ""

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
- Voice-to-text flips NUMBERS too, not just words: "sixty three" arrived for
  "thirty six" (a QA issue number). When a number she cites contradicts the
  session's own established state, flag the contradiction and confirm before
  using it anywhere.
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
- **Git protection hook**: `.claude/hooks/block-git.ps1` in the repo blocks
  Claude Code from merging, switching to main, and deleting branches —
  those require Oren's own hands. When a phase reaches merge, give HER the
  exact PowerShell commands (checkout main, pull, merge --no-ff, push) and
  have Claude Code pick up the ungated follow-ups (build on main, test
  suite, branch cleanup on request). Never suggest lifting the hook when
  running the commands herself is an option. Never draft a merge instruction
  addressed to Claude Code — this was gotten wrong once (Phase 6, caused by
  a stale session skill copy missing this bullet) and corrected mid-session.
- Explicit branch gating in every phase kickoff: before Claude Code writes
  ANY file, require it to run git status/git branch, report the branch, and
  create/switch to the feature branch if needed — Oren caught work about to
  start on main once in Phase 6; make the check mandatory, not assumed.
- Multi-step phase coordination pattern that worked well (Phase 5, repeated
  successfully in Phase 6):
  investigation-first Step 1 report → claude.ai verifies live claims +
  deploys approved SQL → decisions returned as a single numbered paste-ready
  reply (credit correct analyses explicitly, put accepted design deviations
  on record) → code Step 2 → hold commit until claude.ai-verified E2E
  against a designated live test target (Draft competition with zero
  entries supports edit + delete + create in one place) → commit → Oren
  merges → production verification via one deployed-site action + a DB
  read. Bugs found mid-phase that predate the branch get triaged (DB ground
  truth first), filed to the tracker, and parked on their own branch — do
  not sidetrack the phase.

## End of session skill updates

Two skill copies exist per topic: Oren's user-global skills (claude.ai side)
and the repo's `.claude/skills/` versions (Claude Code side). The update flow,
learned the wasteful way:

- **Claude.ai CANNOT persist skill edits.** The session's `/mnt/skills` copies
  are writable but vanish when the session ends — an edit there is NOT an
  update and must never be reported as one. The only working path: produce
  the full updated SKILL.md files as downloadable outputs and have Oren paste
  them into the skill editor herself. Claude Code's side persists normally
  (repo file, docs-prefixed commit on main).
- **Present the files so Oren can actually save them.** Create the full
  updated SKILL.md files in the outputs directory and present them via file
  links, so she can open each one, view the full content, and copy it into
  the skill editor. Never deliver only a description of changes, never edit
  only the mounted copies, and never skip presenting the files. If she
  reports she cannot open or copy a delivered file, paste the full content
  as a plain fenced code block in the reply instead — whatever form she can
  actually save from wins.
- **The session's mounted skill copies can be STALE.** In the Phase 6 session
  the mounted copies were missing everything the Phase 5 session had added
  (DO $$ pattern, tracker format, git hook) — which directly caused a wrong
  merge instruction drafted for Claude Code. At session start, if the loaded
  skill lacks facts the conversation clearly assumes (issue numbers, recent
  phases), say so and ask Oren to paste the current versions (she keeps the
  last ones given to Claude Code) rather than trusting the mount.
- **Mirror, don't compress.** When the same facts live in both copies, adopt
  Claude Code's exact wording verbatim into the user-global file, then append
  claude.ai-only material (DB audit findings, tracker facts). Compressed
  "equivalent" summaries caused two extra correction rounds — fact parity is
  hard to prove between different wordings and trivial between identical
  ones.
- **Verify completeness before presenting, not after being asked.** Grep the
  final file for every fact in Claude Code's update report and the session's
  decisions; only then present. When asked "are you sure", the answer must
  come from a fresh check, not from confidence.
- Fold corrections both directions: if Claude Code independently verified
  something (e.g. a test count via --list-tests) that contradicts what it was
  told, its verified number wins and both copies get it.
- One prompt per session tells Claude Code to update the repo skill: list the
  facts to fold in, require rewriting stale statements rather than appending
  contradictions, diff before applying, docs-only commit on main.
- **The Claude Code prompt must also ASK for its own insights** — this is
  half the point of the exercise, not an optional extra: Claude Code saw
  repo-side details this session that claude.ai never did (build quirks,
  file structures, patterns that worked or fought back). Instruct it to
  review the session and add anything IT judges worth keeping, report those
  additions back explicitly, and Oren relays them so the claude.ai-side
  copies gain them too. Skill updates flow in both directions, every
  session.
- **Variant flow: Oren pastes the drafted content directly into the repo
  files herself**, instead of relaying a prompt for Claude Code to draft
  from. Confirmed in the Phase 6 end-of-session update: both SKILL.md files
  showed up already modified-but-uncommitted in the working tree before
  Claude Code was asked to act. In this variant Claude Code's job shifts
  from drafting to reviewing/verifying the pasted content against what it
  actually did that session, cleaning up paste artifacts (a stray skill-
  editor UI title line landed at the top of one file, blank lines carried
  inconsistent trailing whitespace, both files were missing a trailing
  newline at EOF), adding its own Part 2 insights, and committing. A
  session opening with unexplained modified-but-uncommitted skill files is
  this pattern, not file corruption or a stray edit to investigate.
