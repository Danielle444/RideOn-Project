# CAP-2 / CAP-3 — backend hygiene removal list (file anchors)

Companion to `SPEC.md`. Exact removal targets for #34 (CAP-2) and #35 (CAP-3), read against repo source 2026-07-29. Line numbers are as read this session — re-anchor on the surrounding text, not the raw numbers, when applying.

## CAP-2 (#34) — `DBServices.Connect()` DB-topology prints

**File:** `RideOnServer/DAL/DBServices.cs`

Remove these four lines (currently 24–27), inside `protected NpgsqlConnection Connect(string conStr)`, between `var builder = new NpgsqlConnectionStringBuilder(cStr);` and `return new NpgsqlConnection(cStr);`:

```csharp
            Console.WriteLine("=== DB HOST === " + builder.Host);
            Console.WriteLine("=== DB PORT === " + builder.Port);
            Console.WriteLine("=== DB USER === " + builder.Username);
            Console.WriteLine("=== DB DATABASE === " + builder.Database);
```

Notes:
- After removal, `builder` is still used only to build the connection — wait, it is not used elsewhere in this method. **Check:** once the four prints are gone, the local `var builder = new NpgsqlConnectionStringBuilder(cStr);` becomes unused. Remove that line too (it exists solely to feed the prints), so no dead local remains and no new "unused variable" warning is introduced.
- The method returns `new NpgsqlConnection(cStr)` from the raw `cStr`, not from `builder`, so removing `builder` is safe.
- Recommended shape: remove entirely (no debug-flag convention exists in this codebase to gate them behind). See SPEC Open Question if Oren prefers a gated diagnostic instead.
- This is the priority of Part B (security-flavoured log leak).

## CAP-3 (#35) — `[ISSUE-C]` debug lines + orphaned helper

### File: `RideOnServer/Controllers/ClassesInCompetitionController.cs`

Two blocks, each a `TEMP DEBUG (Issue C)` comment + a two-line `Console.WriteLine`:

- **CreateClassInCompetition** (currently 134–136), remove:
```csharp
                // TEMP DEBUG (Issue C): remove once the drop point is confirmed.
                Console.WriteLine($"[ISSUE-C] CreateClassInCompetition request.Prizes count={request.Prizes?.Count ?? -1} " +
                    $"types=[{string.Join(",", (request.Prizes ?? new List<ClassPrizeItem>()).Select(p => p.PrizeTypeId))}]");
```
- **UpdateClassInCompetition** (currently 192–194), remove:
```csharp
                // TEMP DEBUG (Issue C): remove once the drop point is confirmed.
                Console.WriteLine($"[ISSUE-C] UpdateClassInCompetition request.Prizes count={request.Prizes?.Count ?? -1} " +
                    $"types=[{string.Join(",", (request.Prizes ?? new List<ClassPrizeItem>()).Select(p => p.PrizeTypeId))}]");
```

Leave the legitimate `catch` logging (`Console.WriteLine($"Error in CreateClassInCompetition: {ex.Message}");`) in place — that is not `[ISSUE-C]` and is the codebase's normal error-logging convention.

### File: `RideOnServer/DAL/ClassInCompetitionDAL.cs`

In `SaveClassPrizes` (currently ~317–353), remove the four `[ISSUE-C]` lines and the `TEMP DEBUG` comment, keeping the real logic (`DeleteClassPrizeByClassId`, the loop, and the `usp_UpsertClassPrize` upsert):

- Line 323 comment `// TEMP DEBUG (Issue C): remove once the drop point is confirmed.`
- Lines 324–325 `Console.WriteLine($"[ISSUE-C] SaveClassPrizes …")`
- Line 328 `Console.WriteLine($"[ISSUE-C] after delete-all, classprize count={CountClassPrizes(...)}");`
- Line 334 `Console.WriteLine($"[ISSUE-C] skipping incomplete prize row: …");` (keep the `continue;` — the guard `if (!prize.PrizeTypeId.HasValue || !prize.PrizeAmount.HasValue) { continue; }` stays; only the log line inside it goes)
- Line 351 `Console.WriteLine($"[ISSUE-C] after upsert prizeTypeId={prize.PrizeTypeId.Value}, classprize count={CountClassPrizes(...)}");`

**Also remove the now-orphaned helper** (currently 355–364), including its `TEMP DEBUG` comment:

```csharp
        // TEMP DEBUG (Issue C): remove once the drop point is confirmed.
        private int CountClassPrizes(int classInCompId, NpgsqlConnection connection, NpgsqlTransaction transaction)
        {
            using (NpgsqlCommand command = new NpgsqlCommand(
                "SELECT COUNT(*) FROM classprize WHERE classincompid = @classInCompId", connection, transaction))
            {
                command.Parameters.AddWithValue("@classInCompId", classInCompId);
                return Convert.ToInt32(command.ExecuteScalar());
            }
        }
```

Justification for removing `CountClassPrizes`: grep found exactly 3 references, all in this file — the definition plus the two `[ISSUE-C]` callers (lines 328 and 351) that are being removed. Once those two go, the helper has no callers and is dead code.

## Verify (after CAP-2 + CAP-3 edits)

Run in `RideOnServer/`:

```bash
dotnet build
```

- Expect 0 errors and the pre-existing ~171 nullable warnings (unrelated). Confirm the three touched files (`DBServices.cs`, `ClassesInCompetitionController.cs`, `ClassInCompetitionDAL.cs`) introduce no *new* warnings — in particular no "unused variable"/"unused method" warning, which is why `builder` (CAP-2) and `CountClassPrizes` (CAP-3) are removed rather than left behind.

Then grep the repo (should each return nothing):

```bash
grep -rn "ISSUE-C" RideOnServer
grep -rn "CountClassPrizes" RideOnServer
grep -rn "=== DB HOST" RideOnServer
```

## Commit discipline

- **Part A (CAP-1, proc behaviour change)** — its own commit (migration file + rewritten repo proc file). No `.cs` change.
- **Part B (CAP-2 + CAP-3, log-noise cleanup)** — a separate commit. `dotnet build` green before committing.
- One feature branch off `main`; no merge to `main` without Oren's approval.
