using FluentAssertions;
using Npgsql;
using RideOnServer.DAL;
using Xunit.Abstractions;

namespace RideOnServer.Tests
{
    // GATED live integration harness for usp_ApplyAutoScheduleV2 (V2-2): the clear/set
    // transaction, the expected-old-state guard, source/target publication, the unsafe
    // legacy-slot quarantine, the all_assigned duplicate-order probe, final-state
    // validation, allocationorigin preservation, and the movement audit rows in
    // paidtimeassignmentchange.
    //
    // Modeled on ApplySpOverlapHarness: a NO-OP (not a failure) unless
    // RIDEON_RUN_APPLY_SP_V2_HARNESS=1 is set, so it never runs during a normal
    // `dotnet test`.
    //
    // Connection-string configuration key: "ConnectionStrings:DefaultConnection"
    // (settable via the environment variable ConnectionStrings__DefaultConnection).
    // The harness NEVER prints the connection string, and never prints the message of a
    // connection exception either — only its type name — because a driver message can
    // echo connection parameters. If the key is absent the harness SKIPS before opening
    // any transaction and before creating any row.
    //
    // Safety contract (must not be weakened):
    //   * A UNIQUE per-run marker ("SMOKE_APPLY_V2_" + Guid) tags every fabricated row in
    //     every table that has a usable text column, always passed as a SQL PARAMETER
    //     (never concatenated). For `bill`, which has no such column, the inserted ids are
    //     tracked in memory and verified gone after rollback. Production schema is NEVER
    //     altered to add a marker column.
    //   * All reference ids are DERIVED read-only, BEFORE the write transaction opens, and
    //     the parent rows they point at (ranch, arena, field, systemuser, person,
    //     federationmember, horse, paidtimeslot, pricecatalog, paidtimeproduct) are READ
    //     ONLY — the harness never updates or deletes any of them. If no compatible
    //     dataset exists the harness SKIPS before creating any fixture.
    //   * A read-only PREFLIGHT confirms zero rows already carry the marker, and captures
    //     the GLOBAL paidtimeassignmentchange count, before any write.
    //   * ONE explicit transaction; it is ALWAYS rolled back in a finally block; the
    //     harness never commits. A failing outer rollback is reported explicitly without
    //     hiding the original error.
    //   * Each scenario runs inside its own SAVEPOINT, and after rolling back to it the
    //     harness re-asserts a full fixture digest (every request row + every slot's
    //     published flag + the legacy NULL-start rows) against the digest captured at
    //     fixture creation.
    //   * Post-rollback cleanup verification runs on a SEPARATE connection, after the
    //     outer rollback completed, over EVERY table the harness writes to, and re-checks
    //     the global audit count against the pre-run value.
    //
    // NOT EXECUTED as part of the local hardening stage. Running it requires
    // ConnectionStrings:DefaultConnection, which lives outside the repo.
    //
    // To run it (only after explicit approval), in PowerShell:
    //   $env:ConnectionStrings__DefaultConnection="<connection string>"
    //   $env:RIDEON_RUN_APPLY_SP_V2_HARNESS="1"
    //   dotnet test --filter "FullyQualifiedName~ApplySpV2Harness" --logger "console;verbosity=detailed"
    //   (run from inside RideOnServer/ — DBServices.Connect uses Directory.GetCurrentDirectory()).
    // Afterwards:
    //   Remove-Item Env:ConnectionStrings__DefaultConnection
    //   Remove-Item Env:RIDEON_RUN_APPLY_SP_V2_HARNESS
    public class ApplySpV2Harness
    {
        private readonly ITestOutputHelper _output;

        public ApplySpV2Harness(ITestOutputHelper output)
        {
            _output = output;
        }

        // Exposes DBServices.Connect (protected) to the harness.
        private sealed class HarnessDb : DBServices
        {
            public NpgsqlConnection Open()
            {
                NpgsqlConnection con = Connect("DefaultConnection");
                con.Open();
                return con;
            }
        }

        private const string ApplySql =
            "SELECT public.usp_applyautoschedulev2(" +
            "p_plan := @plan::jsonb, p_competitionid := @comp, p_appliedbypersonid := @actor)";

        private const string ExpectedSignature =
            "p_plan jsonb, p_competitionid integer, p_appliedbypersonid integer";

        // Every table the harness inserts into. `bill` has no usable text marker column,
        // so its ids are tracked in memory instead (see _billIds).
        private readonly List<int> _billIds = new List<int>();
        private readonly List<int> _requestIds = new List<int>();
        private readonly List<int> _slotIds = new List<int>();
        private int _competitionId = -1;

