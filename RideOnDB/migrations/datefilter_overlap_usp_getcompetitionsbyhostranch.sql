-- Migration: datefilter_overlap_usp_getcompetitionsbyhostranch
-- Applied to live (project sxplumrexbolpwqacpiz) 2026-07-30.
-- Retires QA #16 (no-results half) == QA #68.
--
-- WHAT CHANGED: the competition-board date filter moved from "contained-within"
-- to OVERLAP semantics. Previously a competition had to fall entirely inside the
-- requested window to appear, so any competition straddling a window edge
-- silently vanished from the board. Proven live: a Nov 5 -> Nov 30 search on
-- ranch 11 dropped competition 14 (runs 2025-11-04 .. 2025-11-08) because it
-- started one day before the window.
--
-- Only the two date WHERE lines differ from the previous live body:
--     BEFORE: c.competitionstartdate >= datefrom_param
--             c.competitionenddate   <= dateto_param
--     AFTER:  c.competitionenddate   >= datefrom_param
--             c.competitionstartdate <= dateto_param
--
-- Signature, the 15 return columns and the ORDER BY are unchanged, so this is a
-- plain CREATE OR REPLACE (no DROP, no 42P13) and the currently deployed backend
-- is unaffected: CompetitionDAL.GetCompetitionsByHostRanch passes the same 6
-- positional params and reads the same columns by name. NULL bounds are
-- unaffected by the change.

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsbyhostranch(
    ranchid_param integer,
    searchtext_param text DEFAULT NULL::text,
    status_param text DEFAULT NULL::text,
    fieldid_param smallint DEFAULT NULL::smallint,
    datefrom_param date DEFAULT NULL::date,
    dateto_param date DEFAULT NULL::date)
 RETURNS TABLE("CompetitionId" integer, "HostRanchId" integer, "FieldId" smallint,
    "CreatedBySystemUserId" integer, "CompetitionName" character varying,
    "CompetitionStartDate" date, "CompetitionEndDate" date, "RegistrationOpenDate" date,
    "RegistrationEndDate" date, "PaidTimeRegistrationDate" date, "PaidTimePublicationDate" date,
    "CompetitionStatus" character varying, "Notes" character varying,
    "StallMapUrl" character varying, "FieldName" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.competitionid,
        c.hostranchid,
        c.fieldid,
        c.createdbysystemuserid,
        c.competitionname,
        c.competitionstartdate,
        c.competitionenddate,
        c.registrationopendate,
        c.registrationenddate,
        c.paidtimeregistrationdate,
        c.paidtimepublicationdate,
        c.competitionstatus,
        c.notes,
        c.stallmapurl,
        f.fieldname
    FROM competition c
    INNER JOIN field f ON c.fieldid = f.fieldid
    WHERE c.hostranchid = ranchid_param
      AND (searchtext_param IS NULL OR TRIM(searchtext_param) = '' OR c.competitionname ILIKE '%' || searchtext_param || '%')
      AND (status_param     IS NULL OR TRIM(status_param)     = '' OR c.competitionstatus = status_param)
      AND (fieldid_param    IS NULL OR c.fieldid = fieldid_param)
      AND (datefrom_param   IS NULL OR c.competitionenddate   >= datefrom_param)
      AND (dateto_param     IS NULL OR c.competitionstartdate <= dateto_param)
    ORDER BY c.competitionstartdate DESC;
END;
$function$
