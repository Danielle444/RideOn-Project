-- Matches the live deployed definition exactly (verified against class 87, which has
-- two classprize rows -- returns exactly one row with PrizesDisplay populated).
CREATE FUNCTION public.usp_getclassbyid(classincompid_param integer)
RETURNS TABLE(
    "ClassInCompId" integer, "CompetitionId" integer, "ClassTypeId" smallint,
    "ArenaRanchId" integer, "ArenaId" smallint, "ArenaName" character varying,
    "ClassDateTime" timestamptz, "ClassName" character varying,
    "OrganizerCost" numeric, "FederationCost" numeric,
    "StartTime" time, "OrderInDay" smallint, "ClassNotes" character varying,
    "JudgesDisplay" text,
    "PrizeTypeId" smallint, "PrizeTypeName" character varying, "PrizeAmount" numeric,
    "PatternNumber" smallint,
    "PrizesDisplay" text
)
LANGUAGE plpgsql AS $function$
begin
    return query
    select
        cic.classincompid,
        cic.competitionid,
        cic.classtypeid,
        cic.arenaranchid,
        cic.arenaid,
        a.arenaname,
        cic.classdatetime,
        ct.classname,
        cic.organizercost,
        cic.federationcost,
        cic.starttime,
        cic.orderinday,
        cic.classnotes,
        (
            select string_agg(
                trim(coalesce(j.firstnamehebrew, '') || ' ' || coalesce(j.lastnamehebrew, '')),
                ', ' order by cj.judgeid)
            from classjudge cj
            inner join judge j on j.judgeid = cj.judgeid
            where cj.classincompid = cic.classincompid
        ) as judgesdisplay,
        (
            select cp.prizetypeid from classprize cp
            where cp.classincompid = cic.classincompid
            order by cp.prizetypeid limit 1
        ) as prizetypeid,
        (
            select pt.prizetypename
            from classprize cp
            inner join prizetype pt on pt.prizetypeid = cp.prizetypeid
            where cp.classincompid = cic.classincompid
            order by cp.prizetypeid limit 1
        ) as prizetypename,
        (
            select cp.prizeamount from classprize cp
            where cp.classincompid = cic.classincompid
            order by cp.prizetypeid limit 1
        ) as prizeamount,
        rt.patternnumber,
        (
            select string_agg(pt.prizetypename || ': ' || cp.prizeamount::text,
                              ', ' order by cp.prizetypeid)
            from classprize cp
            inner join prizetype pt on pt.prizetypeid = cp.prizetypeid
            where cp.classincompid = cic.classincompid
        ) as prizesdisplay
    from classincompetition cic
    inner join classtype ct on ct.classtypeid = cic.classtypeid
    inner join arena a on a.ranchid = cic.arenaranchid and a.arenaid = cic.arenaid
    left join reiningtype rt on rt.reiningclassincompid = cic.classincompid
    where cic.classincompid = classincompid_param;
end;
$function$;