        [Fact]
        public void ApplyV2Sp_EnforcesEveryGuard_AndRollsBackAtomically()
        {
            if (Environment.GetEnvironmentVariable("RIDEON_RUN_APPLY_SP_V2_HARNESS") != "1")
            {
                _output.WriteLine(
                    "SKIPPED (not a failure): RIDEON_RUN_APPLY_SP_V2_HARNESS is not set to \"1\". " +
                    "See class remarks for the full run procedure.");
                return;
            }

            string marker = "SMOKE_APPLY_V2_" + Guid.NewGuid().ToString("N");

            // The global audit count, captured before the outer transaction and re-checked
            // after it. Declared out here so the post-rollback verification can see it.
            int preRunAuditCount = -1;

            // ===== connection: skip safely BEFORE any data is created =====
            // Never print the exception message — only its type — so no connection
            // parameter can leak into test output.
            NpgsqlConnection con = null!;
            bool connected = false;
            try
            {
                con = new HarnessDb().Open();
                connected = true;
            }
            catch (Exception ex)
            {
                _output.WriteLine(
                    "SKIPPED (not a failure): could not open ConnectionStrings:DefaultConnection " +
                    $"({ex.GetType().Name}). No fixture created, nothing written.");
            }

            if (!connected)
            {
                return;
            }

            using (con)
            {
                // ============ preconditions (READ-ONLY) ============
                if (ScalarInt(con, null,
                        "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace " +
                        "WHERE n.nspname='public' AND p.proname='usp_applyautoschedulev2' " +
                        "  AND pg_get_function_arguments(p.oid) = @sig", ("@sig", ExpectedSignature)) == 0)
                {
                    _output.WriteLine(
                        "SKIPPED: usp_applyautoschedulev2 is not deployed with the expected signature " +
                        $"(\"{ExpectedSignature}\"). No fixture created.");
                    return;
                }

                if (ScalarInt(con, null,
                        "SELECT count(*) FROM information_schema.tables " +
                        "WHERE table_schema='public' AND table_name='paidtimeassignmentchange'") == 0)
                {
                    _output.WriteLine("SKIPPED: paidtimeassignmentchange does not exist. No fixture created.");
                    return;
                }

                // ============ reference derivation (READ-ONLY, before any write) ============
                // Every row read here is a PARENT row the fixture points at. None is ever
                // updated or deleted by this harness.
                int? ranch = ScalarIntOrNull(con, null,
                    "SELECT a.ranchid FROM (SELECT ranchid FROM arena GROUP BY ranchid HAVING count(*) >= 2) a " +
                    "WHERE EXISTS (SELECT 1 FROM pricecatalog pc JOIN paidtimeproduct ptp ON ptp.productid = pc.productid " +
                    "              WHERE pc.ranchid = a.ranchid AND pc.isactive) " +
                    "ORDER BY a.ranchid LIMIT 1");
                if (ranch == null)
                {
                    _output.WriteLine("SKIPPED: no ranch has both >=2 arenas and an active paid-time price catalog. " +
                                      "No fixture created.");
                    return;
                }

                int[] arenas = IntArray(con, null,
                    "SELECT array_agg(arenaid::int ORDER BY arenaid) FROM " +
                    "(SELECT arenaid FROM arena WHERE ranchid=@r ORDER BY arenaid LIMIT 2) a",
                    ("@r", ranch.Value));
                int? ptslot = ScalarIntOrNull(con, null,
                    "SELECT paidtimeslotid FROM paidtimeslot ORDER BY paidtimeslotid LIMIT 1");
                int? field = ScalarIntOrNull(con, null, "SELECT fieldid FROM field ORDER BY fieldid LIMIT 1");
                int? su = ScalarIntOrNull(con, null, "SELECT systemuserid FROM systemuser ORDER BY systemuserid LIMIT 1");
                int? actor = ScalarIntOrNull(con, null, "SELECT personid FROM person ORDER BY personid LIMIT 1");
                int[] fm = IntArray(con, null,
                    "SELECT array_agg(federationmemberid::int ORDER BY federationmemberid) FROM " +
                    "(SELECT federationmemberid FROM federationmember ORDER BY federationmemberid LIMIT 6) t");
                int[] hs = IntArray(con, null,
                    "SELECT array_agg(horseid::int ORDER BY horseid) FROM " +
                    "(SELECT horseid FROM horse ORDER BY horseid LIMIT 4) t");

                int pcId = -1, durMin = -1;
                using (NpgsqlCommand pcCmd = Cmd(con, null,
                    "SELECT pc.pricecatalogid, ptp.durationminutes FROM pricecatalog pc " +
                    "JOIN paidtimeproduct ptp ON ptp.productid = pc.productid " +
                    "WHERE pc.ranchid=@r AND pc.isactive ORDER BY pc.pricecatalogid LIMIT 1",
                    new[] { ("@r", (object)ranch.Value) }))
                using (NpgsqlDataReader rdr = pcCmd.ExecuteReader())
                {
                    if (rdr.Read())
                    {
                        pcId = rdr.GetInt32(0);
                        durMin = rdr.GetInt32(1);
                    }
                }

                if (arenas.Length < 2 || ptslot == null || field == null || su == null || actor == null
                    || fm.Length < 6 || hs.Length < 4 || pcId < 0 || durMin < 0)
                {
                    _output.WriteLine("SKIPPED: insufficient reference data " +
                        $"(arenas={arenas.Length}, ptslot={ptslot}, field={field}, su={su}, actor={actor}, " +
                        $"fm={fm.Length}, horses={hs.Length}, pricecatalog={pcId}, duration={durMin}). " +
                        "No fixture created.");
                    return;
                }

                // Effective ride length, matching proc 128 and the engine.
                int eff = durMin + 1;

                // ============ read-only PREFLIGHT ============
                int preexisting =
                    ScalarInt(con, null, "SELECT count(*) FROM competition WHERE competitionname = @m", ("@m", marker))
                    + ScalarInt(con, null, "SELECT count(*) FROM servicerequest WHERE notes = @m", ("@m", marker))
                    + ScalarInt(con, null, "SELECT count(*) FROM paidtimerequest WHERE notes = @m", ("@m", marker))
                    + ScalarInt(con, null, "SELECT count(*) FROM paidtimeslotincompetition WHERE slotnotes = @m", ("@m", marker));
                if (preexisting != 0)
                {
                    throw new Exception(
                        $"PREFLIGHT FAILED: {preexisting} row(s) already carry the marker. Aborted before any write.");
                }

                // REQUIREMENT 1: global audit count BEFORE the outer transaction opens.
                preRunAuditCount = ScalarInt(con, null,
                    "SELECT count(*) FROM public.paidtimeassignmentchange");
                _output.WriteLine($"pre-run global paidtimeassignmentchange count = {preRunAuditCount}");

                NpgsqlTransaction tx = con.BeginTransaction();
                bool rolledBack = false;

                try
                {
                    // ================= fixture =================
                    // SA 08:00 two seats | SB 10:00 one seat | SC 12:00 one seat
                    // SD 14:00 PUBLISHED one seat  -> published source/target scenarios
                    // SE 16:00 two seats UNSAFE    -> holds a NULL-start legacy row
                    _competitionId = ScalarInt(con, tx,
                        "INSERT INTO competition (competitionname, hostranchid, fieldid, competitionstartdate, competitionenddate) " +
                        "VALUES (@m, @r, @f, DATE '2031-03-03', DATE '2031-03-05') RETURNING competitionid",
                        ("@m", marker), ("@r", ranch.Value), ("@f", field.Value));
                    int comp = _competitionId;

                    int sa = InsertSlot(con, tx, comp, ptslot.Value, ranch.Value, arenas[0], "08:00", MinutesToTime(8 * 60 + 2 * eff), false, marker);
                    int sb = InsertSlot(con, tx, comp, ptslot.Value, ranch.Value, arenas[0], "10:00", MinutesToTime(10 * 60 + eff), false, marker);
                    int sc = InsertSlot(con, tx, comp, ptslot.Value, ranch.Value, arenas[0], "12:00", MinutesToTime(12 * 60 + eff), false, marker);
                    int sd = InsertSlot(con, tx, comp, ptslot.Value, ranch.Value, arenas[0], "14:00", MinutesToTime(14 * 60 + eff), true, marker);
                    int se = InsertSlot(con, tx, comp, ptslot.Value, ranch.Value, arenas[0], "16:00", MinutesToTime(16 * 60 + 2 * eff), false, marker);

                    // Two existing assignments to swap: A in SA@08:00, B in SB@10:00.
                    // 'Manual' / NULL origins so preservation of BOTH shapes is exercised.
                    int reqA = InsertRequest(con, tx, marker, pcId, su.Value, actor.Value,
                        hs[0], fm[0], fm[1], requested: sb, assigned: sa, start: "08:00", order: 1, origin: "Manual");
                    int reqB = InsertRequest(con, tx, marker, pcId, su.Value, actor.Value,
                        hs[1], fm[2], fm[3], requested: sa, assigned: sb, start: "10:00", order: 1, origin: null);
                    // A brand-new pending request that will take SA's freed first seat.
                    int reqN = InsertRequest(con, tx, marker, pcId, su.Value, actor.Value,
                        hs[2], fm[4], fm[5], requested: sa, assigned: null, start: null, order: null, origin: null);

                    // A FROZEN assignment inside the PUBLISHED slot SD. Must not block a legal
                    // apply elsewhere, and must survive every scenario unchanged and unaudited.
                    int reqF = InsertRequest(con, tx, marker, pcId, su.Value, actor.Value,
                        hs[3], fm[0], fm[1], requested: sd, assigned: sd, start: "14:00", order: 1, origin: "Manual");

                    // REQUIREMENT 3: the unsafe legacy fixture.
                    // reqL1 is Assigned in SE with a NULL assignedstarttime and a known
                    // positive order. It seeds no interval, so SE's true occupancy is
                    // unverifiable and the whole slot is out of automatic scope.
                    int reqL1 = InsertRequest(con, tx, marker, pcId, su.Value, actor.Value,
                        hs[1], fm[4], fm[5], requested: se, assigned: se, start: null, order: 3,
                        origin: null, forceAssignedStatus: true);
                    // A perfectly healthy assignment that merely SHARES the unsafe slot, used
                    // as the unsafe-SOURCE subject (a Moved item needs a real old start time,
                    // so reqL1 itself cannot be the moved row — the shape check would reject
                    // it earlier, for a different reason).
                    int reqU = InsertRequest(con, tx, marker, pcId, su.Value, actor.Value,
                        hs[0], fm[2], fm[3], requested: se, assigned: se, start: "16:00", order: 1, origin: "Manual");

                    ScalarInt(con, tx,
                        "SELECT count(*) FROM paidtimerequest " +
                        "WHERE paidtimerequestid=@id AND status='Assigned' AND assignedcompslotid=@se " +
                        "  AND assignedstarttime IS NULL AND assignedorder=3",
                        ("@id", reqL1), ("@se", se))
                        .Should().Be(1, "the legacy fixture row must really be Assigned/NULL-start/order 3");

                    // Digest of everything a scenario could disturb, captured at fixture state.
                    int[] allReqs = new[] { reqA, reqB, reqN, reqF, reqL1, reqU };
                    int[] allSlots = new[] { sa, sb, sc, sd, se };
                    string fixtureDigest = FixtureDigest(con, tx, allReqs, allSlots);
                    _output.WriteLine("fixture digest captured.");

                    // The canonical plan that scenario 1 proves is legal. Reused verbatim by
                    // scenario 9 so the ONLY difference there is the injected duplicate.
                    string legalPlan = Plan(
                        NewItem(reqN, sa, "08:00", 2),
                        MovedItem(reqA, sa, "08:00", 1, "Manual", sc, "12:00", 1, "Manual"),
                        MovedItem(reqB, sb, "10:00", 1, null, sb, "10:00", 2, null));

                    // ============ scenario 1: valid new assignment + two moves ============
                    Exec(con, tx, "SAVEPOINT s1");

                    object? res = Scalar(con, tx, ApplySql,
                        ("@plan", legalPlan), ("@comp", comp), ("@actor", actor.Value));
                    _output.WriteLine($"scenario 1 (valid) returned: {res}");

                    // REQUIREMENT 9: exactly ONE audit row per moved request, with every
                    // field exactly right. Asserted per request, never as a combined total.
                    AuditRowCount(con, tx, reqA, comp, actor.Value,
                        sa, "08:00", 1, "Manual", sc, "12:00", 1, "Manual")
                        .Should().Be(1, "reqA must have exactly one fully-correct Moved audit row");
                    AuditRowCount(con, tx, reqB, comp, actor.Value,
                        sb, "10:00", 1, null, sb, "10:00", 2, null)
                        .Should().Be(1, "reqB must have exactly one fully-correct Moved audit row, NULL origin preserved");

                    ScalarInt(con, tx, "SELECT count(*) FROM paidtimeassignmentchange WHERE paidtimerequestid=@id",
                        ("@id", reqA)).Should().Be(1, "no duplicate audit rows for reqA");
                    ScalarInt(con, tx, "SELECT count(*) FROM paidtimeassignmentchange WHERE paidtimerequestid=@id",
                        ("@id", reqB)).Should().Be(1, "no duplicate audit rows for reqB");

                    // REQUIREMENT 10: a brand-new assignment is NEVER audited.
                    ScalarInt(con, tx, "SELECT count(*) FROM paidtimeassignmentchange WHERE paidtimerequestid=@id",
                        ("@id", reqN))
                        .Should().Be(0, "V2-2 audits moved existing assignments only");
                    ScalarString(con, tx,
                        "SELECT allocationorigin FROM paidtimerequest WHERE paidtimerequestid=@id", ("@id", reqN))
                        .Should().Be("Auto", "a brand-new assignment is always Auto");

                    // The published frozen row neither blocked the apply nor was touched.
                    ScalarInt(con, tx, "SELECT count(*) FROM paidtimeassignmentchange WHERE paidtimerequestid=@id",
                        ("@id", reqF)).Should().Be(0, "an untouched frozen row is never audited");
                    ScalarInt(con, tx, "SELECT count(*) FROM paidtimeassignmentchange WHERE paidtimerequestid=@id",
                        ("@id", reqL1)).Should().Be(0, "the legacy row is never audited");
                    ScalarInt(con, tx, "SELECT count(*) FROM paidtimeassignmentchange WHERE paidtimerequestid=@id",
                        ("@id", reqU)).Should().Be(0, "an untouched unsafe-slot row is never audited");

                    Exec(con, tx, "ROLLBACK TO SAVEPOINT s1");
                    AssertRestored(con, tx, allReqs, allSlots, fixtureDigest, "scenario 1");

                    // ============ scenario 2: stale expected-old-state ============
                    RunRejection(con, tx, "s2", "scenario 2 (stale old state)",
                        Plan(MovedItem(reqA, sa, "09:59", 1, "Manual", sc, "12:00", 1, "Manual")),
                        comp, actor.Value, "stale plan",
                        new[] { reqA }, allReqs, allSlots, fixtureDigest);

                    // ============ scenario 3: published TARGET slot ============
                    // REQUIREMENT 7: zero audit rows for every involved id.
                    RunRejection(con, tx, "s3", "scenario 3 (published target)",
                        Plan(MovedItem(reqA, sa, "08:00", 1, "Manual", sd, "14:00", 1, "Manual")),
                        comp, actor.Value, "illegal target slot",
                        new[] { reqA, reqF }, allReqs, allSlots, fixtureDigest);

                    // ============ scenario 4: published SOURCE slot ============
                    // The guard SP 129 never had: move the frozen row OUT of SD.
                    RunRejection(con, tx, "s4", "scenario 4 (published source)",
                        Plan(MovedItem(reqF, sd, "14:00", 1, "Manual", sc, "12:00", 1, "Manual")),
                        comp, actor.Value, "source slot is published",
                        new[] { reqF }, allReqs, allSlots, fixtureDigest);

                    // ============ scenario 5: declared write-set count mismatch ============
                    // REQUIREMENT 8: zero audit rows for every involved id.
                    Exec(con, tx, "SAVEPOINT s5");
                    string truncated =
                        "{\"expectedWriteSetCount\":2,\"items\":[" +
                        MovedItem(reqA, sa, "08:00", 1, "Manual", sc, "12:00", 1, "Manual") + "]}";
                    (bool rejected5, string err5) = TryApply(con, tx, ApplySql,
                        ("@plan", truncated), ("@comp", comp), ("@actor", actor.Value));
                    rejected5.Should().BeTrue("a truncated payload must not be applied");
                    err5.Should().Contain("write set count mismatch");
                    _output.WriteLine("scenario 5 (count mismatch) rejected: " + err5);
                    AuditRowsFor(con, tx, new[] { reqA })
                        .Should().Be(0, "a rejected apply writes no audit rows");
                    Exec(con, tx, "ROLLBACK TO SAVEPOINT s5");
                    AssertRestored(con, tx, allReqs, allSlots, fixtureDigest, "scenario 5");

                    // ============ scenario 6: illegal final state (duplicate slot/order) ============
                    RunRejection(con, tx, "s6", "scenario 6 (duplicate slot/order in plan)",
                        Plan(
                            MovedItem(reqA, sa, "08:00", 1, "Manual", sc, "12:00", 1, "Manual"),
                            MovedItem(reqB, sb, "10:00", 1, null, sc, "12:00", 1, null)),
                        comp, actor.Value, "duplicate (slot, order)",
                        new[] { reqA, reqB }, allReqs, allSlots, fixtureDigest);

                    // ============ scenario 7: UNSAFE LEGACY SOURCE ============
                    // REQUIREMENT 4. reqU is healthy but shares SE with the NULL-start row,
                    // so SE's occupancy is unverifiable and nothing may leave it either.
                    RunRejection(con, tx, "s7", "scenario 7 (unsafe legacy SOURCE)",
                        Plan(MovedItem(reqU, se, "16:00", 1, "Manual", sc, "12:00", 1, "Manual")),
                        comp, actor.Value, "unsafe legacy slot",
                        new[] { reqU, reqL1 }, allReqs, allSlots, fixtureDigest);

                    // ============ scenario 8: UNSAFE LEGACY TARGET ============
                    // REQUIREMENT 5, both shapes: a MOVE into SE, and a NEW assignment into SE.
                    RunRejection(con, tx, "s8a", "scenario 8a (unsafe legacy TARGET, move in)",
                        Plan(MovedItem(reqA, sa, "08:00", 1, "Manual", se, "16:30", 2, "Manual")),
                        comp, actor.Value, "unsafe legacy slot",
                        new[] { reqA, reqL1 }, allReqs, allSlots, fixtureDigest);

                    RunRejection(con, tx, "s8b", "scenario 8b (unsafe legacy TARGET, new assignment in)",
                        Plan(NewItem(reqN, se, "16:30", 2)),
                        comp, actor.Value, "unsafe legacy slot",
                        new[] { reqN, reqL1 }, allReqs, allSlots, fixtureDigest);

                    // ============ scenario 9: NULL-start row participates in duplicate-order ============
                    // REQUIREMENT 6. See the class-level note and the report: a plan row can
                    // never collide with the legacy row directly, because colliding requires
                    // TARGETING the legacy row's slot, which the unsafe-slot guard rejects
                    // first. So the duplicate is arranged BETWEEN TWO legacy NULL-start rows
                    // inside SE, while the PLAN touches only clean slots (SA/SB/SC) — the
                    // guard therefore does not intercept, and check 2 is genuinely reached.
                    //
                    // The proof that check 2 (all_assigned) and not check 3 (final) fires:
                    // both colliding rows have a NULL assignedstarttime, so `final` excludes
                    // them entirely and can see no duplicate at all. Asserted below.
                    Exec(con, tx, "SAVEPOINT s9");

                    int reqL2 = InsertRequest(con, tx, marker, pcId, su.Value, actor.Value,
                        hs[2], fm[0], fm[1], requested: se, assigned: se, start: null, order: 3,
                        origin: null, forceAssignedStatus: true);

                    // Precondition: the duplicate exists ONLY among NULL-start rows.
                    ScalarInt(con, tx,
                        "SELECT count(*) FROM (" +
                        "  SELECT 1 FROM paidtimerequest ptr " +
                        "  JOIN paidtimeslotincompetition s ON s.paidtimeslotincompid = ptr.assignedcompslotid " +
                        "  WHERE s.competitionid=@c AND ptr.status='Assigned' AND ptr.assignedorder IS NOT NULL " +
                        "  GROUP BY ptr.assignedcompslotid, ptr.assignedorder HAVING count(*) > 1) d",
                        ("@c", comp))
                        .Should().Be(1, "all_assigned must see exactly one duplicate (slot, order) group");

                    ScalarInt(con, tx,
                        "SELECT count(*) FROM (" +
                        "  SELECT 1 FROM paidtimerequest ptr " +
                        "  JOIN paidtimeslotincompetition s ON s.paidtimeslotincompid = ptr.assignedcompslotid " +
                        "  WHERE s.competitionid=@c AND ptr.status='Assigned' " +
                        "    AND ptr.assignedstarttime IS NOT NULL " +
                        "  GROUP BY ptr.assignedcompslotid, ptr.assignedorder HAVING count(*) > 1) d",
                        ("@c", comp))
                        .Should().Be(0,
                            "the `final` set (start-bearing rows only) must see NO duplicate, so a " +
                            "rejection can only come from the all_assigned probe");

                    // Exactly the plan scenario 1 proved legal — the ONLY delta is reqL2.
                    (bool rejected9, string err9) = TryApply(con, tx, ApplySql,
                        ("@plan", legalPlan), ("@comp", comp), ("@actor", actor.Value));
                    rejected9.Should().BeTrue(
                        "the same plan that succeeded in scenario 1 must now be rejected purely " +
                        "because a NULL-start row duplicates an order");
                    err9.Should().Contain("duplicate (slot, order) in final state");
                    err9.Should().NotContain("unsafe legacy slot",
                        "the unsafe-slot guard must NOT have intercepted — the plan touches clean slots only");
                    _output.WriteLine("scenario 9 (all_assigned duplicate order) rejected: " + err9);

                    AuditRowsFor(con, tx, new[] { reqA, reqB, reqN, reqL1, reqL2 })
                        .Should().Be(0, "a rejected apply writes no audit rows");

                    Exec(con, tx, "ROLLBACK TO SAVEPOINT s9");
                    AssertRestored(con, tx, allReqs, allSlots, fixtureDigest, "scenario 9");
                    ScalarInt(con, tx, "SELECT count(*) FROM paidtimerequest WHERE paidtimerequestid=@id",
                        ("@id", reqL2))
                        .Should().Be(0, "the injected duplicate row is gone after the savepoint rollback");

                    // Sanity: after every scenario, the fixture is still exactly as created.
                    FixtureDigest(con, tx, allReqs, allSlots).Should().Be(fixtureDigest,
                        "the whole fixture must be byte-identical to its created state");
                }
                finally
                {
                    try
                    {
                        tx.Rollback();
                        rolledBack = true;
                    }
                    catch (Exception rollbackEx)
                    {
                        _output.WriteLine("OUTER ROLLBACK FAILED: " + rollbackEx.Message);
                    }
                    tx.Dispose();
                }

                rolledBack.Should().BeTrue("the harness never commits; the outer rollback must succeed");
            }

            // ============ cleanup verification, on a SEPARATE connection ============
            using NpgsqlConnection verify = new HarnessDb().Open();

            // REQUIREMENT 2: every table the harness writes to.
            ScalarInt(verify, null, "SELECT count(*) FROM competition WHERE competitionname=@m", ("@m", marker))
                .Should().Be(0, "no marked competition row survives");
            ScalarInt(verify, null, "SELECT count(*) FROM paidtimeslotincompetition WHERE slotnotes=@m", ("@m", marker))
                .Should().Be(0, "no marked slot row survives");
            ScalarInt(verify, null, "SELECT count(*) FROM servicerequest WHERE notes=@m", ("@m", marker))
                .Should().Be(0, "no marked servicerequest row survives");
            ScalarInt(verify, null, "SELECT count(*) FROM paidtimerequest WHERE notes=@m", ("@m", marker))
                .Should().Be(0, "no marked paidtimerequest row survives");

            // Belt and braces: the exact tracked ids must be gone, marker or not. `bill` has
            // no usable text column, so this is the ONLY way to verify it — and production
            // schema is never altered to add one.
            if (_competitionId > 0)
            {
                ScalarInt(verify, null, "SELECT count(*) FROM competition WHERE competitionid=@id", ("@id", _competitionId))
                    .Should().Be(0, "the tracked competition id is gone");
            }
            AssertIdsGone(verify, "paidtimeslotincompetition", "paidtimeslotincompid", _slotIds);
            AssertIdsGone(verify, "paidtimerequest", "paidtimerequestid", _requestIds);
            AssertIdsGone(verify, "servicerequest", "srequestid", _requestIds);
            AssertIdsGone(verify, "bill", "billid", _billIds);

            // `bill` also carries the harness competition id, so it gets a second,
            // id-independent check rather than relying on the tracked list alone.
            if (_competitionId > 0)
            {
                ScalarInt(verify, null, "SELECT count(*) FROM bill WHERE competitionid=@id",
                    ("@id", _competitionId))
                    .Should().Be(0, "no bill row for the harness competition survives");
            }

            // Audit rows keyed to any tracked request id must be gone.
            if (_requestIds.Count > 0)
            {
                ScalarInt(verify, null,
                    "SELECT count(*) FROM paidtimeassignmentchange WHERE paidtimerequestid = ANY(@ids)",
                    ("@ids", _requestIds.ToArray()))
                    .Should().Be(0, "no audit row references a harness request");
            }
            ScalarInt(verify, null,
                "SELECT count(*) FROM paidtimeassignmentchange c " +
                "WHERE NOT EXISTS (SELECT 1 FROM paidtimerequest p WHERE p.paidtimerequestid = c.paidtimerequestid)")
                .Should().Be(0, "no orphaned audit rows survive the rollback");

            // REQUIREMENT 1: the global audit count is exactly what it was before the run.
            int postRollbackAuditCount = ScalarInt(verify, null,
                "SELECT count(*) FROM public.paidtimeassignmentchange");
            postRollbackAuditCount.Should().Be(preRunAuditCount,
                "the global audit row count must return to its pre-run value");

            _output.WriteLine(
                $"post-rollback global paidtimeassignmentchange count = {postRollbackAuditCount} " +
                $"(pre-run {preRunAuditCount}). All fixtures rolled back and verified clean.");
        }

