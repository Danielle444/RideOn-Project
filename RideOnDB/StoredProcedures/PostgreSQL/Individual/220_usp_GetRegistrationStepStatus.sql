-- Read-only registration-step status for the RanchAdmin mobile four-tab workflow
-- (Classes / Paid Times / Stalls / Shavings). Personalized to the calling admin
-- under Model C: a step unlocks when the admin either created the qualifying
-- item themselves, or a payer the admin manages (Approved in
-- personmanagedbysystemuser AND holding an Approved 'משלם' role at this ranch,
-- via personranchrole/role) has a qualifying item. The admin is never treated
-- as the payer -- orderedbysystemuserid (actor) and billcharge.paidbypersonid
-- (payer) are kept strictly separate throughout.
--
-- Every boolean here is computed fresh at read time; nothing is cached or
-- stored. The comp CTE independently re-verifies competitionid/hostranchid
-- (never relies on caller-side authorization alone), so a caller that somehow
-- reached this proc with a mismatched pair gets zero rows back, not a
-- wrong-ranch answer.
--
-- Paid Time price category is productcategory.categoryid = 1 (live-confirmed:
-- 1 = פייד טיים, 2 = תאים, 3 = נסורת), matching the pattern already established
-- by usp_getfinancialconfigforcompetition (categoryid 2/3 for stalls/shavings).
--
-- Active class entry = COALESCE(entrystatus, 'Active') = 'Active', excluding
-- Cancelled / CancelledAfterStart / Replaced -- the same whitelist convention
-- used by usp_gethorsesforcompetition.
--
-- Active non-tack stall booking mirrors the verified rule from
-- usp_getstallbookingsforshavings: isfortack = false, at least one billcharge
-- row (sourcetype='ProductRequest', categorykey='stalls', chargestatus in
-- Open/Paid), and no Approved productchangerequest that cancelled or replaced
-- it (a Pending change/cancellation request does not disqualify it).
--
-- Follows the p_* param / lowercase unquoted return-column convention and the
-- LANGUAGE sql STABLE shape established by the Smart Element / Financial
-- Config proc family (160-167). Read-only; deploys independently of the
-- backend and stays backward compatible (a brand-new proc no deployed code
-- calls yet).
--
-- isregistrationended (added, appended LAST -- RETURNS TABLE shape change,
-- requires DROP+CREATE): a distinct, independent signal from
-- iscompetitionended, computed from registrationenddate/competitionstartdate
-- instead of competitionenddate. iscompetitionended is preserved completely
-- unchanged above -- nothing about its computation or callers is affected.
-- Rule: registrationenddate IS NOT NULL -> closed once today > that date;
-- otherwise -> closed once today >= competitionstartdate (competitionstartdate
-- is NOT NULL on every competition, so the "both dates null" case is
-- unreachable in practice, but the CASE below still degrades to this same
-- branch rather than assuming). "Today" is the Jerusalem calendar date, same
-- AT TIME ZONE convention already used for iscompetitionended.
DROP FUNCTION IF EXISTS public.usp_getregistrationstepstatus(integer, integer, integer);

