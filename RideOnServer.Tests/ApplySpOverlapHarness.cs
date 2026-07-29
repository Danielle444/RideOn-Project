using FluentAssertions;
using Npgsql;
using RideOnServer.DAL;
using Xunit.Abstractions;

namespace RideOnServer.Tests
{
    // GATED live integration harness for usp_applyautoschedule's V2-0 legality guards
    // (coach same-arena / coach cross-arena 7-min transition / rider / horse overlap,
    // plus a valid success and atomic rollback). Modeled on
    // FeatureVectorBuilderParityTests: a NO-OP (not a failure) unless
    // RIDEON_RUN_APPLY_SP_HARNESS=1 is set, so it never runs during a normal `dotnet test`.
    //
    // Connection-string configuration key: "ConnectionStrings:DefaultConnection"
    // (settable via the environment variable ConnectionStrings__DefaultConnection).
    // The harness never prints or exposes the connection string.
    //
    // Safety contract (must not be weakened):
    //   * A UNIQUE per-run marker ("SMOKE_APPLY_SP_OVERLAP_" + Guid) tags every fabricated
    //     row and drives every preflight/cleanup query, always passed as a SQL PARAMETER
    //     (never concatenated). This avoids UNIQUE competitionname collisions and stops one
    //     run from validating or cleaning another run's fixtures.
    //   * All reference ids are DERIVED read-only, BEFORE the write transaction opens. A
    //     COMPATIBLE ranch is derived (>=2 arenas AND an active paid-time price catalog at
    //     that ranch). fieldid is derived from the field table (there is NO ranch<->field
    //     relationship in the schema: competition.fieldid -> field, hostranchid -> ranch are
    //     independent FKs). If no compatible/sufficient dataset exists, the harness SKIPS with
    //     a clear diagnostic before creating any fixture.
    //   * A read-only PREFLIGHT confirms zero rows already carry the (unique) marker, before
    //     any write. Any non-zero count is an immediate failure.
    //   * ONE explicit transaction; it is ALWAYS rolled back in a finally block; the harness
    //     never commits. If the outer rollback itself fails it is reported explicitly and the
    //     original error is not hidden.
    //   * Only freshly-inserted, marked fixtures are written. No existing
    //     competition/request/bill/slot/horse/rider/coach row is ever modified.
    //   * Each expected-failure scenario runs inside its own SAVEPOINT and is rolled back
    //     after asserting; the valid-success scenario is likewise rolled back to its savepoint.
    //   * Post-rollback cleanup verification runs on a SEPARATE connection, after the outer
    //     rollback has completed, and checks every fixture table that can hold the marker or
    //     be linked to the fixture competition.
    //
    // NOT EXECUTED in the V2-0 task: the live harness could not be run because no local
    // ConnectionStrings:DefaultConnection was available (the connection string lives in an
    // out-of-repo local env setup, and Render Shell / One-Off Jobs are unavailable on the
    // current Free instance). It is committed as an env-gated FUTURE integration test. The
    // V2-0 SP guards were instead verified live via pg_get_functiondef after deploy, and by
    // the DB-free engine tests in AutoSchedulerOverlapTests.
    //
    // To run it (only after explicit approval), in PowerShell:
    //   $env:ConnectionStrings__DefaultConnection="<connection string>"
    //   $env:RIDEON_RUN_APPLY_SP_HARNESS="1"
    //   dotnet test --filter "FullyQualifiedName~ApplySpOverlapHarness" --logger "console;verbosity=detailed"
    //   (run from inside RideOnServer/ — DBServices.Connect uses Directory.GetCurrentDirectory()).
    // Afterwards:
    //   Remove-Item Env:ConnectionStrings__DefaultConnection
    //   Remove-Item Env:RIDEON_RUN_APPLY_SP_HARNESS
    public class ApplySpOverlapHarness
    {
        private readonly ITestOutputHelper _output;

        public ApplySpOverlapHarness(ITestOutputHelper output)
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