        // ---- scenario driver ----------------------------------------------------------------

        // Runs one expected-rejection scenario inside its own savepoint: asserts the
        // rejection and its message, asserts zero audit rows for every involved id, rolls
        // back, then re-asserts the ENTIRE fixture digest (requests + published flags +
        // legacy NULL-start rows). This is the atomic-rollback proof (requirement 11).
        private void RunRejection(
            NpgsqlConnection con, NpgsqlTransaction tx, string savepoint, string label,
            string plan, int comp, int actor, string expectedFragment,
            int[] involvedIds, int[] allReqs, int[] allSlots, string fixtureDigest)
        {
            Exec(con, tx, "SAVEPOINT " + savepoint);

            (bool rejected, string error) = TryApply(con, tx, ApplySql,
                ("@plan", plan), ("@comp", comp), ("@actor", actor));

            rejected.Should().BeTrue($"{label} must be rejected");
            error.Should().Contain(expectedFragment, $"{label} must fail for the expected reason");
            _output.WriteLine($"{label} rejected: {error}");

            AuditRowsFor(con, tx, involvedIds)
                .Should().Be(0, $"{label} must write no audit rows");

            Exec(con, tx, "ROLLBACK TO SAVEPOINT " + savepoint);
            AssertRestored(con, tx, allReqs, allSlots, fixtureDigest, label);
        }

