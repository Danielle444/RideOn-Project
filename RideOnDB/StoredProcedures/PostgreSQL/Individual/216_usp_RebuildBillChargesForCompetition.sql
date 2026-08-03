-- ============================================================================
-- usp_rebuildbillchargesforcompetition - reconcile a competition's billcharge rows from source
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository - discovered
-- via the pg_proc keyword sweep, not in the originally supplied proc list.
-- Reproduced verbatim via pg_get_functiondef; no behavioral change of any
-- kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Maintenance/reconciliation utility, not part of the normal user-
-- facing flow. Deletes billcharge rows with chargestatus IN
-- ('Open','Cancelled','Replaced') AND paymentbatchid IS NULL for the
-- competition, then reinserts fresh rows from current entry/paid-time/
-- product-request state - explicitly never deletes 'Paid' rows. Because
-- federationcreditallocation.billchargeid is a real FK with NO ACTION, this
-- proc would fail loudly with a foreign-key violation (not silently orphan)
-- if it ever tried to delete a billcharge row still referenced by an
-- allocation - a safer failure mode than the UPDATE-based cancellation gap
-- documented on usp_answerchangeentryrequest (210) /
-- usp_secretarydeleteentry (145), where the charge row is never removed, only
-- its status changed, so no FK protection applies. No fix applied here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_rebuildbillchargesforcompetition(p_competitionid integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    /*
        1. עדכון competitionid על bills שמחוברים למקצים
    */
    update public.bill b
    set competitionid = p_competitionid
    where exists (
        select 1
        from public.servicerequest sr
        inner join public.entry e
            on e.entryid = sr.srequestid
        inner join public.classincompetition cic
            on cic.classincompid = e.classincompid
        where sr.billid = b.billid
          and cic.competitionid = p_competitionid
    );

    /*
        2. עדכון competitionid על bills שמחוברים לפייד־טיים
    */
    update public.bill b
    set competitionid = p_competitionid
    where exists (
        select 1
        from public.servicerequest sr
        inner join public.paidtimerequest ptr
            on ptr.paidtimerequestid = sr.srequestid
        inner join public.paidtimeslotincompetition ptsic
            on ptsic.paidtimeslotincompid = ptr.requestedcompslotid
        where sr.billid = b.billid
          and ptsic.competitionid = p_competitionid
    );

    /*
        3. עדכון competitionid על bills שמחוברים למוצרים: תאים / נסורת
    */
    update public.bill b
    set competitionid = p_competitionid
    where exists (
        select 1
        from public.billproductrequest bpr
        inner join public.productrequest pr
            on pr.prequestid = bpr.prequestid
        where bpr.billid = b.billid
          and pr.competitionid = p_competitionid
    );

    /*
        4. מחיקת חיובים פתוחים/מבוטלים/מוחלפים שנבנו בעבר לאותה תחרות.
        לא מוחקים Paid כדי לא להרוס תשלומים אמיתיים בעתיד.
    */
    delete from public.billcharge bc
    where bc.competitionid = p_competitionid
      and bc.chargestatus in ('Open', 'Cancelled', 'Replaced')
      and bc.paymentbatchid is null;

    /*
        5. מקצים - חלק מארגן
    */
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
        notes
    )
    select
        sr.billid,
        p_competitionid,
        b.paidbypersonid,
        'Organizer',
        'classes',
        'Entry',
        e.entryid,
        coalesce(cic.organizercost, 0),
        'Open',
        'Rebuilt from Entry organizer cost'
    from public.servicerequest sr
    inner join public.bill b
        on b.billid = sr.billid
    inner join public.entry e
        on e.entryid = sr.srequestid
    inner join public.classincompetition cic
        on cic.classincompid = e.classincompid
    where cic.competitionid = p_competitionid
      and coalesce(cic.organizercost, 0) > 0
      and not exists (
          select 1
          from public.billcharge existing
          where existing.billid = sr.billid
            and existing.chargeowner = 'Organizer'
            and existing.categorykey = 'classes'
            and existing.sourcetype = 'Entry'
            and existing.sourceid = e.entryid
      );

    /*
        6. מקצים - חלק התאחדות
    */
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
        notes
    )
    select
        sr.billid,
        p_competitionid,
        b.paidbypersonid,
        'Federation',
        'classes',
        'Entry',
        e.entryid,
        coalesce(cic.federationcost, 0),
        'Open',
        'Rebuilt from Entry federation cost'
    from public.servicerequest sr
    inner join public.bill b
        on b.billid = sr.billid
    inner join public.entry e
        on e.entryid = sr.srequestid
    inner join public.classincompetition cic
        on cic.classincompid = e.classincompid
    where cic.competitionid = p_competitionid
      and coalesce(cic.federationcost, 0) > 0
      and not exists (
          select 1
          from public.billcharge existing
          where existing.billid = sr.billid
            and existing.chargeowner = 'Federation'
            and existing.categorykey = 'classes'
            and existing.sourcetype = 'Entry'
            and existing.sourceid = e.entryid
      );

    /*
        7. פייד־טיים - מארגן
    */
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
        notes
    )
    select
        sr.billid,
        p_competitionid,
        b.paidbypersonid,
        'Organizer',
        'paid-time',
        'PaidTimeRequest',
        ptr.paidtimerequestid,
        coalesce(pc.itemprice, 0),
        'Open',
        'Rebuilt from PaidTimeRequest price catalog'
    from public.servicerequest sr
    inner join public.bill b
        on b.billid = sr.billid
    inner join public.paidtimerequest ptr
        on ptr.paidtimerequestid = sr.srequestid
    inner join public.paidtimeslotincompetition ptsic
        on ptsic.paidtimeslotincompid = ptr.requestedcompslotid
    inner join public.pricecatalog pc
        on pc.pricecatalogid = ptr.pricecatalogid
    where ptsic.competitionid = p_competitionid
      and coalesce(pc.itemprice, 0) > 0
      and not exists (
          select 1
          from public.billcharge existing
          where existing.billid = sr.billid
            and existing.chargeowner = 'Organizer'
            and existing.categorykey = 'paid-time'
            and existing.sourcetype = 'PaidTimeRequest'
            and existing.sourceid = ptr.paidtimerequestid
      );

    /*
        8. מוצרים - תאים ונסורת לפי billproductrequest.amounttopay
    */
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
        notes
    )
    select
        bpr.billid,
        p_competitionid,
        b.paidbypersonid,
        'Organizer',
        case
            when pcg.categoryname like '%תא%' then 'stalls'
            when pcg.categoryname like '%נסורת%' then 'shavings'
            else null
        end,
        'ProductRequest',
        pr.prequestid,
        coalesce(bpr.amounttopay, 0),
        'Open',
        'Rebuilt from BillProductRequest'
    from public.billproductrequest bpr
    inner join public.bill b
        on b.billid = bpr.billid
    inner join public.productrequest pr
        on pr.prequestid = bpr.prequestid
    inner join public.pricecatalog pc
        on pc.pricecatalogid = pr.pricecatalogid
    inner join public.product p
        on p.productid = pc.productid
    inner join public.productcategory pcg
        on pcg.categoryid = p.categoryid
    where pr.competitionid = p_competitionid
      and coalesce(bpr.amounttopay, 0) > 0
      and (
          pcg.categoryname like '%תא%'
          or pcg.categoryname like '%נסורת%'
      )
      and not exists (
          select 1
          from public.billcharge existing
          where existing.billid = bpr.billid
            and existing.chargeowner = 'Organizer'
            and existing.sourcetype = 'ProductRequest'
            and existing.sourceid = pr.prequestid
      );

end;
$function$