        [Fact]
        public void ApplySp_RejectsCoachRiderHorseOverlap_AndRollsBackAtomically()
        {
            if (Environment.GetEnvironmentVariable("RIDEON_RUN_APPLY_SP_HARNESS") != "1")
            {
                _output.WriteLine(
                    "SKIPPED (not a failure): RIDEON_RUN_APPLY_SP_HARNESS is not set to \"1\". " +
                    "See class remarks for the full run procedure.");
                return;
            }

            // Unique per-run marker — passed as a SQL parameter everywhere, never concatenated.
            string marker = "SMOKE_APPLY_SP_OVERLAP_" + Guid.NewGuid().ToString("N");

            using NpgsqlConnection con = new HarnessDb().Open();

            // ================= reference derivation (READ-ONLY, before any write) =================
            // Compatible ranch: has >=2 arenas AND an active paid-time price catalog at that ranch.
            int? ranch = ScalarIntOrNull(con, null,
                "SELECT a.ranchid FROM (SELECT ranchid FROM arena GROUP BY ranchid HAVING count(*) >= 2) a " +
                "WHERE EXISTS (SELECT 1 FROM pricecatalog pc JOIN paidtimeproduct ptp ON ptp.productid = pc.productid " +
                "              WHERE pc.ranchid = a.ranchid AND pc.isactive) " +
                "ORDER BY a.ranchid LIMIT 1");
            if (ranch == null)
            {
                _output.WriteLine("SKIPPED: no ranch has both >=2 arenas and an active paid-time price catalog; " +
                                  "cannot build a compatible fixture. No fixture created.");
                return;
            }

            int[] arenas = IntArray(con, null,
                "SELECT array_agg(arenaid::int ORDER BY arenaid) FROM " +
                "(SELECT arenaid FROM arena WHERE ranchid=@r ORDER BY arenaid LIMIT 2) a", ("@r", ranch.Value));
            int? ptslot = ScalarIntOrNull(con, null, "SELECT paidtimeslotid FROM paidtimeslot ORDER BY paidtimeslotid LIMIT 1");
            int? field = ScalarIntOrNull(con, null, "SELECT fieldid FROM field ORDER BY fieldid LIMIT 1");
            int? su = ScalarIntOrNull(con, null, "SELECT systemuserid FROM systemuser ORDER BY systemuserid LIMIT 1");
            int? payer = ScalarIntOrNull(con, null, "SELECT personid FROM person ORDER BY personid LIMIT 1");
            int[] fm = IntArray(con, null,
                "SELECT array_agg(federationmemberid::int ORDER BY federationmemberid) FROM " +
                "(SELECT federationmemberid FROM federationmember ORDER BY federationmemberid LIMIT 6) t");
            int[] hs = IntArray(con, null,
                "SELECT array_agg(horseid::int ORDER BY horseid) FROM " +
                "(SELECT horseid FROM horse ORDER BY horseid LIMIT 3) t");

            // Price catalog + effective duration AT the compatible ranch.
            int pc = -1, durMin = -1;
            using (NpgsqlCommand pcCmd = Cmd(con, null,
                "SELECT pc.pricecatalogid, ptp.durationminutes FROM pricecatalog pc " +
                "JOIN paidtimeproduct ptp ON ptp.productid = pc.productid " +
                "WHERE pc.ranchid=@r AND pc.isactive ORDER BY pc.pricecatalogid LIMIT 1", new[] { ("@r", (object)ranch.Value) }))
            using (NpgsqlDataReader rdr = pcCmd.ExecuteReader())
            {
                if (rdr.Read())
                {
                    pc = rdr.GetInt32(0);
                    durMin = rdr.GetInt32(1);
                }
            }

            if (arenas.Length < 2 || ptslot == null || field == null || su == null || payer == null ||
                fm.Length < 6 || hs.Length < 3 || pc < 0 || durMin < 0)
            {
                _output.WriteLine("SKIPPED: insufficient reference data " +
                    $"(arenas={arenas.Length}, ptslot={ptslot}, field={field}, su={su}, payer={payer}, " +
                    $"fm={fm.Length}, horses={hs.Length}, pc={pc}, dur={durMin}). No fixture created.");
                return;
            }

            int arenaA = arenas[0];
            int arenaB = arenas[1];
            int eff = durMin + 1;             // effective ride length the SP uses (durationminutes + 1)
            int coachGap = eff;               // adjacency gap for the cross-arena <7-min coach test

            // ================= read-only PREFLIGHT (before any write) =================
            // The marker is unique, so any pre-existing marked row is an immediate failure.
            int preComp = ScalarInt(con, null, "SELECT count(*) FROM competition WHERE competitionname = @m", ("@m", marker));
            int preSlot = ScalarInt(con, null, "SELECT count(*) FROM paidtimeslotincompetition WHERE slotnotes = @m", ("@m", marker));
            int preReq = ScalarInt(con, null, "SELECT count(*) FROM paidtimerequest WHERE notes = @m", ("@m", marker));
            preComp.Should().Be(0, "preflight: the unique marker must not already exist in competition");
            preSlot.Should().Be(0, "preflight: the unique marker must not already exist in paidtimeslotincompetition");
            preReq.Should().Be(0, "preflight: the unique marker must not already exist in paidtimerequest");

            // ================= single write transaction (ALWAYS rolled back) =================
            NpgsqlTransaction tx = con.BeginTransaction();
            bool bodyThrew = false;
            try
            {
                // fabricate the isolated competition graph (all marked) -----------------------
                int comp = ScalarInt(con, tx,
                    "INSERT INTO competition(hostranchid, fieldid, createdbysystemuserid, competitionname, " +
                    "competitionstartdate, competitionenddate) " +
                    "VALUES(@ranch, @field, @su, @name, DATE '2999-01-01', DATE '2999-01-01') RETURNING competitionid",
                    ("@ranch", ranch.Value), ("@field", field.Value), ("@su", su.Value), ("@name", marker));

                int SlotIn(int arena) => ScalarInt(con, tx,
                    "INSERT INTO paidtimeslotincompetition(competitionid, paidtimeslotid, arenaranchid, arenaid, " +
                    "slotdate, starttime, endtime, ispublished, slotnotes) " +
                    "VALUES(@comp, @ps, @ranch, @arena, DATE '2999-01-01', TIME '08:00', TIME '12:00', FALSE, @name) " +
                    "RETURNING paidtimeslotincompid",
                    ("@comp", comp), ("@ps", ptslot.Value), ("@ranch", ranch.Value), ("@arena", arena), ("@name", marker));

                int slotA1 = SlotIn(arenaA);   // arena A
                int slotA2 = SlotIn(arenaA);   // arena A (same-arena coach test)
                int slotB = SlotIn(arenaB);    // arena B (cross-arena + cross-slot tests)

                int bill = ScalarInt(con, tx,
                    "INSERT INTO bill(paidbypersonid, amounttopay, dateopened, competitionid) " +
                    "VALUES(@p, 0, now(), @comp) RETURNING billid",
                    ("@p", payer.Value), ("@comp", comp));

                // fixture builders (fabricated rows only, always marked) -----------------------
                int MkAssigned(int rider, int coach, int horse, int slot) // Assigned at the slot's 08:00 start
                {
                    int id = ScalarInt(con, tx,
                        "INSERT INTO servicerequest(orderedbysystemuserid, horseid, riderfederationmemberid, " +
                        "coachfederationmemberid, billid, srequestdatetime) " +
                        "VALUES(@su, @h, @r, @c, @b, now()) RETURNING srequestid",
                        ("@su", su.Value), ("@h", horse), ("@r", rider), ("@c", coach), ("@b", bill));
                    Exec(con, tx,
                        "INSERT INTO paidtimerequest(paidtimerequestid, pricecatalogid, requestedcompslotid, " +
                        "assignedcompslotid, assignedstarttime, assignedorder, status, notes, allocationorigin) " +
                        "VALUES(@id, @pc, @slot, @slot, " +
                        "(SELECT (s.slotdate + s.starttime)::timestamptz FROM paidtimeslotincompetition s WHERE s.paidtimeslotincompid=@slot), " +
                        "1, 'Assigned', @name, 'Manual')",
                        ("@id", id), ("@pc", pc), ("@slot", slot), ("@name", marker));
                    return id;
                }

                int MkPending(int rider, int coach, int horse, int reqSlot)
                {
                    int id = ScalarInt(con, tx,
                        "INSERT INTO servicerequest(orderedbysystemuserid, horseid, riderfederationmemberid, " +
                        "coachfederationmemberid, billid, srequestdatetime) " +
                        "VALUES(@su, @h, @r, @c, @b, now()) RETURNING srequestid",
                        ("@su", su.Value), ("@h", horse), ("@r", rider), ("@c", coach), ("@b", bill));
                    Exec(con, tx,
                        "INSERT INTO paidtimerequest(paidtimerequestid, pricecatalogid, requestedcompslotid, " +
                        "status, notes) VALUES(@id, @pc, @slot, 'Pending', @name)",
                        ("@id", id), ("@pc", pc), ("@slot", reqSlot), ("@name", marker));
                    return id;
                }

                // apply one candidate to a target slot at (slot start + offsetMinutes) ---------
                string ApplyOne() =>
                    "SELECT usp_applyautoschedule(" +
                    " jsonb_build_array(jsonb_build_object(" +
                    "   'paidTimeRequestId', @cand, 'assignedCompSlotId', @slot," +
                    "   'assignedStartTime', (SELECT (s.slotdate + s.starttime)::timestamptz + (@off || ' minutes')::interval " +
                    "                         FROM paidtimeslotincompetition s WHERE s.paidtimeslotincompid=@slot)," +
                    "   'assignedOrder', 1, 'status', 'Assigned'))," +
                    " ARRAY[@cand]::integer[], @comp)";

                var results = new List<string>();

                // ---- RIDER overlap: same rider, diff coach/horse, cross-slot -> rejected ----
                tx.Save("rider");
                MkAssigned(fm[0], fm[1], hs[0], slotA1);
                int rCand = MkPending(fm[0], fm[2], hs[1], slotB);
                (bool rRej, string rErr) = TryApply(con, tx, ApplyOne(), ("@cand", rCand), ("@slot", slotB), ("@off", 0), ("@comp", comp));
                tx.Rollback("rider");
                rRej.Should().BeTrue("same-rider overlap must be rejected");
                rErr.Should().Contain("rider overlap");
                results.Add($"rider: rejected={rRej} ({rErr})");

                // ---- HORSE overlap: same horse, diff rider/coach, cross-slot -> rejected ----
                tx.Save("horse");
                MkAssigned(fm[3], fm[1], hs[0], slotA1);
                int hCand = MkPending(fm[4], fm[2], hs[0], slotB);
                (bool hRej, string hErr) = TryApply(con, tx, ApplyOne(), ("@cand", hCand), ("@slot", slotB), ("@off", 0), ("@comp", comp));
                tx.Rollback("horse");
                hRej.Should().BeTrue("same-horse overlap must be rejected");
                hErr.Should().Contain("horse overlap");
                results.Add($"horse: rejected={hRej} ({hErr})");

                // ---- COACH same-arena overlap -> rejected ----
                tx.Save("coach_same");
                MkAssigned(fm[3], fm[5], hs[0], slotA1);          // arena A
                int csCand = MkPending(fm[4], fm[5], hs[1], slotA2); // arena A, same coach fm[5]
                (bool csRej, string csErr) = TryApply(con, tx, ApplyOne(), ("@cand", csCand), ("@slot", slotA2), ("@off", 0), ("@comp", comp));
                tx.Rollback("coach_same");
                csRej.Should().BeTrue("same-coach same-arena overlap must be rejected");
                csErr.Should().Contain("coach overlap");
                results.Add($"coach_same_arena: rejected={csRej} ({csErr})");

                // ---- COACH cross-arena, gap < 7 min (adjacent) -> rejected ----
                // Frozen ends at 08:00+eff in arena A; candidate starts at 08:00+eff in arena B
                // (gap 0 < 7). Same-arena would NOT conflict; cross-arena does.
                tx.Save("coach_cross");
                MkAssigned(fm[3], fm[5], hs[0], slotA1);           // arena A, 08:00..08:00+eff
                int ccCand = MkPending(fm[4], fm[5], hs[1], slotB); // arena B, same coach fm[5]
                (bool ccRej, string ccErr) = TryApply(con, tx, ApplyOne(), ("@cand", ccCand), ("@slot", slotB), ("@off", coachGap), ("@comp", comp));
                tx.Rollback("coach_cross");
                ccRej.Should().BeTrue("same-coach cross-arena gap<7min must be rejected");
                ccErr.Should().Contain("coach overlap");
                results.Add($"coach_cross_arena_<7min: rejected={ccRej} ({ccErr})");

                // ---- VALID non-overlapping assignment -> succeeds inside a savepoint ----
                tx.Save("valid");
                int vCand = MkPending(fm[0], fm[1], hs[0], slotB); // unique vs the (empty) fixture competition
                int assignedCount = ScalarInt(con, tx, ApplyOne(), ("@cand", vCand), ("@slot", slotB), ("@off", 0), ("@comp", comp));
                string vStatus = ScalarString(con, tx,
                    "SELECT status FROM paidtimerequest WHERE paidtimerequestid=@c", ("@c", vCand));
                tx.Rollback("valid");
                assignedCount.Should().Be(1, "a valid non-overlapping plan assigns exactly one request");
                vStatus.Should().Be("Assigned");
                results.Add($"valid_success: assigned={assignedCount}, status={vStatus}");

                // ---- ATOMIC: 2-decision plan, 2nd overlaps (same rider) -> both Pending ----
                tx.Save("atomic");
                int a1 = MkPending(fm[0], fm[1], hs[0], slotA1);
                int a2 = MkPending(fm[0], fm[2], hs[1], slotB);
                tx.Save("atomic_call");
                string atomicSql =
                    "SELECT usp_applyautoschedule(" +
                    " jsonb_build_array(" +
                    "  jsonb_build_object('paidTimeRequestId', @a1, 'assignedCompSlotId', @s1," +
                    "    'assignedStartTime', (SELECT (s.slotdate + s.starttime)::timestamptz FROM paidtimeslotincompetition s WHERE s.paidtimeslotincompid=@s1)," +
                    "    'assignedOrder', 1, 'status', 'Assigned')," +
                    "  jsonb_build_object('paidTimeRequestId', @a2, 'assignedCompSlotId', @s2," +
                    "    'assignedStartTime', (SELECT (s.slotdate + s.starttime)::timestamptz FROM paidtimeslotincompetition s WHERE s.paidtimeslotincompid=@s2)," +
                    "    'assignedOrder', 1, 'status', 'Assigned'))," +
                    " ARRAY[@a1, @a2]::integer[], @comp)";
                (bool aRej, string aErr) = TryApply(con, tx, atomicSql,
                    ("@a1", a1), ("@s1", slotA1), ("@a2", a2), ("@s2", slotB), ("@comp", comp));
                tx.Rollback("atomic_call"); // recover the aborted tx to just before the failed apply
                string statuses = ScalarString(con, tx,
                    "SELECT string_agg(status, ',' ORDER BY paidtimerequestid) FROM paidtimerequest " +
                    "WHERE paidtimerequestid IN (@a1, @a2)", ("@a1", a1), ("@a2", a2));
                tx.Rollback("atomic");
                aRej.Should().BeTrue("a plan whose 2nd decision overlaps must be rejected");
                statuses.Should().Be("Pending,Pending", "no partial assignment may survive a rejected apply");
                results.Add($"atomic: rejected={aRej}, statuses=[{statuses}]");

                _output.WriteLine("APPLY_SP_OVERLAP_HARNESS results:\n  " + string.Join("\n  ", results));
            }
            catch
            {
                bodyThrew = true;
                throw;
            }
            finally
            {
                try
                {
                    tx.Rollback(); // ALWAYS roll back the outer transaction — the harness never commits.
                }
                catch (Exception rbEx)
                {
                    _output.WriteLine("OUTER ROLLBACK FAILED: " + rbEx.Message);
                    if (!bodyThrew)
                    {
                        throw; // rollback failure is the only error -> surface it (don't hide anything)
                    }
                    // else: a body error is already propagating; the rollback failure is reported above,
                    // and we do NOT overwrite/hide the original error.
                }
                finally
                {
                    tx.Dispose();
                }
            }

            // ============ post-rollback cleanup verification (SEPARATE connection) ============
            // Every fixture table that can hold the marker OR be linked to the fixture competition.
            using NpgsqlConnection verify = new HarnessDb().Open();
            int compsLeft = ScalarInt(verify, null, "SELECT count(*) FROM competition WHERE competitionname = @m", ("@m", marker));
            int slotsLeft = ScalarInt(verify, null, "SELECT count(*) FROM paidtimeslotincompetition WHERE slotnotes = @m", ("@m", marker));
            int requestsLeft = ScalarInt(verify, null, "SELECT count(*) FROM paidtimerequest WHERE notes = @m", ("@m", marker));
            int billsLeft = ScalarInt(verify, null,
                "SELECT count(*) FROM bill b JOIN competition c ON c.competitionid = b.competitionid WHERE c.competitionname = @m", ("@m", marker));
            int svcLeft = ScalarInt(verify, null,
                "SELECT count(*) FROM servicerequest sr JOIN paidtimerequest ptr ON ptr.paidtimerequestid = sr.srequestid WHERE ptr.notes = @m", ("@m", marker));

            _output.WriteLine($"post-rollback marked rows: competition={compsLeft}, slots={slotsLeft}, " +
                              $"requests={requestsLeft}, bills(linked)={billsLeft}, servicerequests(linked)={svcLeft}");
            compsLeft.Should().Be(0);
            slotsLeft.Should().Be(0);
            requestsLeft.Should().Be(0);
            billsLeft.Should().Be(0);
            svcLeft.Should().Be(0);
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