        private void AssertRestored(
            NpgsqlConnection con, NpgsqlTransaction tx,
            int[] reqIds, int[] slotIds, string expectedDigest, string label)
        {
            FixtureDigest(con, tx, reqIds, slotIds).Should().Be(expectedDigest,
                $"{label}: every request row, every slot published flag and the legacy " +
                "NULL-start row must be exactly as created");

            AuditRowsFor(con, tx, reqIds)
                .Should().Be(0, $"{label}: no audit row for any fixture request survives the rollback");
        }

        // Canonical digest of every request row plus every slot's published flag. Includes
        // the NULL-start legacy rows, so a change to them cannot slip past.
        private static string FixtureDigest(
            NpgsqlConnection con, NpgsqlTransaction? tx, int[] reqIds, int[] slotIds)
        {
            string requests = ScalarString(con, tx,
                "SELECT coalesce(string_agg(" +
                "  p.paidtimerequestid || ':' || coalesce(p.assignedcompslotid::text,'-') || ':' || " +
                "  coalesce(p.assignedstarttime::text,'-') || ':' || coalesce(p.assignedorder::text,'-') || ':' || " +
                "  p.status || ':' || coalesce(p.allocationorigin,'-') || ':' || p.requestedcompslotid, " +
                "  '|' ORDER BY p.paidtimerequestid), '') " +
                "FROM paidtimerequest p WHERE p.paidtimerequestid = ANY(@ids)",
                ("@ids", reqIds));

            string slots = ScalarString(con, tx,
                "SELECT coalesce(string_agg(" +
                "  s.paidtimeslotincompid || ':' || s.ispublished::text || ':' || " +
                "  s.slotdate::text || ':' || s.starttime::text || ':' || s.endtime::text, " +
                "  '|' ORDER BY s.paidtimeslotincompid), '') " +
                "FROM paidtimeslotincompetition s WHERE s.paidtimeslotincompid = ANY(@ids)",
                ("@ids", slotIds));

            return requests + " || " + slots;
        }

