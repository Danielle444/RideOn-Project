-- usp_getcompetitionsformobilepayer — mobile payer competition board.
--
-- Two overloads live intentionally (deploy safety):
--   (personid_param)          -- original; participated competitions only.
--   (p_ranchid, p_personid)   -- current; ranch discovery + cross-ranch history
--                                + HasParticipated flag.
-- The 1-arg version is kept so the deployed backend keeps working; retire it
-- after the ranch+participation change ships and Render redeploys. Visibility
-- rules (drafts hidden, etc.) are applied in C#, not here.

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
