-- usp_getcompetitionsformobilepayer — mobile payer competition board
--
-- Two overloads exist live ON PURPOSE (deploy safety, 2026-07-31):
--
--   (personid_param integer)            -- ORIGINAL, kept for backward-compat.
--       Returned ONLY competitions the payer paid into (entries / paid-time /
--       product requests), across all ranches, every status. The currently
--       deployed backend calls this 1-arg version, so it stays until the
--       ranch+participation change below ships and Render redeploys, then it
--       can be retired.
--
--   (p_ranchid integer, p_personid integer)  -- NEW. Adds ranch-scoped discovery
--       plus a HasParticipated flag so the backend can build the payer board:
--         * the selected ranch's competitions (so future ones the payer has NOT
--           joined can be shown), UNION
--         * every competition the payer participated in, ANY ranch (history).
--       HasParticipated drives the C# visibility matrix and enrolled-first sort
--       (BL/Competition.cs -> IsVisibleOnPayerBoard). Drafts / non-enrolled
--       non-future / stale cancelled are filtered in C#, not here.
--
-- Adding the 2-arg version was a NEW overload (different arity), so CREATE OR
-- REPLACE did not touch the 1-arg one — zero breakage window for the live app.

-- === Overload 1: original (unchanged, backward-compat) ======================
CREATE OR REPLACE FUNCTION public.usp_getcompetitionsformobilepayer(personid_param integer)
 RETURNS TABLE("CompetitionId" integer, "HostRanchId" integer, "HostRanchName" text, "FieldId" smallint, "CreatedBySystemUserId" integer, "CompetitionName" character varying, "CompetitionStartDate" date, "CompetitionEndDate" date, "RegistrationOpenDate" date, "RegistrationEndDate" date, "PaidTimeRegistrationDate" date, "PaidTimePublicationDate" date, "CompetitionStatus" character varying, "Notes" character varying, "StallMapUrl" character varying, "FieldName" text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH payer_competitions AS
    (
        SELECT c.competitionid
        FROM bill b
        INNER JOIN servicerequest sr
            ON sr.billid = b.billid
        INNER JOIN entry e
            ON e.entryid = sr.srequestid
        INNER JOIN classincompetition cic
            ON cic.classincompid = e.classincompid
        INNER JOIN competition c
            ON c.competitionid = cic.competitionid
        WHERE b.paidbypersonid = personid_param

        UNION

        SELECT c.competitionid
        FROM bill b
        INNER JOIN servicerequest sr
            ON sr.billid = b.billid
        INNER JOIN paidtimerequest ptr
            ON ptr.paidtimerequestid = sr.srequestid
        INNER JOIN paidtimeslotincompetition ptsc
            ON ptsc.paidtimeslotincompid = ptr.requestedcompslotid
        INNER JOIN competition c
            ON c.competitionid = ptsc.competitionid
        WHERE b.paidbypersonid = personid_param

        UNION

        SELECT c.competitionid
        FROM bill b
        INNER JOIN billproductrequest bpr
            ON bpr.billid = b.billid
        INNER JOIN productrequest pr
            ON pr.prequestid = bpr.prequestid
        INNER JOIN competition c
            ON c.competitionid = pr.competitionid
        WHERE b.paidbypersonid = personid_param
    )
    SELECT
        c.competitionid AS "CompetitionId",
        c.hostranchid AS "HostRanchId",
        r.ranchname::text AS "HostRanchName",
        c.fieldid AS "FieldId",
        c.createdbysystemuserid AS "CreatedBySystemUserId",
        c.competitionname AS "CompetitionName",
        c.competitionstartdate AS "CompetitionStartDate",
        c.competitionenddate AS "CompetitionEndDate",
        c.registrationopendate AS "RegistrationOpenDate",
        c.registrationenddate AS "RegistrationEndDate",
        c.paidtimeregistrationdate AS "PaidTimeRegistrationDate",
        c.paidtimepublicationdate AS "PaidTimePublicationDate",
        c.competitionstatus AS "CompetitionStatus",
        c.notes AS "Notes",
        c.stallmapurl AS "StallMapUrl",
        f.fieldname::text AS "FieldName"
    FROM competition c
    INNER JOIN field f
        ON c.fieldid = f.fieldid
    INNER JOIN ranch r
        ON c.hostranchid = r.ranchid
    INNER JOIN payer_competitions pc
        ON pc.competitionid = c.competitionid
    ORDER BY c.competitionstartdate ASC, c.competitionid DESC;
END;
$function$;

-- === Overload 2: ranch-scoped + HasParticipated (current) ===================
CREATE OR REPLACE FUNCTION public.usp_getcompetitionsformobilepayer(
    p_ranchid integer,
    p_personid integer
)
 RETURNS TABLE("CompetitionId" integer, "HostRanchId" integer, "HostRanchName" text, "FieldId" smallint, "CreatedBySystemUserId" integer, "CompetitionName" character varying, "CompetitionStartDate" date, "CompetitionEndDate" date, "RegistrationOpenDate" date, "RegistrationEndDate" date, "PaidTimeRegistrationDate" date, "PaidTimePublicationDate" date, "CompetitionStatus" character varying, "Notes" character varying, "StallMapUrl" character varying, "FieldName" text, "HasParticipated" boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH payer_competitions AS (
        SELECT c.competitionid FROM bill b
        INNER JOIN servicerequest sr ON sr.billid = b.billid
        INNER JOIN entry e ON e.entryid = sr.srequestid
        INNER JOIN classincompetition cic ON cic.classincompid = e.classincompid
        INNER JOIN competition c ON c.competitionid = cic.competitionid
        WHERE b.paidbypersonid = p_personid
        UNION
        SELECT c.competitionid FROM bill b
        INNER JOIN servicerequest sr ON sr.billid = b.billid
        INNER JOIN paidtimerequest ptr ON ptr.paidtimerequestid = sr.srequestid
        INNER JOIN paidtimeslotincompetition ptsc ON ptsc.paidtimeslotincompid = ptr.requestedcompslotid
        INNER JOIN competition c ON c.competitionid = ptsc.competitionid
        WHERE b.paidbypersonid = p_personid
        UNION
        SELECT c.competitionid FROM bill b
        INNER JOIN billproductrequest bpr ON bpr.billid = b.billid
        INNER JOIN productrequest pr ON pr.prequestid = bpr.prequestid
        INNER JOIN competition c ON c.competitionid = pr.competitionid
        WHERE b.paidbypersonid = p_personid
    )
    SELECT
        c.competitionid, c.hostranchid, r.ranchname::text, c.fieldid, c.createdbysystemuserid,
        c.competitionname, c.competitionstartdate, c.competitionenddate, c.registrationopendate,
        c.registrationenddate, c.paidtimeregistrationdate, c.paidtimepublicationdate,
        c.competitionstatus, c.notes, c.stallmapurl, f.fieldname::text,
        (pc.competitionid IS NOT NULL) AS "HasParticipated"
    FROM competition c
    INNER JOIN field f ON c.fieldid = f.fieldid
    INNER JOIN ranch r ON c.hostranchid = r.ranchid
    LEFT JOIN payer_competitions pc ON pc.competitionid = c.competitionid
    WHERE c.hostranchid = p_ranchid OR pc.competitionid IS NOT NULL
    ORDER BY c.competitionstartdate ASC, c.competitionid DESC;
END;
$function$;