        private static int AuditRowsFor(NpgsqlConnection con, NpgsqlTransaction? tx, int[] ids)
        {
            if (ids.Length == 0)
            {
                return 0;
            }
            return ScalarInt(con, tx,
                "SELECT count(*) FROM paidtimeassignmentchange WHERE paidtimerequestid = ANY(@ids)",
                ("@ids", ids));
        }

        // Exactly-one-fully-correct-audit-row probe: every column of the audit row is
        // pinned, so "count = 1" also means "and it says the right thing".
        private static int AuditRowCount(
            NpgsqlConnection con, NpgsqlTransaction tx, int requestId, int comp, int actor,
            int oldSlot, string oldStart, int oldOrder, string? oldOrigin,
            int newSlot, string newStart, int newOrder, string? newOrigin)
        {
            return ScalarInt(con, tx,
                "SELECT count(*) FROM paidtimeassignmentchange " +
                "WHERE paidtimerequestid = @id " +
                "  AND competitionid = @comp " +
                "  AND changekind = 'Moved' " +
                "  AND previousassignedslotid = @oldslot " +
                "  AND previousassignedstarttime = @oldstart::timestamptz " +
                "  AND previousassignedorder = @oldord " +
                "  AND previousallocationorigin IS NOT DISTINCT FROM @oldorigin " +
                "  AND newassignedslotid = @newslot " +
                "  AND newassignedstarttime = @newstart::timestamptz " +
                "  AND newassignedorder = @neword " +
                "  AND newallocationorigin IS NOT DISTINCT FROM @neworigin " +
                "  AND appliedbypersonid = @actor",
                ("@id", requestId), ("@comp", comp), ("@actor", actor),
                ("@oldslot", oldSlot), ("@oldstart", Ts(oldStart)), ("@oldord", oldOrder),
                ("@oldorigin", oldOrigin ?? (object)DBNull.Value),
                ("@newslot", newSlot), ("@newstart", Ts(newStart)), ("@neword", newOrder),
                ("@neworigin", newOrigin ?? (object)DBNull.Value));
        }

