using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using FluentAssertions;
using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.Competition.Entry;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // Stage B: DB schema + Admin Create primitives. No mocking framework and
    // no HTTP test host exist in this project (see
    // HealthCertificateApprovalContractTests / EntryDalInsertEntryCommandTests),
    // so this file proves the contract the same two ways already established
    // there -- reflection over public signatures, and bounded source-text
    // assertions over the real DAL/Controller/SP/migration files -- for
    // everything the actual boundary/idempotency/routing logic that lives in
    // SQL, not C#, cannot be unit tested directly.
    public class AdminCreateEntryContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ReadRepoFile(params string[] pathParts)
        {
            string path = Path.GetFullPath(
                Path.Combine(new[] { TestSourceDirectory(), ".." }.Concat(pathParts).ToArray()));

            File.Exists(path).Should().BeTrue("{0} was expected at {1}", pathParts[^1], path);

            return File.ReadAllText(path);
        }

        private static string ProcSource() =>
            ReadRepoFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "231_usp_AdminCreateEntry.sql");

        private static string MigrationSource() =>
            ReadRepoFile("RideOnDB", "migrations", "add_admincreateentry_tables.sql");

        private static string ControllerSource() =>
            ReadRepoFile("RideOnServer", "Controllers", "EntriesController.cs");

        private static string DalSource() =>
            ReadRepoFile("RideOnServer", "DAL", "EntryDAL.cs");

        private static int CountOccurrences(string haystack, string needle)
        {
            int count = 0;
            int index = 0;

            while ((index = haystack.IndexOf(needle, index, StringComparison.Ordinal)) != -1)
            {
                count++;
                index += needle.Length;
            }

            return count;
        }

        // =================================================================
        // 1. DDL: strict dependency order, RLS-no-policies, no ALTER OWNER,
        //    no forward FK references.
        // =================================================================

        [Fact]
        public void Migration_creates_tables_in_the_locked_dependency_order()
        {
            string source = MigrationSource();

            int createEntryRequestAt = source.IndexOf("CREATE TABLE public.createentryrequest", StringComparison.Ordinal);
            int operationAt = source.IndexOf("CREATE TABLE public.admincreateentryoperation ", StringComparison.Ordinal);
            int resultAt = source.IndexOf("CREATE TABLE public.admincreateentryoperationresult", StringComparison.Ordinal);

            createEntryRequestAt.Should().BeGreaterThan(-1);
            operationAt.Should().BeGreaterThan(-1);
            resultAt.Should().BeGreaterThan(-1);

            createEntryRequestAt.Should().BeLessThan(operationAt, "createentryrequest must exist before the tables that reference it");
            operationAt.Should().BeLessThan(resultAt, "admincreateentryoperation must exist before its own result child table");
        }

        [Fact]
        public void Migration_has_no_forward_fk_reference()
        {
            string source = MigrationSource();

            // admincreateentryoperationresult is the only table with FKs to the
            // other two -- both targets must already appear earlier in the file.
            int resultAt = source.IndexOf("CREATE TABLE public.admincreateentryoperationresult", StringComparison.Ordinal);
            int fkOperationAt = source.IndexOf("REFERENCES public.admincreateentryoperation(operationid)", StringComparison.Ordinal);
            int fkRequestAt = source.IndexOf("REFERENCES public.createentryrequest(createentryrequestid)", StringComparison.Ordinal);

            resultAt.Should().BeGreaterThan(-1);
            fkOperationAt.Should().BeGreaterThan(-1);
            fkRequestAt.Should().BeGreaterThan(-1);

            // Both FK target definitions must precede the result table's own
            // CREATE TABLE, proving neither is a forward reference.
            int createEntryRequestDefAt = source.IndexOf("CREATE TABLE public.createentryrequest", StringComparison.Ordinal);
            int operationDefAt = source.IndexOf("CREATE TABLE public.admincreateentryoperation ", StringComparison.Ordinal);

            createEntryRequestDefAt.Should().BeLessThan(resultAt);
            operationDefAt.Should().BeLessThan(resultAt);
        }

        [Theory]
        [InlineData("createentryrequest")]
        [InlineData("admincreateentryoperation")]
        [InlineData("admincreateentryoperationresult")]
        public void Every_new_table_enables_rls_with_no_policies(string tableName)
        {
            string source = MigrationSource();

            source.Should().Contain($"ALTER TABLE public.{tableName} ENABLE ROW LEVEL SECURITY;");
            source.Should().NotContain($"CREATE POLICY", "the locked design uses RLS-enabled-no-policies, matching changeentryrequest/federationallocationrequest*");
        }

        [Fact]
        public void Migration_never_alters_ownership()
        {
            // ALTER TABLE itself is legitimately present three times, once per
            // table, to ENABLE ROW LEVEL SECURITY -- what must never appear is
            // an ownership change.
            string source = MigrationSource();

            source.Should().NotContain("OWNER TO", "owner is inherited from the migration role, never set explicitly");
            source.Should().NotContain("ALTER OWNER");

            // Match the actual SQL statement shape, not bare substrings that
            // could also appear in prose comments describing the same thing.
            Regex.Matches(source, @"ALTER TABLE public\.\w+ ENABLE ROW LEVEL SECURITY;")
                .Count
                .Should()
                .Be(3, "exactly one ENABLE ROW LEVEL SECURITY statement per new table, nothing else");
        }

        [Fact]
        public void Admincreateentryoperation_has_no_ranchid_column_scope_is_via_fingerprint_only()
        {
            // Documents the deliberate choice: personId and competitionId get
            // explicit stored columns (and their own distinct rejection
            // messages in the proc); ranchId scope rides on the fingerprint
            // alone, per the locked design's explicit "either/or" allowance.
            string source = MigrationSource();

            int operationAt = source.IndexOf("CREATE TABLE public.admincreateentryoperation ", StringComparison.Ordinal);
            int closeAt = source.IndexOf(");", operationAt, StringComparison.Ordinal);

            string tableBody = source.Substring(operationAt, closeAt - operationAt);

            tableBody.Should().Contain("competitionid");
            tableBody.Should().Contain("requestedbypersonid");
            tableBody.Should().NotContain("ranchid");
        }

        [Fact]
        public void Result_table_has_a_check_constraint_tying_resulttype_to_createentryrequestid_nullability()
        {
            string source = MigrationSource();

            source.Should().Contain("CONSTRAINT ck_admincreateentryoperationresult_createentryrequestid_matches_type");
            source.Should().Contain("(resulttype = 'DirectCreated' AND createentryrequestid IS NULL)");
            source.Should().Contain("(resulttype = 'PendingCreateApproval' AND createentryrequestid IS NOT NULL)");

            int resultAt = source.IndexOf("CREATE TABLE public.admincreateentryoperationresult", StringComparison.Ordinal);
            int checkAt = source.IndexOf("ck_admincreateentryoperationresult_createentryrequestid_matches_type", StringComparison.Ordinal);
            int closeAt = source.IndexOf(");", checkAt, StringComparison.Ordinal);

            resultAt.Should().BeGreaterThan(-1);
            checkAt.Should().BeGreaterThan(resultAt, "the CHECK constraint must live inside the result table's own CREATE TABLE statement");
            closeAt.Should().BeGreaterThan(checkAt);
        }

        [Fact]
        public void Result_table_keeps_entryid_not_null_for_both_result_types()
        {
            string source = MigrationSource();

            int resultAt = source.IndexOf("CREATE TABLE public.admincreateentryoperationresult", StringComparison.Ordinal);
            int closeAt = source.IndexOf(");", resultAt, StringComparison.Ordinal);
            string tableBody = source.Substring(resultAt, closeAt - resultAt);

            tableBody.Should().Contain("entryid                       integer     NOT NULL REFERENCES public.entry(entryid)");
        }

        // =================================================================
        // 2. usp_admincreateentry: idempotency claim/replay shape.
        // =================================================================

        [Fact]
        public void Proc_claims_the_operation_via_insert_on_conflict_do_nothing()
        {
            ProcSource().Should().Contain("on conflict (operationid) do nothing");
        }

        [Fact]
        public void Proc_checks_actor_then_competition_then_fingerprint_in_that_order()
        {
            string source = ProcSource();

            int actorAt = source.IndexOf("if v_existing_personid <> p_personid then", StringComparison.Ordinal);
            int competitionAt = source.IndexOf("if v_existing_competitionid <> p_competitionid then", StringComparison.Ordinal);
            int fingerprintAt = source.IndexOf("if v_existing_fingerprint <> v_fingerprint then", StringComparison.Ordinal);

            actorAt.Should().BeGreaterThan(-1);
            competitionAt.Should().BeGreaterThan(-1);
            fingerprintAt.Should().BeGreaterThan(-1);

            actorAt.Should().BeLessThan(competitionAt, "actor mismatch is a security boundary and must be checked first");
            competitionAt.Should().BeLessThan(fingerprintAt);
        }

        [Fact]
        public void Proc_rejects_actor_mismatch_and_competition_mismatch_and_payload_mismatch_with_rn001()
        {
            string source = ProcSource();

            source.Should().Contain("'Operation id belongs to a different actor' using errcode = 'RN001'");
            source.Should().Contain("'Operation id was issued for a different competition' using errcode = 'RN001'");
            source.Should().Contain("'This operation id was already used with a different payload' using errcode = 'RN001'");
        }

        [Fact]
        public void Proc_replays_resulttype_entryid_and_createentryrequestid_on_match()
        {
            ProcSource().Should().Contain(
                "return query select v_existing_resulttype, v_existing_entryid, v_existing_createentryrequestid;");
        }

        [Fact]
        public void Fingerprint_includes_every_locked_field_in_order()
        {
            string source = ProcSource();

            string[] expectedInOrder =
            {
                "'AdminCreateEntry'",
                "p_personid::text",
                "p_competitionid::text",
                "p_ranchid::text",
                "p_classincompid::text",
                "p_horseid::text",
                "p_riderfederationmemberid::text",
                "coalesce(p_coachfederationmemberid::text, '')",
                "p_paidbypersonid::text",
                "coalesce(nullif(btrim(p_prizerecipientname), ''), '')"
            };

            int lastIndex = -1;

            foreach (string token in expectedInOrder)
            {
                int at = source.IndexOf(token, lastIndex + 1, StringComparison.Ordinal);
                at.Should().BeGreaterThan(lastIndex, $"'{token}' must appear, in order, in the fingerprint expression");
                lastIndex = at;
            }
        }

        [Fact]
        public void Prizerecipientname_normalization_matches_the_locked_expression_exactly()
        {
            ProcSource().Should().Contain("coalesce(nullif(btrim(p_prizerecipientname), ''), '')");
        }

        [Fact]
        public void Operation_result_is_inserted_as_the_final_statement_of_both_success_branches()
        {
            string source = ProcSource();

            int directResultAt = source.IndexOf("v_resulttype := 'DirectCreated';", StringComparison.Ordinal);
            int pendingResultAt = source.IndexOf("v_resulttype := 'PendingCreateApproval';", StringComparison.Ordinal);
            int resultInsertAt = source.IndexOf("insert into public.admincreateentryoperationresult", StringComparison.Ordinal);
            int finalReturnAt = source.LastIndexOf("return query select v_resulttype, v_entryid, v_createentryrequestid;", StringComparison.Ordinal);

            directResultAt.Should().BeGreaterThan(-1);
            pendingResultAt.Should().BeGreaterThan(-1);
            resultInsertAt.Should().BeGreaterThan(-1);
            finalReturnAt.Should().BeGreaterThan(-1);

            directResultAt.Should().BeLessThan(resultInsertAt);
            pendingResultAt.Should().BeLessThan(resultInsertAt);
            resultInsertAt.Should().BeLessThan(finalReturnAt, "the result row must be the last write before returning");
        }

        [Fact]
        public void No_update_statement_exists_on_the_operation_tables_only_inserts()
        {
            // The whole point of the parent/child split: never an UPDATE that
            // could leave a partially-populated row visible to another
            // transaction. Matches the proven federationallocationrequest
            // pattern exactly.
            string source = ProcSource();

            source.Should().NotContain("update public.admincreateentryoperation");
            source.Should().NotContain("update public.admincreateentryoperationresult");
        }

        // =================================================================
        // 2a. usp_admincreateentry: OperationId validation -- null/empty/
        //     whitespace all rejected via RN001, canonicalized once into
        //     v_operationid, an explicit length ceiling, and that same
        //     canonical value used everywhere downstream (claim insert,
        //     both replay lookups, final result insert).
        // =================================================================

        [Fact]
        public void Null_or_empty_or_whitespace_only_operationid_is_rejected_via_rn001()
        {
            ProcSource().Should().Contain(
                "if p_operationid is null or length(trim(p_operationid)) = 0 then");
            ProcSource().Should().Contain(
                "raise exception 'Operation id is required' using errcode = 'RN001';");
        }

        [Fact]
        public void Operationid_is_canonicalized_once_into_a_single_variable_before_any_use()
        {
            string source = ProcSource();

            int nullCheckAt = source.IndexOf(
                "if p_operationid is null or length(trim(p_operationid)) = 0 then", StringComparison.Ordinal);
            int canonicalizeAt = source.IndexOf(
                "v_operationid := trim(p_operationid);", StringComparison.Ordinal);
            int lengthCheckAt = source.IndexOf(
                "if length(v_operationid) > 200 then", StringComparison.Ordinal);

            nullCheckAt.Should().BeGreaterThan(-1);
            canonicalizeAt.Should().BeGreaterThan(-1);
            lengthCheckAt.Should().BeGreaterThan(-1);

            nullCheckAt.Should().BeLessThan(canonicalizeAt, "the null/empty/whitespace guard must run before trimming into the canonical variable");
            canonicalizeAt.Should().BeLessThan(lengthCheckAt, "the length ceiling must be enforced against the already-trimmed canonical value");
        }

        [Fact]
        public void Operationid_over_the_length_ceiling_is_rejected_via_rn001()
        {
            string source = ProcSource();

            source.Should().Contain("if length(v_operationid) > 200 then");
            source.Should().Contain(
                "raise exception 'Operation id exceeds the maximum allowed length of 200 characters' using errcode = 'RN001';");
        }

        [Fact]
        public void Every_downstream_use_of_operationid_uses_the_canonical_trimmed_variable_not_the_raw_parameter()
        {
            string source = ProcSource();

            // Claim insert, both replay lookups (parent + result table), and
            // the final result insert must all key off v_operationid -- never
            // the raw p_operationid, which was never trimmed or length-capped.
            source.Should().Contain("(v_operationid, p_competitionid, p_personid, v_fingerprint)");
            source.Should().Contain("where operationid = v_operationid;");
            source.Should().Contain("where r.operationid = v_operationid;");
            source.Should().Contain("(v_operationid, v_resulttype, v_entryid, v_createentryrequestid);");

            // p_operationid itself must appear only in the declaration and the
            // initial null/empty/whitespace validation -- never after
            // v_operationid has been assigned.
            int assignedAt = source.IndexOf("v_operationid := trim(p_operationid);", StringComparison.Ordinal);
            assignedAt.Should().BeGreaterThan(-1);

            string afterAssignment = source.Substring(assignedAt + "v_operationid := trim(p_operationid);".Length);
            afterAssignment.Should().NotContain(
                "p_operationid",
                "once v_operationid is assigned, every reference to the operation id must use the canonical variable");
        }

        // =================================================================
        // 3. usp_admincreateentry: payer authorization (new, not in
        //    usp_insertentry).
        // =================================================================

        [Fact]
        public void Payer_authorization_allows_self_pay_or_approved_managed_payer_in_the_correct_ranch()
        {
            string source = ProcSource();

            source.Should().Contain("p_paidbypersonid = p_personid");
            source.Should().Contain("pmsu.approvalstatus = 'Approved'");
            source.Should().Contain("prr.ranchid = p_ranchid");
            source.Should().Contain("prr.rolestatus = 'Approved'");
            source.Should().Contain("r.rolename = 'משלם'");
            source.Should().Contain("'Requested payer is not authorized for this admin' using errcode = 'RN001'");
        }

        // =================================================================
        // 4. usp_admincreateentry: registration-ended routing, reproducing
        //    Stage A's exact formula.
        // =================================================================

        [Fact]
        public void Registration_ended_case_expression_matches_stage_a_exactly()
        {
            string source = ProcSource();

            source.Should().Contain("when v_registrationenddate is not null");
            source.Should().Contain(
                "then (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_registrationenddate");
            source.Should().Contain("when v_competitionstartdate is not null");
            source.Should().Contain(
                "then (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date >= v_competitionstartdate");
            source.Should().Contain("else false");
        }

        [Fact]
        public void Routing_branches_on_the_server_computed_flag_never_a_client_supplied_one()
        {
            string source = ProcSource();

            // No parameter named anything like p_isregistrationended /
            // p_registrationended exists in the function signature.
            source.Should().NotMatchRegex(@"p_(is)?registrationended\s+boolean");

            source.Should().Contain("if not v_isregistrationended then");
        }

        // =================================================================
        // 5. usp_admincreateentry: direct vs pending branch behavior.
        // =================================================================

        [Fact]
        public void Direct_branch_creates_organizer_and_federation_charges_when_positive()
        {
            string source = ProcSource();

            int branchAt = source.IndexOf("if not v_isregistrationended then", StringComparison.Ordinal);
            int elseAt = source.IndexOf("else", branchAt, StringComparison.Ordinal);

            branchAt.Should().BeGreaterThan(-1);
            elseAt.Should().BeGreaterThan(branchAt);

            string directBranch = source.Substring(branchAt, elseAt - branchAt);

            directBranch.Should().Contain("if v_organizercost > 0 then");
            directBranch.Should().Contain("'Organizer'");
            directBranch.Should().Contain("if v_federationcost > 0 then");
            directBranch.Should().Contain("'Federation'");
            directBranch.Should().Contain("'Open'");
            directBranch.Should().Contain("perform public.usp_recalculatebillamount(v_billid);");
        }

        [Fact]
        public void Pending_branch_creates_no_billcharge_row_at_all()
        {
            string source = ProcSource();

            int elseAt = source.LastIndexOf("else", StringComparison.Ordinal);
            int endIfAt = source.IndexOf("end if;", elseAt, StringComparison.Ordinal);

            elseAt.Should().BeGreaterThan(-1);
            endIfAt.Should().BeGreaterThan(elseAt);

            string pendingBranch = source.Substring(elseAt, endIfAt - elseAt);

            pendingBranch.Should().NotContain("insert into public.billcharge");
            pendingBranch.Should().Contain("'Proposed'");
            pendingBranch.Should().Contain("insert into public.createentryrequest (proposedentryid, status)");
            pendingBranch.Should().Contain("values (v_entryid, 'Pending')");
        }

        [Fact]
        public void Pending_branch_inserts_exactly_one_createentryrequest_row()
        {
            CountOccurrences(ProcSource(), "insert into public.createentryrequest").Should().Be(1);
        }

        [Fact]
        public void Both_entry_insert_branches_qualify_the_returned_entryid_column()
        {
            // usp_admincreateentry declares RETURNS TABLE(..., entryid integer, ...),
            // which makes entryid an implicit PL/pgSQL output variable throughout the
            // function body. A bare "returning entryid" on the entry insert is
            // therefore ambiguous between that output variable and entry.entryid,
            // and fails live with PostgreSQL 42702. Both branches must instead
            // return the table-qualified column.
            string source = ProcSource();

            CountOccurrences(source, "returning public.entry.entryid").Should().Be(
                2, "both the Direct and Pending branches insert into entry and must both qualify the RETURNING column");

            Regex.IsMatch(source, @"returning\s+entryid\b").Should().BeFalse(
                "no bare, unqualified 'returning entryid' may remain anywhere in the proc");
        }

        [Fact]
        public void Public_return_shape_still_names_the_second_column_entryid()
        {
            // The RETURNING fix must not touch the function's own public contract --
            // callers (EntryDAL) still read reader["entryid"] by that exact name.
            ProcSource().Should().Contain("RETURNS TABLE(\n    resulttype text,\n    entryid integer,\n    createentryrequestid integer\n)");
        }

        // =================================================================
        // 6. usp_admincreateentry: reused usp_insertentry validations present
        //    verbatim.
        // =================================================================

        [Theory]
        [InlineData("raise exception 'Class not found';")]
        [InlineData("raise exception 'Competition has already ended' using errcode = 'RN001';")]
        [InlineData("raise exception 'Horse not found';")]
        [InlineData("raise exception 'Horse does not belong to your ranch';")]
        [InlineData("raise exception 'Rider not found';")]
        [InlineData("raise exception 'Coach not found';")]
        [InlineData("raise exception 'Payer not found';")]
        public void Reused_usp_insertentry_validation_is_present_verbatim(string expectedRaise)
        {
            ProcSource().Should().Contain(expectedRaise);
        }

        [Fact]
        public void Cost_is_sourced_from_classincompetition_exactly_like_usp_insertentry()
        {
            string source = ProcSource();

            source.Should().Contain("coalesce(cic.organizercost, 0)");
            source.Should().Contain("coalesce(cic.federationcost, 0)");
        }

        [Fact]
        public void Bill_is_resolved_via_the_shared_helper_proc_not_reimplemented()
        {
            ProcSource().Should().Contain(
                "public.usp_getorcreateopenbillforpayerandcompetition(");
        }

        [Fact]
        public void Competition_id_is_cross_checked_against_the_classs_real_competition()
        {
            ProcSource().Should().Contain(
                "if v_actual_competitionid <> p_competitionid then");
        }

        // =================================================================
        // 7. C# DTOs: shape.
        // =================================================================

        [Fact]
        public void Request_dto_exposes_operationid_and_every_locked_field()
        {
            Type type = typeof(AdminCreateEntryRequest);

            foreach (string propertyName in new[]
                     {
                         "OperationId", "CompetitionId", "RanchId", "ClassInCompId",
                         "HorseId", "RiderFederationMemberId", "CoachFederationMemberId",
                         "PaidByPersonId", "PrizeRecipientName"
                     })
            {
                type.GetProperty(propertyName).Should().NotBeNull($"{propertyName} must exist on AdminCreateEntryRequest");
            }

            type.GetProperty("OperationId")!.PropertyType.Should().Be(typeof(string));
            type.GetProperty("CoachFederationMemberId")!.PropertyType.Should().Be(typeof(int?));
        }

        [Fact]
        public void Request_dto_does_not_expose_a_client_controlled_personid()
        {
            Type type = typeof(AdminCreateEntryRequest);

            type.GetProperty("PersonId").Should().BeNull(
                "the acting admin's identity must come only from the JWT, never from the request body");

            type.GetProperties().Select(p => p.Name).Should().NotContain(
                name => name.Contains("Person", StringComparison.OrdinalIgnoreCase)
                        && !name.Equals("PaidByPersonId", StringComparison.Ordinal),
                "no property other than the explicit payer field PaidByPersonId may reference a person id");
        }

        [Fact]
        public void Response_dto_matches_the_locked_shape()
        {
            Type type = typeof(AdminCreateEntryResult);

            type.GetProperty("ResultType")!.PropertyType.Should().Be(typeof(string));
            type.GetProperty("EntryId")!.PropertyType.Should().Be(typeof(int));
            type.GetProperty("CreateEntryRequestId")!.PropertyType.Should().Be(typeof(int?));
        }

        // =================================================================
        // 8. EntryDAL.BuildAdminCreateEntryCommand: named-parameter binding,
        //    same technique and same regression class as
        //    EntryDalInsertEntryCommandTests.
        // =================================================================

        private const int CoachSentinel = 888888;
        private const int PayerSentinel = 222222;
        private const int ActingPersonSentinel = 909;

        private static AdminCreateEntryRequest Request(int? coach = CoachSentinel)
        {
            return new AdminCreateEntryRequest
            {
                OperationId = "OPID-SENTINEL",
                CompetitionId = 606,
                RanchId = 303,
                ClassInCompId = 101,
                HorseId = 404,
                RiderFederationMemberId = 505,
                CoachFederationMemberId = coach,
                PaidByPersonId = PayerSentinel,
                PrizeRecipientName = "SENTINEL-PRIZE"
            };
        }

        private static object? ValueOf(NpgsqlCommand command, string parameterName)
        {
            command.Parameters.Contains(parameterName).Should().BeTrue($"the command must bind {parameterName}");
            return command.Parameters[parameterName].Value;
        }

        public static TheoryData<string, string> ExpectedArgumentMapping =>
            new TheoryData<string, string>
            {
                { "p_operationid", "@operationId" },
                { "p_personid", "@personId" },
                { "p_competitionid", "@competitionId" },
                { "p_ranchid", "@ranchId" },
                { "p_classincompid", "@classInCompId" },
                { "p_horseid", "@horseId" },
                { "p_riderfederationmemberid", "@riderFederationMemberId" },
                { "p_coachfederationmemberid", "@coachFederationMemberId" },
                { "p_paidbypersonid", "@paidByPersonId" },
                { "p_prizerecipientname", "@prizeRecipientName" }
            };

        [Theory]
        [MemberData(nameof(ExpectedArgumentMapping))]
        public void BuildAdminCreateEntryCommand_MapsEachArgumentByNameExactlyOnce(
            string pgArgumentName,
            string npgsqlParameterName)
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminCreateEntryCommand(Request(), ActingPersonSentinel, null);

            Regex.Matches(command.CommandText, Regex.Escape(pgArgumentName)).Count.Should().Be(1);

            Regex.Matches(
                    command.CommandText,
                    Regex.Escape(pgArgumentName) + @"\s*:=\s*" + Regex.Escape(npgsqlParameterName))
                .Count
                .Should()
                .Be(1, $"{pgArgumentName} must be mapped explicitly to {npgsqlParameterName}");

            command.Parameters.Contains(npgsqlParameterName).Should().BeTrue();
        }

        [Fact]
        public void BuildAdminCreateEntryCommand_BindsAllTenParametersWithCorrectTypesAndValues()
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminCreateEntryCommand(Request(), ActingPersonSentinel, null);

            command.CommandText.Should().Contain("public.usp_admincreateentry");
            command.Parameters.Count.Should().Be(10);

            command.Parameters["@operationId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Text);
            command.Parameters["@prizeRecipientName"].NpgsqlDbType.Should().Be(NpgsqlDbType.Varchar);

            foreach (string integerParameter in new[]
                     {
                         "@personId", "@competitionId", "@ranchId", "@classInCompId", "@horseId",
                         "@riderFederationMemberId", "@coachFederationMemberId", "@paidByPersonId"
                     })
            {
                command.Parameters[integerParameter].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            }

            ValueOf(command, "@operationId").Should().Be("OPID-SENTINEL");
            ValueOf(command, "@personId").Should().Be(ActingPersonSentinel);
            ValueOf(command, "@coachFederationMemberId").Should().Be(CoachSentinel);
            ValueOf(command, "@paidByPersonId").Should().Be(PayerSentinel);
            ValueOf(command, "@coachFederationMemberId").Should().NotBe(PayerSentinel);
            ValueOf(command, "@paidByPersonId").Should().NotBe(CoachSentinel);
            ValueOf(command, "@personId").Should().NotBe(PayerSentinel);
        }

        [Fact]
        public void BuildAdminCreateEntryCommand_NullCoach_KeepsPayerIntact()
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminCreateEntryCommand(Request(coach: null), ActingPersonSentinel, null);

            ValueOf(command, "@coachFederationMemberId").Should().Be(DBNull.Value);
            ValueOf(command, "@paidByPersonId").Should().Be(PayerSentinel);
        }

        [Fact]
        public void BuildAdminCreateEntryCommand_DoesNotUsePositionalStoredProcedureHelper()
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminCreateEntryCommand(Request(), ActingPersonSentinel, null);

            command.CommandText.Should().NotMatchRegex(@"@p\d+\b");

            foreach (NpgsqlParameter parameter in command.Parameters)
            {
                parameter.ParameterName.Should().NotMatchRegex(@"^p\d+$");
            }
        }

        [Fact]
        public void Dal_maps_rn001_to_validation_exception_same_convention_as_insertentry()
        {
            string source = DalSource();

            int from = source.IndexOf("public AdminCreateEntryResult AdminCreateEntry(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string rest = source.Substring(from);
            int to = rest.IndexOf("public List<PaidTimeCandidateItem>", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string methodBody = rest.Substring(0, to);

            methodBody.Should().Contain("catch (PostgresException ex) when (ex.SqlState == \"RN001\")");
            methodBody.Should().Contain("throw new BL.ValidationException(ex.MessageText);");
        }

        [Fact]
        public void Dal_reads_the_full_result_shape_by_lowercase_column_name()
        {
            string source = DalSource();

            source.Should().Contain("reader[\"resulttype\"]");
            source.Should().Contain("reader[\"entryid\"]");
            source.Should().Contain("reader[\"createentryrequestid\"]");
        }

        // =================================================================
        // 9. Controller: route, auth, RN001 mapping, response shape --
        //    and proof POST /Entries itself is untouched.
        // =================================================================

        private static string AdminCreateMethodBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult AdminCreateEntry(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "AdminCreateEntry action was expected in EntriesController");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "Console.WriteLine($\"Error in AdminCreateEntry:",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void Admin_create_route_is_a_dedicated_post_action_under_admin_create()
        {
            ControllerSource().Should().Contain("[HttpPost(\"admin-create\")]");
        }

        [Fact]
        public void Admin_create_requires_ranchadmin_role_from_jwt_derived_personid()
        {
            string body = AdminCreateMethodBody();

            body.Should().Contain("int personId = UserAccessValidator.GetPersonIdFromClaims(User);");
            body.Should().Contain("RoleNames.RanchAdmin");
            body.Should().NotContain(
                "request.PersonId = personId;",
                "AdminCreateEntryRequest no longer has a PersonId property to overwrite -- personId is passed as its own method argument");
        }

        [Fact]
        public void Admin_create_maps_validation_exception_to_409()
        {
            string body = AdminCreateMethodBody();

            body.Should().Contain("catch (ValidationException ex)");
            body.Should().Contain("StatusCode(StatusCodes.Status409Conflict, ex.Message)");
        }

        [Fact]
        public void Admin_create_returns_the_result_dto_directly()
        {
            string body = AdminCreateMethodBody();

            body.Should().Contain("AdminCreateEntryResult result = Entry.AdminCreateEntry(request, personId);");
            body.Should().Contain("return Ok(result);");
        }

        [Fact]
        public void Post_entries_createentry_action_is_completely_unchanged()
        {
            // Byte-for-byte the same body this codebase already had before
            // Stage B -- proves the new endpoint was added alongside it, not
            // by editing it.
            string source = ControllerSource();

            int from = source.IndexOf("public IActionResult CreateEntry(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string rest = source.Substring(from);
            int to = rest.IndexOf("Console.WriteLine($\"Error in CreateEntry:", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string createEntryBody = rest.Substring(0, to);

            createEntryBody.Should().Contain("request.OrderedBySystemUserId = personId;");
            createEntryBody.Should().Contain("int entryId = Entry.CreateEntry(request);");
            createEntryBody.Should().Contain("return Ok(new");
            createEntryBody.Should().Contain("EntryId = entryId,");
            createEntryBody.Should().Contain("Message = \"Entry created successfully\"");
            createEntryBody.Should().NotContain(
                "AdminCreateEntryResult",
                "CreateEntry's own body must never reference the new Stage B response type");

            // And the two actions must be genuinely distinct routes.
            CountOccurrences(source, "[HttpPost]").Should().BeGreaterThan(0);
            source.Should().Contain("[HttpPost(\"admin-create\")]");
        }
    }
}