CREATE FUNCTION public.usp_getregistrationstepstatus(
    p_competitionid integer,
    p_ranchid integer,
    p_adminpersonid integer
)
RETURNS TABLE(
    competitionenddate date,
    iscompetitionended boolean,
    paidtimeregistrationdate date,
    haspaidtimeslots boolean,
    hasactivepaidtimeprice boolean,
    paidtimeconfigured boolean,
    paidtimereadytobook boolean,
    ispaidtimewindowopen boolean,
    hasadmincreatedactiveentry boolean,
    hasmanagedpayerwithactiveentry boolean,
    hasrelevantactiveentry boolean,
    hasadmincreatedactivenontackstallbooking boolean,
    hasmanagedpayerwithactivenontackstallbooking boolean,
    hasrelevantactivenontackstallbooking boolean,
    isregistrationended boolean
)
LANGUAGE sql
STABLE
AS $function$
WITH comp AS (
    SELECT c.competitionid, c.hostranchid, c.competitionenddate, c.paidtimeregistrationdate,
           c.registrationenddate, c.competitionstartdate
    FROM public.competition c
    WHERE c.competitionid = p_competitionid
      AND c.hostranchid   = p_ranchid
),
signals AS (
    SELECT
        comp.competitionenddate,
        comp.paidtimeregistrationdate,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > comp.competitionenddate AS iscompetitionended,

        (
            CASE
                WHEN comp.registrationenddate IS NOT NULL
                    THEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > comp.registrationenddate
                WHEN comp.competitionstartdate IS NOT NULL
                    THEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date >= comp.competitionstartdate
                ELSE false
            END
        ) AS isregistrationended,

        EXISTS (
            SELECT 1 FROM public.paidtimeslotincompetition ptic
            WHERE ptic.competitionid = comp.competitionid
        ) AS haspaidtimeslots,

        EXISTS (
            SELECT 1
            FROM public.pricecatalog pc
            JOIN public.product p ON p.productid = pc.productid
            WHERE pc.ranchid = p_ranchid AND pc.isactive AND p.categoryid = 1
        ) AS hasactivepaidtimeprice,

        -- HasAdminCreatedActiveEntry
        EXISTS (
            SELECT 1
            FROM public.classincompetition cic
            INNER JOIN public.entry e ON e.classincompid = cic.classincompid
            INNER JOIN public.servicerequest sr ON sr.srequestid = e.entryid
            INNER JOIN public.horse h ON h.horseid = sr.horseid
            WHERE cic.competitionid = comp.competitionid
              AND h.ranchid = p_ranchid
              AND sr.orderedbysystemuserid = p_adminpersonid
              AND COALESCE(e.entrystatus, 'Active') = 'Active'
        ) AS hasadmincreatedactiveentry,

        -- HasManagedPayerWithActiveEntry
        EXISTS (
            SELECT 1
            FROM public.classincompetition cic
            INNER JOIN public.entry e ON e.classincompid = cic.classincompid
            INNER JOIN public.billcharge bc
                ON bc.sourceid = e.entryid
               AND bc.sourcetype = 'Entry'
               AND bc.categorykey = 'classes'
               AND bc.competitionid = comp.competitionid
            INNER JOIN public.personmanagedbysystemuser m
                ON m.personid = bc.paidbypersonid
               AND m.systemuserid = p_adminpersonid
               AND m.approvalstatus = 'Approved'
            INNER JOIN public.personranchrole prr
                ON prr.personid = m.personid
               AND prr.ranchid = p_ranchid
               AND prr.rolestatus = 'Approved'
            INNER JOIN public.role rl
                ON rl.roleid = prr.roleid
               AND rl.rolename = 'משלם'
            WHERE cic.competitionid = comp.competitionid
              AND COALESCE(e.entrystatus, 'Active') = 'Active'
        ) AS hasmanagedpayerwithactiveentry,

        -- HasAdminCreatedActiveNonTackStallBooking
        EXISTS (
            SELECT 1
            FROM public.productrequest pr
            INNER JOIN public.stallbooking sb ON sb.stallbookingid = pr.prequestid
            WHERE pr.competitionid = comp.competitionid
              AND sb.ranchid = p_ranchid
              AND pr.orderedbysystemuserid = p_adminpersonid
              AND sb.isfortack = false
              AND EXISTS (
                  SELECT 1 FROM public.billcharge bc
                  WHERE bc.sourceid = pr.prequestid
                    AND bc.sourcetype = 'ProductRequest'
                    AND bc.categorykey = 'stalls'
                    AND bc.competitionid = comp.competitionid
                    AND bc.chargestatus IN ('Open', 'Paid')
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.productchangerequest pcr
                  WHERE pcr.originalprequestid = pr.prequestid
                    AND pcr.status = 'Approved'
                    AND (pcr.iscancelled = true OR pcr.newprequestid IS NOT NULL)
              )
        ) AS hasadmincreatedactivenontackstallbooking,

        -- HasManagedPayerWithActiveNonTackStallBooking
        EXISTS (
            SELECT 1
            FROM public.productrequest pr
            INNER JOIN public.stallbooking sb ON sb.stallbookingid = pr.prequestid
            INNER JOIN public.billcharge bc
                ON bc.sourceid = pr.prequestid
               AND bc.sourcetype = 'ProductRequest'
               AND bc.categorykey = 'stalls'
               AND bc.competitionid = comp.competitionid
               AND bc.chargestatus IN ('Open', 'Paid')
            INNER JOIN public.personmanagedbysystemuser m
                ON m.personid = bc.paidbypersonid
               AND m.systemuserid = p_adminpersonid
               AND m.approvalstatus = 'Approved'
            INNER JOIN public.personranchrole prr
                ON prr.personid = m.personid
               AND prr.ranchid = p_ranchid
               AND prr.rolestatus = 'Approved'
            INNER JOIN public.role rl
                ON rl.roleid = prr.roleid
               AND rl.rolename = 'משלם'
            WHERE pr.competitionid = comp.competitionid
              AND sb.ranchid = p_ranchid
              AND sb.isfortack = false
              AND NOT EXISTS (
                  SELECT 1 FROM public.productchangerequest pcr
                  WHERE pcr.originalprequestid = pr.prequestid
                    AND pcr.status = 'Approved'
                    AND (pcr.iscancelled = true OR pcr.newprequestid IS NOT NULL)
              )
        ) AS hasmanagedpayerwithactivenontackstallbooking
    FROM comp
)
SELECT
    signals.competitionenddate,
    signals.iscompetitionended,
    signals.paidtimeregistrationdate,
    signals.haspaidtimeslots,
    signals.hasactivepaidtimeprice,
    (signals.paidtimeregistrationdate IS NOT NULL AND signals.haspaidtimeslots) AS paidtimeconfigured,
    (
        signals.paidtimeregistrationdate IS NOT NULL
        AND signals.haspaidtimeslots
        AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date >= signals.paidtimeregistrationdate
        AND NOT signals.iscompetitionended
        AND signals.hasactivepaidtimeprice
    ) AS paidtimereadytobook,
    (
        signals.paidtimeregistrationdate IS NOT NULL
        AND signals.haspaidtimeslots
        AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date >= signals.paidtimeregistrationdate
        AND NOT signals.iscompetitionended
    ) AS ispaidtimewindowopen,
    signals.hasadmincreatedactiveentry,
    signals.hasmanagedpayerwithactiveentry,
    (signals.hasadmincreatedactiveentry OR signals.hasmanagedpayerwithactiveentry) AS hasrelevantactiveentry,
    signals.hasadmincreatedactivenontackstallbooking,
    signals.hasmanagedpayerwithactivenontackstallbooking,
    (signals.hasadmincreatedactivenontackstallbooking OR signals.hasmanagedpayerwithactivenontackstallbooking)
        AS hasrelevantactivenontackstallbooking,
    signals.isregistrationended
FROM signals;
$function$;