        private static void AssertIdsGone(
            NpgsqlConnection con, string table, string idColumn, List<int> ids)
        {
            if (ids.Count == 0)
            {
                return;
            }
            ScalarInt(con, null,
                $"SELECT count(*) FROM {table} WHERE {idColumn} = ANY(@ids)", ("@ids", ids.ToArray()))
                .Should().Be(0, $"every tracked {table}.{idColumn} must be gone after rollback");
        }

        // ---- fixture insert helpers ----------------------------------------------------------

        private static string MinutesToTime(int totalMinutes)
        {
            return $"{totalMinutes / 60:00}:{totalMinutes % 60:00}";
        }

        private int InsertSlot(NpgsqlConnection con, NpgsqlTransaction tx, int comp, int ptslot,
            int ranch, int arena, string start, string end, bool published, string marker)
        {
            int id = ScalarInt(con, tx,
                "INSERT INTO paidtimeslotincompetition " +
                "(competitionid, paidtimeslotid, arenaranchid, arenaid, slotdate, starttime, endtime, ispublished, slotnotes) " +
                "VALUES (@c, @p, @r, @a, DATE '2031-03-03', @s::time, @e::time, @pub, @m) " +
                "RETURNING paidtimeslotincompid",
                ("@c", comp), ("@p", ptslot), ("@r", ranch), ("@a", arena),
                ("@s", start), ("@e", end), ("@pub", published), ("@m", marker));
            _slotIds.Add(id);
            return id;
        }

