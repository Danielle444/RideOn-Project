-- ============================================================================
-- usp_insertentry - create one competition entry and its bill charges
-- ============================================================================
-- FIRST TRACKED DEFINITION OF THIS FUNCTION. Until now the repo held no body
-- for usp_insertentry at all - only 144_usp_InsertEntry_AllowNullCoach.sql,
-- which is an instruction note describing the nullable-coach fix (long since
-- live) and contains no SQL. This file is now the authoritative tracked body;
-- 144 is kept for its rationale only.
--
-- STATUS: DEPLOYED AND VERIFIED LIVE 2026-07-31, via CREATE OR REPLACE (the
-- argument list and the return type were unchanged, so no DROP was needed and
-- the deployed backend saw no interface change). Post-deployment
-- pg_get_functiondef confirmed all four checks:
--
--   * signature unchanged -- usp_insertentry(integer, integer, integer,
--     integer, integer, integer, integer, character varying), a single row in
--     pg_proc, so no stray overload was created;
--   * horseparticipationincompetition absent -- the deployed body contains no
--     reference to the table at all;
--   * normalised md5 660418c6e58747489355bb76fa9b66b9;
--   * normalised length 4346 characters.
--
-- Normalised means carriage returns stripped
-- (md5(replace(pg_get_functiondef(oid), chr(13), ''))), so the hash is
-- comparable regardless of line-ending transport. Both values match the SQL
-- section of this file exactly, so live and this file agree byte for byte.
--
-- For the record, the definition this replaced was md5
-- 381f833cbc99b4171906c058b439c8d1, length 4946 -- identical to the body below
-- apart from the 406-character block quoted under WHAT CHANGED VERSUS LIVE.
--
-- WHAT CHANGED VERSUS LIVE
-- ------------------------
-- Exactly one block was removed, the one that sat between the `entry` insert
-- and the organizer billcharge insert:
--
--     if not exists (
--         select 1
--         from public.horseparticipationincompetition
--         where horseid = p_horseid
--           and competitionid = v_competitionid
--     ) then
--         insert into public.horseparticipationincompetition
--         (
--             horseid,
--             competitionid
--         )
--         values
--         (
--             p_horseid,
--             v_competitionid
--         );
--     end if;
--
-- Nothing else differs. Every other section - competition and cost lookup,
-- horse/ranch validation, rider validation, the nullable-coach guard, payer
-- validation, bill create-or-reuse, the servicerequest insert, the entry
-- insert, both billcharge branches, usp_recalculatebillamount and the returned
-- entry id - is live's text verbatim, including its lowercase style and its
-- exception wording.
--
-- WHY
-- ---
--   * entry is the source of truth for active participation. The read procs
--     derive participating horses from active entries
--     (entry -> servicerequest -> classincompetition): see 104, 117 and 184.
--   * horseparticipationincompetition (hpc) holds health-certificate metadata
--     only, keyed by (horseid, competitionid). It was never a participation
--     registry: on 2026-07-30, 9,412 of 9,460 active horse/competition pairs
--     had no hpc row, because only this function ever created one and the
--     historical import bypassed it entirely.
--   * Registration therefore must not create a bare hpc row. The row is created
--     on demand by usp_savehealthcertificate (118), whose
--     ON CONFLICT (horseid, competitionid) DO UPDATE upsert works whether or
--     not a row already exists.
--   * A horse with an active entry and no hpc row still appears on both
--     health-certificate screens: 117 and 184 LEFT JOIN hpc, so the certificate
--     columns come back NULL and both clients render the "not uploaded" state.
--     "No row" and "row with all HC fields NULL" are indistinguishable through
--     every reader in the system, so removing this insert changes no query
--     result.
--   * Removing the write also eliminates a race. `if not exists ... insert` is
--     not atomic under READ COMMITTED, so two concurrent first entries for the
--     same horse and competition could both pass the check and one would then
--     fail on the hpc primary key. Because the whole function runs in a single
--     implicit transaction, that failure rolled back the servicerequest and the
--     entry too, surfacing to the user as a failed registration.
--     ON CONFLICT DO NOTHING would also have closed the race; removing the
--     insert removes the contention instead.
--
-- NOT IN SCOPE HERE
-- -----------------
--   * usp_savehealthcertificate (118) and usp_approvehealthcertificate (119)
--     are deliberately unchanged.
--   * The existing bare hpc rows are retained. No cleanup, no backfill.
--   * The payer/coach parameter-order mismatch in
--     RideOnServer/DAL/EntryDAL.cs is RESOLVED, in C# only. The parameter
--     names and their order below are live's, untouched.
--
-- PAYER/COACH MISMATCH - RESOLVED IN THE DAL, NOT HERE
-- ----------------------------------------------------
-- The mismatch was confirmed and then fixed on the C# side alone.
--
--   * THE LIVE FUNCTION REMAINS UNCHANGED. Its argument order below -
--     p_coachfederationmemberid sixth, p_paidbypersonid seventh - is correct
--     and is what public.usp_insertpaidtimerequest also uses. Nothing was
--     deployed, no migration was written, and this file's SQL body is
--     byte-identical to the definition verified live on 2026-07-31
--     (normalised md5 660418c6e58747489355bb76fa9b66b9, length 4346).
--
--   * WHAT WAS WRONG. EntryDAL.InsertEntry passed its arguments through
--     DBServices.CreateCommandWithStoredProcedure, which emits
--     "SELECT * FROM fn(@p1, @p2, ...)" and binds strictly by Dictionary
--     insertion order - the dictionary keys only select an NpgsqlDbType and
--     never reach the SQL. That dictionary listed the payer sixth and the
--     coach seventh, so the two were crossed on the wire: the payer was
--     written to servicerequest.coachfederationmemberid while
--     bill.paidbypersonid and billcharge.paidbypersonid received the coach.
--     It stayed silent because federationmember.federationmemberid is itself
--     a person.personid (fk_federationmember_person), so every guard and
--     foreign key still passed whenever the payer was also a federation
--     member. A null coach additionally left p_paidbypersonid null, so the
--     'Payer not found' guard fired and every no-coach registration failed.
--
--   * THE FIX. EntryDAL.InsertEntry now calls this function with explicit
--     PostgreSQL named argument notation (p_coachfederationmemberid := ...),
--     the same notation PaidTimeRequestDAL.CreatePaidTimeRequest uses, which
--     removes the dependency on argument order entirely. Covered by
--     RideOnServer.Tests/EntryDalInsertEntryCommandTests.cs.
--
--   * WHY NAMED ARGUMENTS RATHER THAN REORDERING THE DICTIONARY. The DAL's
--     order never changed since it was written (629a3be, 2026-04-18); this
--     function's argument order was changed underneath it, between
--     2026-04-21 and 2026-04-23, most likely while hand-applying the
--     nullable-coach fix described in 144 (a parameter rename or reorder
--     needs DROP + CREATE, so the header was re-authored). Entries created
--     on 2026-04-21 are stored correctly; everything from 2026-04-23 onward
--     is swapped. An order-based fix would have left the same trap in place.
--
--   * STILL OPEN: 16 historical entry rows are conclusively swapped
--     (14, 291-296, 9920, 9921, 10094-10100), all in Draft or unstatused
--     competitions with no paid charges. Their repair is deliberately
--     deferred and is NOT part of this file or the DAL fix.
-- ============================================================================
--
-- DUPLICATE-ENTRY GUARD (shared physical runs)
-- ---------------------------------------------
-- One guard, placed after every existence check and before any write: an
-- Active entry for the same rider+horse+classincompid may not be created
-- twice. Physical runs (one rider+horse arena pass entered into several
-- classifications) are expressed as several DIFFERENT classincompid values
-- sharing rider+horse+classDate+orderInDay -- never the same classincompid
-- twice, so this guard cannot reject a legitimate physical run. Scoped by
-- Active status only (`coalesce(entrystatus,'Active')='Active'`), so
-- Cancelled/CancelledAfterStart/Replaced history never blocks a new entry.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_insertentry(p_classincompid integer, p_orderedbysystemuserid integer, p_ranchid integer, p_horseid integer, p_riderfederationmemberid integer, p_coachfederationmemberid integer, p_paidbypersonid integer, p_prizerecipientname character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_competitionid integer;
    v_organizercost numeric(10,2);
    v_federationcost numeric(10,2);
    v_competitionenddate date;
    v_billid integer;
    v_srequestid integer;
    v_entryid integer;
    v_horse_ranchid integer;
begin
    select
        cic.competitionid,
        coalesce(cic.organizercost, 0),
        coalesce(cic.federationcost, 0)
    into
        v_competitionid,
        v_organizercost,
        v_federationcost
    from public.classincompetition cic
    where cic.classincompid = p_classincompid;

    if v_competitionid is null then
        raise exception 'Class not found';
    end if;

    select c.competitionenddate
    into v_competitionenddate
    from public.competition c
    where c.competitionid = v_competitionid;

    if (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate then
        raise exception 'Competition has already ended' using errcode = 'RN001';
    end if;

    select h.ranchid
    into v_horse_ranchid
    from public.horse h
    where h.horseid = p_horseid;

    if v_horse_ranchid is null then
        raise exception 'Horse not found';
    end if;

    if v_horse_ranchid <> p_ranchid then
        raise exception 'Horse does not belong to your ranch';
    end if;

    if not exists (
        select 1
        from public.federationmember fm
        where fm.federationmemberid = p_riderfederationmemberid
    ) then
        raise exception 'Rider not found';
    end if;

    if p_coachfederationmemberid is not null
       and not exists (
            select 1
            from public.federationmember fm
            where fm.federationmemberid = p_coachfederationmemberid
       ) then
        raise exception 'Coach not found';
    end if;

    if not exists (
        select 1
        from public.person p
        where p.personid = p_paidbypersonid
    ) then
        raise exception 'Payer not found';
    end if;

    -- Multiple Active entries for the same rider+horse+class are an invalid
    -- duplicate registration, never a legitimate second physical run -- see
    -- this file's header note.
    if exists (
        select 1
        from public.entry e
        join public.servicerequest sr on sr.srequestid = e.entryid
        where e.classincompid = p_classincompid
          and sr.riderfederationmemberid = p_riderfederationmemberid
          and sr.horseid = p_horseid
          and coalesce(e.entrystatus, 'Active') = 'Active'
    ) then
        raise exception 'An active entry already exists for this rider, horse and class' using errcode = 'RN001';
    end if;

    v_billid := public.usp_getorcreateopenbillforpayerandcompetition(
        p_paidbypersonid,
        v_competitionid
    );

    insert into public.servicerequest
    (
        orderedbysystemuserid,
        horseid,
        riderfederationmemberid,
        coachfederationmemberid,
        billid,
        srequestdatetime
    )
    values
    (
        p_orderedbysystemuserid,
        p_horseid,
        p_riderfederationmemberid,
        p_coachfederationmemberid,
        v_billid,
        now()
    )
    returning srequestid
    into v_srequestid;

    insert into public.entry
    (
        entryid,
        classincompid,
        prizerecipientname,
        riderfederationmemberid
    )
    values
    (
        v_srequestid,
        p_classincompid,
        p_prizerecipientname,
        p_riderfederationmemberid
    )
    returning entryid
    into v_entryid;

    if v_organizercost > 0 then
        insert into public.billcharge
        (
            billid,
            competitionid,
            paidbypersonid,
            chargeowner,
            categorykey,
            sourcetype,
            sourceid,
            amounttopay,
            chargestatus,
            paymentbatchid,
            createdat,
            notes
        )
        values
        (
            v_billid,
            v_competitionid,
            p_paidbypersonid,
            'Organizer',
            'classes',
            'Entry',
            v_entryid,
            v_organizercost,
            'Open',
            null,
            now(),
            'Created from Entry organizer cost'
        );
    end if;

    if v_federationcost > 0 then
        insert into public.billcharge
        (
            billid,
            competitionid,
            paidbypersonid,
            chargeowner,
            categorykey,
            sourcetype,
            sourceid,
            amounttopay,
            chargestatus,
            paymentbatchid,
            createdat,
            notes
        )
        values
        (
            v_billid,
            v_competitionid,
            p_paidbypersonid,
            'Federation',
            'classes',
            'Entry',
            v_entryid,
            v_federationcost,
            'Open',
            null,
            now(),
            'Created from Entry federation cost'
        );
    end if;

    perform public.usp_recalculatebillamount(v_billid);

    return v_entryid;
end;
$function$
