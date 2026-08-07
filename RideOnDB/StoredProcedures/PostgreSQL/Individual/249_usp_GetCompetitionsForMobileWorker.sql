CREATE OR REPLACE FUNCTION public.usp_getcompetitionsformobileworker(ranchid_param integer)
 RETURNS TABLE("CompetitionId" integer, "HostRanchId" integer, "HostRanchName" text, "FieldId" smallint, "CreatedBySystemUserId" integer, "CompetitionName" character varying, "CompetitionStartDate" date, "CompetitionEndDate" date, "RegistrationOpenDate" date, "RegistrationEndDate" date, "PaidTimeRegistrationDate" date, "PaidTimePublicationDate" date, "CompetitionStatus" character varying, "Notes" character varying, "StallMapUrl" character varying, "FieldName" text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
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
    ORDER BY c.competitionstartdate ASC, c.competitionid DESC;
END;
$function$
