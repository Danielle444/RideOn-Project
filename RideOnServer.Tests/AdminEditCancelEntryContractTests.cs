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
    // Stage C: admin direct edit and admin direct cancel. Same two-technique
    // approach already established by AdminCreateEntryContractTests --
    // reflection over public signatures, and bounded source-text assertions
    // over the real SP/Controller/DAL files -- for everything the actual
    // routing/composition/authorization logic that lives in SQL, not C#,
    // cannot be unit tested directly.
    public class AdminEditCancelEntryContractTests
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

        private static string EditProcSource() =>
            ReadRepoFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "232_usp_AdminEditEntry.sql");

        private static string CancelProcSource() =>
            ReadRepoFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "233_usp_AdminCancelEntry.sql");

        private static string AdminRanchSecuredHelperSource() =>
            ReadRepoFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                "234_usp_InsertChangeEntryRequestAdminRanchSecured.sql");

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
        // 1. usp_admineditentry: authorization, reused verbatim from 218.
        // =================================================================

        [Fact]
        public void Edit_proc_reuses_the_change_request_authorization_context_verbatim()
        {
            string source = EditProcSource();

            source.Should().Contain("from public.usp_getchangeentryrequestauthorizationcontext(");
            source.Should().Contain("if not v_ctx.entryexists then");
            source.Should().Contain("if v_ctx.actualcompetitionid <> p_competitionid then");
            source.Should().Contain("if not v_ctx.iswithinmodelcscope then");
            source.Should().Contain("if v_ctx.iscompetitionended then");
        }

        [Fact]
        public void Edit_proc_reuses_the_exact_218_rejection_messages()
        {
            string source = EditProcSource();

            source.Should().Contain("'Original entry not found' using errcode = 'RN001'");
            source.Should().Contain("'Competition id does not match the entry''s actual competition' using errcode = 'RN001'");
            source.Should().Contain("'Caller is not an approved ranch admin for this entry''s ranch' using errcode = 'RN001'");
            source.Should().Contain("'Caller is not authorized to modify this entry' using errcode = 'RN001'");
            source.Should().Contain("'Competition has already ended' using errcode = 'RN001'");
        }

        [Fact]
        public void Edit_proc_never_hardcodes_a_new_authorization_predicate()
        {
            // Model C's own predicate (personmanagedbysystemuser/personranchrole
            // join shape) must never be reproduced here -- it belongs
            // exclusively to 218, called as a sub-routine.
            string source = EditProcSource();

            source.Should().NotContain("personmanagedbysystemuser");
            source.Should().NotContain("rolename = 'משלם'");
        }

        [Fact]
        public void Edit_proc_never_gates_on_218s_host_ranch_scoped_role_column()
        {
            // isranchadmininhostranch is scoped to the competition's HOST
            // ranch inside 218 -- correct for 218's own existing caller, but
            // wrong here: Stage B already proved p_ranchid represents the
            // admin's own/represented ranch, which routinely differs from
            // the host ranch. That column must never gate this proc.
            EditProcSource().Should().NotContain("v_ctx.isranchadmininhostranch");
        }

        [Fact]
        public void Edit_proc_re_derives_the_ranchadmin_role_check_scoped_to_p_ranchid()
        {
            string source = EditProcSource();

            source.Should().Contain("from public.personranchrole prr");
            source.Should().Contain("join public.role r on r.roleid = prr.roleid");
            source.Should().Contain("prr.personid = p_personid");
            source.Should().Contain("prr.ranchid = p_ranchid");
            source.Should().Contain("prr.rolestatus = 'Approved'");
            source.Should().Contain("r.rolename = 'אדמין חווה'");
        }

        // =================================================================
        // 2. usp_admineditentry: retry/duplicate-mutation guards.
        // =================================================================

        [Fact]
        public void Edit_proc_rejects_a_terminal_or_already_superseded_entry()
        {
            string source = EditProcSource();

            source.Should().Contain(
                "if v_current_entrystatus in ('Cancelled', 'CancelledAfterStart', 'Replaced', 'Rejected') then");
            source.Should().Contain(
                "'Entry is no longer active and cannot be edited' using errcode = 'RN001'");
        }

        [Fact]
        public void Edit_proc_rejects_when_a_pending_change_request_already_exists()
        {
            string source = EditProcSource();

            source.Should().Contain("cer.status = 'Pending'");
            source.Should().Contain("'A pending change request already exists for this entry' using errcode = 'RN001'");
        }

        [Fact]
        public void Edit_proc_rejects_a_paid_entry_using_the_exact_219_message()
        {
            EditProcSource().Should().Contain(
                "'Cannot create change request for a paid entry' using errcode = 'RN001'");
        }

        [Fact]
        public void Edit_proc_never_accepts_a_client_supplied_payer()
        {
            // Payer reassignment is out of scope for this slice -- the
            // replacement entry always inherits the original entry's bill.
            string source = EditProcSource();

            source.Should().NotMatchRegex(@"p_paidbypersonid\s+integer");
            source.Should().Contain("select b.paidbypersonid, sr.billid");
        }

        // =================================================================
        // 3. usp_admineditentry: three-way routing.
        // =================================================================

        [Fact]
        public void Edit_proc_branches_on_the_entrys_actual_current_class_never_a_client_flag()
        {
            string source = EditProcSource();

            source.Should().Contain("select e.classincompid, coalesce(e.entrystatus, 'Active')");
            source.Should().Contain("if p_classincompid = v_current_classincompid then");
        }

        [Fact]
        public void Case1_unchanged_class_is_a_true_in_place_update_with_no_change_request()
        {
            string source = EditProcSource();

            int branchAt = source.IndexOf("if p_classincompid = v_current_classincompid then", StringComparison.Ordinal);
            int endAt = source.IndexOf("-- ===== Class changed:", branchAt, StringComparison.Ordinal);

            branchAt.Should().BeGreaterThan(-1);
            endAt.Should().BeGreaterThan(branchAt);

            string case1 = source.Substring(branchAt, endAt - branchAt);

            case1.Should().Contain("update public.entry");
            case1.Should().Contain("update public.servicerequest");
            case1.Should().NotContain("insert into public.entry");
            case1.Should().NotContain("insert into public.changeentryrequest");
            case1.Should().NotContain("usp_insertchangeentryrequestsecured");
            case1.Should().NotContain("usp_insertchangeentryrequestadminranchsecured");
            case1.Should().Contain("'DirectUpdated'");
        }

        [Fact]
        public void Case1_result_shape_has_null_changeentryrequestid_and_the_original_entryid()
        {
            string source = EditProcSource();

            int branchAt = source.IndexOf("v_resulttype := 'DirectUpdated';", StringComparison.Ordinal);
            branchAt.Should().BeGreaterThan(-1);

            string rest = source.Substring(branchAt, 200);
            rest.Should().Contain("v_result_entryid := p_entryid;");
            rest.Should().Contain("v_changeentryrequestid := null;");
        }

        [Fact]
        public void Registration_ended_case_expression_matches_stage_a_exactly()
        {
            string source = EditProcSource();

            source.Should().Contain("when v_registrationenddate is not null");
            source.Should().Contain(
                "then (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_registrationenddate");
            source.Should().Contain("when v_competitionstartdate is not null");
            source.Should().Contain(
                "then (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date >= v_competitionstartdate");
            source.Should().Contain("else false");
        }

        [Fact]
        public void Routing_never_accepts_a_client_supplied_registration_ended_flag()
        {
            EditProcSource().Should().NotMatchRegex(@"p_(is)?registrationended\s+boolean");
        }

        [Fact]
        public void Case2_open_registration_creates_active_default_entry_and_immediately_approves()
        {
            string source = EditProcSource();

            // Case 2's new entry insert has no explicit entrystatus column --
            // entrystatus is left at its schema default ('Active'), matching
            // usp_admincreateentry's own Direct branch exactly.
            source.Should().Contain(
                "(entryid, classincompid, prizerecipientname, riderfederationmemberid)\n        values");
        }

        [Fact]
        public void Case2_and_case3_both_qualify_the_returned_entryid_column()
        {
            // Same RETURNS TABLE ambiguity class already fixed live in
            // usp_admincreateentry (231) -- entryid is an implicit output
            // variable here too (RETURNS TABLE includes an entryid column),
            // so every entry insert in this proc must qualify its RETURNING.
            string source = EditProcSource();

            CountOccurrences(source, "returning public.entry.entryid").Should().Be(
                2, "both the Case 2 and Case 3 new-entry inserts must qualify the RETURNING column");

            Regex.IsMatch(source, @"returning\s+entryid\b").Should().BeFalse(
                "no bare, unqualified 'returning entryid' may remain anywhere in the proc");
        }

        [Fact]
        public void Case3_ended_registration_creates_proposed_entry_not_active()
        {
            string source = EditProcSource();

            source.Should().Contain(
                "(entryid, classincompid, prizerecipientname, riderfederationmemberid, entrystatus)");
            source.Should().Contain("'Proposed'");
        }

        [Fact]
        public void Both_branches_insert_organizer_and_federation_charges_when_positive()
        {
            string source = EditProcSource();

            CountOccurrences(source, "if v_organizercost > 0 then").Should().Be(1);
            CountOccurrences(source, "if v_federationcost > 0 then").Should().Be(1);
            source.Should().Contain("'Organizer'");
            source.Should().Contain("'Federation'");
            source.Should().Contain("'Open'");
        }

        [Fact]
        public void Class_competition_mismatch_is_cross_checked_for_the_replacement_class()
        {
            EditProcSource().Should().Contain(
                "if v_new_actual_competitionid <> p_competitionid then");
        }

        [Fact]
        public void Composition_calls_234_always_and_221_only_when_registration_is_still_open()
        {
            // 232 composes with 234 (the admin-ranch-scoped sibling of 219),
            // never with 219 directly -- 219's own internal authorization is
            // host-ranch-scoped and would wrongly reject a true R<>H admin.
            string source = EditProcSource();

            source.Should().NotContain("usp_insertchangeentryrequestsecured(");

            CountOccurrences(source, "usp_insertchangeentryrequestadminranchsecured(").Should().Be(1);
            CountOccurrences(source, "usp_answerchangeentryrequestsecured(").Should().Be(1);

            int insertAt = source.IndexOf("usp_insertchangeentryrequestadminranchsecured(", StringComparison.Ordinal);
            int answerAt = source.IndexOf("usp_answerchangeentryrequestsecured(", StringComparison.Ordinal);
            int notIsEndedAt = source.LastIndexOf("if not v_isregistrationended then", StringComparison.Ordinal);

            insertAt.Should().BeGreaterThan(-1);
            answerAt.Should().BeGreaterThan(insertAt, "234 must be called before 221");
            notIsEndedAt.Should().BeLessThan(answerAt, "221 must only be reached on the open-registration path");
        }

        [Fact]
        public void Composition_passes_p_ranchid_as_234s_trailing_argument()
        {
            EditProcSource().Should().Contain(
                "p_entryid, v_new_entryid, 'Pending', false, null, null, p_personid, p_competitionid, p_ranchid");
        }

        [Fact]
        public void Edit_proc_never_reimplements_234_or_221s_own_insert_or_update_statements()
        {
            // The whole point of composing rather than reimplementing: no
            // direct INSERT into changeentryrequest, and no direct UPDATE of
            // entrystatus to 'Replaced'/'Active' for the change-request
            // transition -- that belongs exclusively to 234/221.
            string source = EditProcSource();

            source.Should().NotContain("insert into public.changeentryrequest");
            source.Should().NotContain("entrystatus = 'Replaced'");
            source.Should().NotContain("'Rejected change entry request'");
        }

        // =================================================================
        // 4. usp_admincancelentry: composition, no reimplemented fine logic.
        // =================================================================

        [Fact]
        public void Cancel_proc_reuses_the_change_request_authorization_context_verbatim()
        {
            string source = CancelProcSource();

            source.Should().Contain("from public.usp_getchangeentryrequestauthorizationcontext(");
            source.Should().Contain("if not v_ctx.entryexists then");
            source.Should().Contain("if not v_ctx.iswithinmodelcscope then");
        }

        [Fact]
        public void Cancel_proc_never_gates_on_218s_host_ranch_scoped_role_column()
        {
            CancelProcSource().Should().NotContain("v_ctx.isranchadmininhostranch");
        }

        [Fact]
        public void Cancel_proc_re_derives_the_ranchadmin_role_check_scoped_to_p_ranchid()
        {
            string source = CancelProcSource();

            source.Should().Contain("prr.personid = p_personid");
            source.Should().Contain("prr.ranchid = p_ranchid");
            source.Should().Contain("prr.rolestatus = 'Approved'");
            source.Should().Contain("r.rolename = 'אדמין חווה'");
            source.Should().Contain("'Caller is not an approved ranch admin for this entry''s ranch' using errcode = 'RN001'");
        }

        [Fact]
        public void Cancel_proc_never_calls_219_directly()
        {
            CancelProcSource().Should().NotContain("usp_insertchangeentryrequestsecured(");
        }

        [Fact]
        public void Cancel_proc_rejects_an_already_cancelled_entry_before_composing()
        {
            string source = CancelProcSource();

            int guardAt = source.IndexOf(
                "if v_current_entrystatus in ('Cancelled', 'CancelledAfterStart') then", StringComparison.Ordinal);
            int insertAt = source.IndexOf("usp_insertchangeentryrequestadminranchsecured(", StringComparison.Ordinal);

            guardAt.Should().BeGreaterThan(-1);
            insertAt.Should().BeGreaterThan(guardAt, "the already-cancelled guard must run before 234 is ever called");

            source.Should().Contain("'Entry already cancelled' using errcode = 'RN001'");
        }

        [Fact]
        public void Cancel_proc_rejects_when_a_pending_change_request_already_exists()
        {
            CancelProcSource().Should().Contain(
                "'A pending change request already exists for this entry' using errcode = 'RN001'");
        }

        [Fact]
        public void Cancel_proc_composes_234_then_221_with_iscancelled_true_and_approved()
        {
            string source = CancelProcSource();

            CountOccurrences(source, "usp_insertchangeentryrequestadminranchsecured(").Should().Be(1);

            int insertAt = source.IndexOf("usp_insertchangeentryrequestadminranchsecured(", StringComparison.Ordinal);
            int answerAt = source.IndexOf("usp_answerchangeentryrequestsecured(", StringComparison.Ordinal);

            insertAt.Should().BeGreaterThan(-1);
            answerAt.Should().BeGreaterThan(insertAt, "234 must be called before 221");

            source.Should().Contain("p_entryid, null, 'Pending', true, null, null, p_personid, p_competitionid, p_ranchid");
            source.Should().Contain("perform public.usp_answerchangeentryrequestsecured(");
            source.Should().Contain("'Approved', p_personid, p_competitionid, 'Direct admin cancellation'");
        }

        [Fact]
        public void Cancel_proc_never_computes_a_fine_amount_or_touches_the_fine_table_directly()
        {
            // Every fine/refund rule stays exclusively inside 221 -- reused,
            // never reimplemented.
            string source = CancelProcSource();

            source.Should().NotContain("from public.fine");
            source.Should().NotContain("finereason");
            source.Should().NotContain("insert into public.billcharge");
        }

        [Fact]
        public void Cancel_proc_never_touches_billcharge_or_federation_release_directly()
        {
            string source = CancelProcSource();

            source.Should().NotContain("update public.billcharge");
            source.Should().NotContain("usp_releasefederationallocationsforcharge");
        }

        [Fact]
        public void Cancel_proc_does_not_independently_block_on_competition_ended()
        {
            // Inherited, unchanged behavior: 234 (reused verbatim from 219)
            // already blocks unconditionally once the competition has ended.
            // This proc must not duplicate that check -- only
            // registration-ended is explicitly overridden by the locked
            // design, not competition-ended.
            CancelProcSource().Should().NotContain("iscompetitionended");
        }

        // =================================================================
        // 4a. usp_insertchangeentryrequestadminranchsecured (234): the new
        //     additive, admin-ranch-scoped sibling of 219.
        // =================================================================

        [Fact]
        public void Helper_234_signature_adds_exactly_one_trailing_ranchid_parameter()
        {
            string source = AdminRanchSecuredHelperSource();

            source.Should().Contain(
                "originalentryid_param integer,\n    newentryid_param integer,\n    status_param text,\n    iscancelled_param boolean,\n    fineid_param integer,\n    fineamountsnapshot_param numeric,\n    personid_param integer,\n    competitionid_param integer,\n    ranchid_param integer");
            source.Should().Contain("RETURNS integer");
        }

        [Fact]
        public void Helper_234_never_gates_on_218s_host_ranch_scoped_columns()
        {
            string source = AdminRanchSecuredHelperSource();

            source.Should().NotContain("v_ctx.isranchadmininhostranch");
            source.Should().NotContain("v_ctx.iswithinmodelcscope");
        }

        [Fact]
        public void Helper_234_re_derives_ranchadmin_role_and_model_c_scope_against_ranchid_param()
        {
            string source = AdminRanchSecuredHelperSource();

            CountOccurrences(source, "prr.ranchid = ranchid_param").Should().Be(
                2, "both the RanchAdmin-role check and the managed-payer sub-check must be scoped to ranchid_param");
            source.Should().Contain("r.rolename = 'אדמין חווה'");
            source.Should().Contain("v_ctx.iscreatedbyadmin");
            source.Should().Contain("r.rolename = 'משלם'");
        }

        [Fact]
        public void Helper_234_reuses_every_219_guard_message_verbatim()
        {
            string source = AdminRanchSecuredHelperSource();

            source.Should().Contain("'Invalid original entry id' using errcode = 'RN001'");
            source.Should().Contain("'New entry id is required for entry change request'");
            source.Should().Contain("'Original entry not found' using errcode = 'RN001'");
            source.Should().Contain("'Competition id does not match the entry''s actual competition'");
            source.Should().Contain("'Caller is not authorized to modify this entry'");
            source.Should().Contain("'Competition has already ended' using errcode = 'RN001'");
            source.Should().Contain("'New entry not found' using errcode = 'RN001'");
            source.Should().Contain("'New entry does not belong to the same competition as the original entry'");
            source.Should().Contain("'New entry does not belong to the same ranch as the original entry'");
            source.Should().Contain("'New entry was not created by the requesting admin'");
            source.Should().Contain("'Cannot create change request for a paid entry'");
        }

        [Fact]
        public void Helper_234_inserts_the_same_changeentryrequest_shape_221_expects()
        {
            string source = AdminRanchSecuredHelperSource();

            source.Should().Contain("insert into public.changeentryrequest");
            source.Should().Contain("originalentryid,");
            source.Should().Contain("newentryid,");
            source.Should().Contain("requestdatetime,");
            source.Should().Contain("status,");
            source.Should().Contain("iscancelled,");
            source.Should().Contain("fineid,");
            source.Should().Contain("fineamountsnapshot");
            source.Should().Contain("returning changeentryrequestid");
        }

        [Fact]
        public void Helper_234_flips_new_entry_charges_to_pendingapproval_and_recalculates_the_bill()
        {
            string source = AdminRanchSecuredHelperSource();

            source.Should().Contain("chargestatus = 'PendingApproval'");
            source.Should().Contain("update public.bill b");
            source.Should().Contain("chargestatus in ('Open', 'Paid')");
        }

        [Fact]
        public void Helper_234_never_touches_fine_or_federation_release_logic()
        {
            // No fine/refund/Federation logic here either -- 219 itself has
            // none (that all belongs exclusively to 221, unchanged).
            string source = AdminRanchSecuredHelperSource();

            source.Should().NotContain("from public.fine");
            source.Should().NotContain("usp_releasefederationallocationsforcharge");
        }

        // =================================================================
        // 5. C# DTOs: shape.
        // =================================================================

        [Fact]
        public void Edit_request_dto_does_not_expose_personid_or_paidbypersonid()
        {
            Type type = typeof(AdminEditEntryRequest);

            type.GetProperty("PersonId").Should().BeNull(
                "the acting admin's identity must come only from the JWT, never from the request body");
            type.GetProperty("PaidByPersonId").Should().BeNull(
                "payer reassignment is out of scope for this slice");

            foreach (string propertyName in new[]
                     {
                         "EntryId", "CompetitionId", "RanchId", "ClassInCompId",
                         "HorseId", "RiderFederationMemberId", "CoachFederationMemberId",
                         "PrizeRecipientName"
                     })
            {
                type.GetProperty(propertyName).Should().NotBeNull($"{propertyName} must exist on AdminEditEntryRequest");
            }

            type.GetProperty("CoachFederationMemberId")!.PropertyType.Should().Be(typeof(int?));
        }

        [Fact]
        public void Edit_result_dto_matches_the_locked_shape()
        {
            Type type = typeof(AdminEditEntryResult);

            type.GetProperty("ResultType")!.PropertyType.Should().Be(typeof(string));
            type.GetProperty("EntryId")!.PropertyType.Should().Be(typeof(int));
            type.GetProperty("ChangeEntryRequestId")!.PropertyType.Should().Be(typeof(int?));
        }

        [Fact]
        public void Cancel_result_dto_matches_the_locked_shape()
        {
            Type type = typeof(AdminCancelEntryResult);

            type.GetProperty("ChangeEntryRequestId")!.PropertyType.Should().Be(typeof(int));
            type.GetProperty("EntryStatus")!.PropertyType.Should().Be(typeof(string));
        }

        // =================================================================
        // 6. EntryDAL: named-parameter binding for both new commands.
        // =================================================================

        private const int CoachSentinel = 777777;
        private const int ActingPersonSentinel = 909;

        private static AdminEditEntryRequest EditRequest(int? coach = CoachSentinel)
        {
            return new AdminEditEntryRequest
            {
                EntryId = 5001,
                CompetitionId = 606,
                RanchId = 303,
                ClassInCompId = 101,
                HorseId = 404,
                RiderFederationMemberId = 505,
                CoachFederationMemberId = coach,
                PrizeRecipientName = "SENTINEL-PRIZE"
            };
        }

        private static object? ValueOf(NpgsqlCommand command, string parameterName)
        {
            command.Parameters.Contains(parameterName).Should().BeTrue($"the command must bind {parameterName}");
            return command.Parameters[parameterName].Value;
        }

        public static TheoryData<string, string> ExpectedEditArgumentMapping =>
            new TheoryData<string, string>
            {
                { "p_personid", "@personId" },
                { "p_entryid", "@entryId" },
                { "p_competitionid", "@competitionId" },
                { "p_ranchid", "@ranchId" },
                { "p_classincompid", "@classInCompId" },
                { "p_horseid", "@horseId" },
                { "p_riderfederationmemberid", "@riderFederationMemberId" },
                { "p_coachfederationmemberid", "@coachFederationMemberId" },
                { "p_prizerecipientname", "@prizeRecipientName" }
            };

        [Theory]
        [MemberData(nameof(ExpectedEditArgumentMapping))]
        public void BuildAdminEditEntryCommand_MapsEachArgumentByNameExactlyOnce(
            string pgArgumentName,
            string npgsqlParameterName)
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminEditEntryCommand(EditRequest(), ActingPersonSentinel, null);

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
        public void BuildAdminEditEntryCommand_BindsAllNineParametersWithCorrectTypesAndValues()
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminEditEntryCommand(EditRequest(), ActingPersonSentinel, null);

            command.CommandText.Should().Contain("public.usp_admineditentry");
            command.Parameters.Count.Should().Be(9);

            command.Parameters["@prizeRecipientName"].NpgsqlDbType.Should().Be(NpgsqlDbType.Varchar);

            foreach (string integerParameter in new[]
                     {
                         "@personId", "@entryId", "@competitionId", "@ranchId", "@classInCompId",
                         "@horseId", "@riderFederationMemberId", "@coachFederationMemberId"
                     })
            {
                command.Parameters[integerParameter].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            }

            ValueOf(command, "@personId").Should().Be(ActingPersonSentinel);
            ValueOf(command, "@entryId").Should().Be(5001);
            ValueOf(command, "@coachFederationMemberId").Should().Be(CoachSentinel);
        }

        [Fact]
        public void BuildAdminEditEntryCommand_NullCoach_IsBoundAsDbNull()
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminEditEntryCommand(EditRequest(coach: null), ActingPersonSentinel, null);

            ValueOf(command, "@coachFederationMemberId").Should().Be(DBNull.Value);
        }

        [Fact]
        public void BuildAdminEditEntryCommand_DoesNotUsePositionalStoredProcedureHelper()
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminEditEntryCommand(EditRequest(), ActingPersonSentinel, null);

            command.CommandText.Should().NotMatchRegex(@"@p\d+\b");

            foreach (NpgsqlParameter parameter in command.Parameters)
            {
                parameter.ParameterName.Should().NotMatchRegex(@"^p\d+$");
            }
        }

        public static TheoryData<string, string> ExpectedCancelArgumentMapping =>
            new TheoryData<string, string>
            {
                { "p_personid", "@personId" },
                { "p_entryid", "@entryId" },
                { "p_competitionid", "@competitionId" },
                { "p_ranchid", "@ranchId" }
            };

        [Theory]
        [MemberData(nameof(ExpectedCancelArgumentMapping))]
        public void BuildAdminCancelEntryCommand_MapsEachArgumentByNameExactlyOnce(
            string pgArgumentName,
            string npgsqlParameterName)
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminCancelEntryCommand(5001, ActingPersonSentinel, 606, 303, null);

            Regex.Matches(command.CommandText, Regex.Escape(pgArgumentName)).Count.Should().Be(1);
            command.Parameters.Contains(npgsqlParameterName).Should().BeTrue();
        }

        [Fact]
        public void BuildAdminCancelEntryCommand_BindsAllFourParameters()
        {
            using NpgsqlCommand command = EntryDAL.BuildAdminCancelEntryCommand(5001, ActingPersonSentinel, 606, 303, null);

            command.CommandText.Should().Contain("public.usp_admincancelentry");
            command.Parameters.Count.Should().Be(4);

            ValueOf(command, "@entryId").Should().Be(5001);
            ValueOf(command, "@personId").Should().Be(ActingPersonSentinel);
            ValueOf(command, "@competitionId").Should().Be(606);
            ValueOf(command, "@ranchId").Should().Be(303);
        }

        [Fact]
        public void Dal_maps_rn001_to_validation_exception_for_both_new_methods()
        {
            string source = DalSource();

            foreach (string methodSignature in new[]
                     {
                         "public AdminEditEntryResult AdminEditEntry(",
                         "public AdminCancelEntryResult AdminCancelEntry("
                     })
            {
                int from = source.IndexOf(methodSignature, StringComparison.Ordinal);
                from.Should().BeGreaterThan(-1, $"{methodSignature} was expected in EntryDAL.cs");

                string rest = source.Substring(from, Math.Min(1500, source.Length - from));
                rest.Should().Contain("catch (PostgresException ex) when (ex.SqlState == \"RN001\")");
                rest.Should().Contain("throw new BL.ValidationException(ex.MessageText);");
            }
        }

        // =================================================================
        // 7. Controller: routes, auth, RN001 mapping, and proof every
        //    pre-existing endpoint is untouched.
        // =================================================================

        private static string ActionBody(string signature, string nextConsoleWriteLine)
        {
            string source = ControllerSource();

            int from = source.IndexOf(signature, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, $"{signature} was expected in EntriesController");

            string rest = source.Substring(from);

            int to = rest.IndexOf(nextConsoleWriteLine, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void Admin_edit_route_is_a_dedicated_post_action_under_admin_edit()
        {
            ControllerSource().Should().Contain("[HttpPost(\"admin-edit\")]");
        }

        [Fact]
        public void Admin_edit_requires_ranchadmin_role_from_jwt_derived_personid()
        {
            string body = ActionBody("public IActionResult AdminEditEntry(", "Console.WriteLine($\"Error in AdminEditEntry:");

            body.Should().Contain("int personId = UserAccessValidator.GetPersonIdFromClaims(User);");
            body.Should().Contain("RoleNames.RanchAdmin");
            body.Should().Contain("AdminEditEntryResult result = Entry.AdminEditEntry(request, personId);");
        }

        [Fact]
        public void Admin_edit_maps_validation_exception_to_409()
        {
            string body = ActionBody("public IActionResult AdminEditEntry(", "Console.WriteLine($\"Error in AdminEditEntry:");

            body.Should().Contain("catch (ValidationException ex)");
            body.Should().Contain("StatusCode(StatusCodes.Status409Conflict, ex.Message)");
        }

        [Fact]
        public void Admin_cancel_route_is_a_dedicated_delete_action_under_admin_cancel()
        {
            ControllerSource().Should().Contain("[HttpDelete(\"admin-cancel/{entryId}\")]");
        }

        [Fact]
        public void Admin_cancel_requires_ranchadmin_role_from_jwt_derived_personid()
        {
            string body = ActionBody("public IActionResult AdminCancelEntry(", "Console.WriteLine($\"Error in AdminCancelEntry:");

            body.Should().Contain("int personId = UserAccessValidator.GetPersonIdFromClaims(User);");
            body.Should().Contain("RoleNames.RanchAdmin");
            body.Should().Contain("AdminCancelEntryResult result = Entry.AdminCancelEntry(entryId, personId, competitionId, ranchId);");
        }

        [Fact]
        public void Admin_cancel_maps_validation_exception_to_409()
        {
            string body = ActionBody("public IActionResult AdminCancelEntry(", "Console.WriteLine($\"Error in AdminCancelEntry:");

            body.Should().Contain("catch (ValidationException ex)");
            body.Should().Contain("StatusCode(StatusCodes.Status409Conflict, ex.Message)");
        }

        [Fact]
        public void Post_entries_createentry_action_is_completely_unchanged()
        {
            string source = ControllerSource();

            int from = source.IndexOf("public IActionResult CreateEntry(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string rest = source.Substring(from);
            int to = rest.IndexOf("Console.WriteLine($\"Error in CreateEntry:", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string createEntryBody = rest.Substring(0, to);

            createEntryBody.Should().Contain("request.OrderedBySystemUserId = personId;");
            createEntryBody.Should().Contain("int entryId = Entry.CreateEntry(request);");
            createEntryBody.Should().NotContain("AdminEditEntryResult");
            createEntryBody.Should().NotContain("AdminCancelEntryResult");
        }

        [Fact]
        public void Admin_create_entry_action_from_stage_b_is_completely_unchanged()
        {
            string source = ControllerSource();

            int from = source.IndexOf("public IActionResult AdminCreateEntry(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string rest = source.Substring(from);
            int to = rest.IndexOf("Console.WriteLine($\"Error in AdminCreateEntry:", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string adminCreateBody = rest.Substring(0, to);

            adminCreateBody.Should().Contain("AdminCreateEntryResult result = Entry.AdminCreateEntry(request, personId);");
            adminCreateBody.Should().NotContain("AdminEditEntryResult");
            adminCreateBody.Should().NotContain("AdminCancelEntryResult");
        }

        [Fact]
        public void Secretary_delete_entry_action_is_completely_unchanged()
        {
            string source = ControllerSource();

            int from = source.IndexOf("public IActionResult SecretaryDeleteEntry(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string rest = source.Substring(from);
            int to = rest.IndexOf("Console.WriteLine($\"Error in SecretaryDeleteEntry:", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string secretaryDeleteBody = rest.Substring(0, to);

            secretaryDeleteBody.Should().Contain("RoleNames.HostSecretary");
            secretaryDeleteBody.Should().Contain("Entry.SecretaryDeleteEntry(entryId, personId);");
        }

        [Fact]
        public void All_admin_edit_cancel_routes_are_genuinely_distinct_from_every_pre_existing_route()
        {
            string source = ControllerSource();

            source.Should().Contain("[HttpPost(\"admin-create\")]");
            source.Should().Contain("[HttpPost(\"admin-edit\")]");
            source.Should().Contain("[HttpDelete(\"admin-cancel/{entryId}\")]");
            source.Should().Contain("[HttpDelete(\"secretary/{entryId}\")]");

            CountOccurrences(source, "[HttpPost(\"admin-edit\")]").Should().Be(1);
            CountOccurrences(source, "[HttpDelete(\"admin-cancel/{entryId}\")]").Should().Be(1);
        }
    }
}
