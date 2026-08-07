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
--
-- LATE-REGISTRATION FINE BILLING (added on fix/entry-creation-fine-billing)
-- ---------------------------------------------------------------------------
-- trg_autoapplyfine_entry_insert (repo file 154, BEFORE INSERT ON entry)
-- stamps entry.fineid when the entry lands inside an active LateRegistration
-- fine's window -- it ONLY sets the column. Nothing downstream ever turned
-- that stamp into money owed: this proc created the Organizer/Federation
-- entry charges and called usp_recalculatebillamount without ever reading
-- entry.fineid back. Confirmed live 2026-08-06: 4 entries system-wide
-- (10103-10105, 10675) carry a stamped fineid with zero matching billcharge.
--
-- Fix: re-select the just-inserted entry's fineid (a plain re-read -- the
-- trigger runs BEFORE INSERT, inside the same statement, so v_entryid's row
-- already reflects it) and, if set, insert one Fine billcharge before the
-- existing usp_recalculatebillamount call.
--
-- SOURCEID COLLISION -- CONFIRMED LIVE, NOT HYPOTHETICAL (2026-08-07).
-- A first version of this fix used sourcetype='Fine', sourceid=<entryid>,
-- distinguished from the change-request Fine path only by sourcetype. That
-- is unsafe: entry.entryid and changeentryrequest.changeentryrequestid are
-- two independent sequences (entry 1..10675+, changeentryrequest 1..124)
-- that already overlap in live data -- entryid 1,2,3,4,5,93,118,120 each
-- also exist as a real changeentryrequestid, and billcharge already has
-- Fine rows at sourceid 1, 2 and 5 from the change-request path
-- (billchargeid 505/128/127). A NOT EXISTS guard keyed only on
-- (sourcetype='Fine', sourceid=<entryid>) would silently find one of those
-- unrelated rows for entry 1/2/5 and conclude the entry's own late fine was
-- "already billed" -- it would never be charged. billcharge has no other
-- namespacing: sourcetype is not a per-source-table sequence guarantee, and
-- there is no FK from billcharge.sourceid to any single table.
--
-- Fix: partition by categorykey too. Every existing Fine row (the
-- change-request path, 210/221) hardcodes categorykey='classes' -- verified
-- against all 3 live rows and both procs' INSERT literals. categorykey
-- ALREADY permits 'fine' (ck_billcharge_categorykey) and it has never once
-- been used live. This proc's entry-creation fines use categorykey='fine'
-- exclusively, making the two Fine sources disjoint by a real column
-- rather than by hoping two unrelated id spaces never collide:
--   change-request fine  = (sourcetype='Fine', categorykey='classes', sourceid=changeentryrequestid)
--   entry-creation fine  = (sourcetype='Fine', categorykey='fine',    sourceid=entryid)
-- "has entry X's fine been billed" is therefore:
--   sourcetype='Fine' AND categorykey='fine' AND sourceid=<entryid>
-- No schema change needed (categorykey='fine' was already a legal value),
-- and no other proc needed changing: 203/206 (payer/category summaries)
-- already branch on categorykey='fine' -> 'קנסות', so this also fixes a
-- pre-existing display gap for these charges specifically, as a side
-- effect -- the change-request path's own categorykey='classes' rows are
-- untouched and still fall into 203/206's 'classes' bucket, unchanged.
-- Chose this (Option B: reuse an existing, permitted, correctly-scoped
-- column) over introducing a new sourcetype value like 'EntryFine'
-- (Option A): that would need an ALTER on ck_billcharge_sourcetype plus an
-- audit of every proc that switches on sourcetype='Fine' for display
-- (at least 209, 212, 203, 206) to recognize the new value -- broader than
-- this fix's stated scope. No dedicated link table exists (Option C). The
-- change-request convention itself is untouched (Option D excluded by
-- explicit scope).
--
-- Idempotency: confirmed live 2026-08-06/07 that billcharge carries no
-- unique constraint on (sourcetype, sourceid) or any other combination
-- (only billchargeid PK, plus a non-unique index on (sourcetype, sourceid))
-- -- so this proc guards explicitly with a NOT EXISTS check (now scoped by
-- categorykey too, per the collision fix above) rather than assuming it is
-- only ever called once per entry, matching this codebase's own convention
-- of guarding schema-permitted states explicitly (see the "still in
-- progress" branch note in usp_admincreateentry, repo file 231).
--
-- Amount guard (fineamount > 0, not just fineid is not null) mirrors
-- usp_answerchangeentryrequest's own `v_effectivefineamount > 0` check --
-- fine.fineamount only carries a >= 0 check (ck_fine_fineamount), so this
-- also makes a misconfigured zero-amount fine a safe no-op instead of an
-- empty billcharge row.
--
-- Deliberately NOT touched: trigger 154 itself, the change-entry-request
-- fine path (210/221), and the Proposed/PendingCreateApproval branch of
-- usp_admincreateentry (231) -- that branch creates no charges at all today
-- and defers billing to a not-yet-built "Stage E" answer proc; out of scope
-- here.
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
    v_fineid integer;
    v_fineamount numeric(10,2);
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

    -- Late-registration fine billing -- see header note above.
    select e.fineid, f.fineamount
    into v_fineid, v_fineamount
    from public.entry e
    join public.fine f on f.fineid = e.fineid
    where e.entryid = v_entryid;

    if v_fineid is not null
       and v_fineamount is not null
       and v_fineamount > 0
       and not exists (
           select 1
           from public.billcharge bc
           where bc.sourcetype = 'Fine'
             and bc.categorykey = 'fine'
             and bc.sourceid = v_entryid
       )
    then
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
            'fine',
            'Fine',
            v_entryid,
            v_fineamount,
            'Open',
            null,
            now(),
            'Created from Entry fine. FineId=' || v_fineid::text
        );
    end if;

    perform public.usp_recalculatebillamount(v_billid);

    return v_entryid;
end;
$function$