        // servicerequest.srequestid is GENERATED ALWAYS, and paidtimerequest.paidtimerequestid
        // is a 1:1 FK to it, so the request id is whatever the servicerequest insert returns.
        //
        // forceAssignedStatus exists only for the legacy fixture: a row that is 'Assigned'
        // WITH a slot and an order but WITHOUT a start time — the exact live shape that makes
        // a slot unverifiable.
        private int InsertRequest(NpgsqlConnection con, NpgsqlTransaction tx, string marker,
            int pricecatalog, int systemUser, int payer, int horse, int rider, int coach,
            int requested, int? assigned, string? start, int? order, string? origin,
            bool forceAssignedStatus = false)
        {
            // Column list matches the proven shape in ApplySpOverlapHarness: dateopened and
            // competitionid are both supplied. competitionid also gives `bill` a usable
            // cleanup handle (the harness competition id) alongside the tracked ids.
            int bill = ScalarInt(con, tx,
                "INSERT INTO bill(paidbypersonid, amounttopay, dateopened, competitionid) " +
                "VALUES(@p, 0, now(), @comp) RETURNING billid",
                ("@p", payer), ("@comp", _competitionId));
            _billIds.Add(bill);

            int sr = ScalarInt(con, tx,
                "INSERT INTO servicerequest (horseid, riderfederationmemberid, coachfederationmemberid, " +
                "billid, orderedbysystemuserid, srequestdatetime, notes) " +
                "VALUES (@h, @r, @c, @b, @u, TIMESTAMPTZ '2031-01-01 09:00:00+00', @m) RETURNING srequestid",
                ("@h", horse), ("@r", rider), ("@c", coach), ("@b", bill), ("@u", systemUser), ("@m", marker));

            string status = (assigned.HasValue || forceAssignedStatus) ? "Assigned" : "Pending";

            Exec(con, tx,
                "INSERT INTO paidtimerequest (paidtimerequestid, pricecatalogid, requestedcompslotid, " +
                "assignedcompslotid, assignedstarttime, assignedorder, status, allocationorigin, notes) " +
                "VALUES (@id, @pc, @req, @asg, " +
                "CASE WHEN @st::text IS NULL THEN NULL ELSE (DATE '2031-03-03' + @st::time)::timestamptz END, " +
                "@ord, @status, @origin, @m)",
                ("@id", sr), ("@pc", pricecatalog), ("@req", requested),
                ("@asg", assigned.HasValue ? (object)assigned.Value : DBNull.Value),
                ("@st", start ?? (object)DBNull.Value),
                ("@ord", order.HasValue ? (object)order.Value : DBNull.Value),
                ("@status", status),
                ("@origin", origin ?? (object)DBNull.Value),
                ("@m", marker));

            _requestIds.Add(sr);
            return sr;
        }

        // ---- plan payload builders ----------------------------------------------------------

        private static string Plan(params string[] items)
        {
            return "{\"expectedWriteSetCount\":" + items.Length + ",\"items\":[" + string.Join(",", items) + "]}";
        }

        private static string Ts(string time)
        {
            return "2031-03-03T" + time + ":00+00:00";
        }

        private static string JsonOrNull(string? value)
        {
            return value == null ? "null" : "\"" + value + "\"";
        }

        private static string NewItem(int requestId, int slot, string start, int order)
        {
            return "{\"paidTimeRequestId\":" + requestId + ",\"changeKind\":\"NewAssignment\"," +
                   "\"expectedStatus\":\"Pending\",\"expectedAssignedCompSlotId\":null," +
                   "\"expectedAssignedStartTime\":null,\"expectedAssignedOrder\":null," +
                   "\"expectedAllocationOrigin\":null," +
                   "\"newAssignedCompSlotId\":" + slot + ",\"newAssignedStartTime\":\"" + Ts(start) + "\"," +
                   "\"newAssignedOrder\":" + order + ",\"newStatus\":\"Assigned\",\"newAllocationOrigin\":\"Auto\"}";
        }

        private static string MovedItem(int requestId,
            int oldSlot, string oldStart, int oldOrder, string? oldOrigin,
            int newSlot, string newStart, int newOrder, string? newOrigin)
        {
            return "{\"paidTimeRequestId\":" + requestId + ",\"changeKind\":\"Moved\"," +
                   "\"expectedStatus\":\"Assigned\"," +
                   "\"expectedAssignedCompSlotId\":" + oldSlot + "," +
                   "\"expectedAssignedStartTime\":\"" + Ts(oldStart) + "\"," +
                   "\"expectedAssignedOrder\":" + oldOrder + "," +
                   "\"expectedAllocationOrigin\":" + JsonOrNull(oldOrigin) + "," +
                   "\"newAssignedCompSlotId\":" + newSlot + "," +
                   "\"newAssignedStartTime\":\"" + Ts(newStart) + "\"," +
                   "\"newAssignedOrder\":" + newOrder + ",\"newStatus\":\"Assigned\"," +
                   "\"newAllocationOrigin\":" + JsonOrNull(newOrigin) + "}";
        }

        // ---- small typed helpers ------------------------------------------------------------

        private static NpgsqlCommand Cmd(NpgsqlConnection con, NpgsqlTransaction? tx, string sql, (string, object)[] ps)
        {
            NpgsqlCommand cmd = new NpgsqlCommand(sql, con, tx);
            foreach ((string name, object value) in ps)
            {
                cmd.Parameters.AddWithValue(name, value);
            }
            return cmd;
        }

        private static object? Scalar(NpgsqlConnection con, NpgsqlTransaction? tx, string sql, params (string, object)[] ps)
        {
            using NpgsqlCommand cmd = Cmd(con, tx, sql, ps);
            return cmd.ExecuteScalar();
        }

        private static int ScalarInt(NpgsqlConnection con, NpgsqlTransaction? tx, string sql, params (string, object)[] ps)
        {
            using NpgsqlCommand cmd = Cmd(con, tx, sql, ps);
            return Convert.ToInt32(cmd.ExecuteScalar());
        }

        private static int? ScalarIntOrNull(NpgsqlConnection con, NpgsqlTransaction? tx, string sql, params (string, object)[] ps)
        {
            using NpgsqlCommand cmd = Cmd(con, tx, sql, ps);
            object? v = cmd.ExecuteScalar();
            return v == null || v == DBNull.Value ? (int?)null : Convert.ToInt32(v);
        }

        private static string ScalarString(NpgsqlConnection con, NpgsqlTransaction? tx, string sql, params (string, object)[] ps)
        {
            using NpgsqlCommand cmd = Cmd(con, tx, sql, ps);
            object? v = cmd.ExecuteScalar();
            return v == null || v == DBNull.Value ? string.Empty : v.ToString()!;
        }

        private static int[] IntArray(NpgsqlConnection con, NpgsqlTransaction? tx, string sql, params (string, object)[] ps)
        {
            using NpgsqlCommand cmd = Cmd(con, tx, sql, ps);
            object? v = cmd.ExecuteScalar();
            return v as int[] ?? Array.Empty<int>();
        }

        private static void Exec(NpgsqlConnection con, NpgsqlTransaction? tx, string sql, params (string, object)[] ps)
        {
            using NpgsqlCommand cmd = Cmd(con, tx, sql, ps);
            cmd.ExecuteNonQuery();
        }

        // Runs an apply statement expected to RAISE; returns whether it was rejected and the message.
        private static (bool rejected, string error) TryApply(
            NpgsqlConnection con, NpgsqlTransaction tx, string sql, params (string, object)[] ps)
        {
            try
            {
                using NpgsqlCommand cmd = Cmd(con, tx, sql, ps);
                cmd.ExecuteScalar();
                return (false, string.Empty);
            }
            catch (PostgresException ex)
            {
                return (true, ex.MessageText);
            }
        }
    }
}
