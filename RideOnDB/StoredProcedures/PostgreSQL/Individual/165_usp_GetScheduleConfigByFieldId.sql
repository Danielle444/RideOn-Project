-- Smart Element Phase 7 - schedule view. Returns exactly one row combining a field's
-- fieldconfig duration bounds (both NULL when the field is exempt -- all-around/field 3,
-- jumping/field 5 and dressage/field 6, which is intended and works by those fields having
-- no fieldconfig row at all) with the smartconfig values needed for the schedule
-- roll-forward and late-finish tiers. Smartconfig is a key/value table, so each value is
-- read by configkey via a correlated subquery -- never by row position -- and unrecognized
-- keys are simply not selected (tolerant of future additions).
-- Follows the p_* param / lowercase unquoted return-column convention established by the
-- Smart Element proc family (160-163).
--
-- FLATTENING IS REINING-ONLY (fieldid 1). Both gap columns are gated on that here rather
-- than in the frontend: classSchedule.utils.js already coerces a null gap to 0, so gating
-- in SQL means the client needs no field knowledge and no extra branch. The literal 1 is a
-- deliberate tradeoff -- the declarative shape would be per-field columns on fieldconfig
-- (where minutesperentrymin/max already live), which is deferred, not rejected.
--
-- betweenclassgapminutes  = the gap duration, applied BOTH between adjacent classes and
--                           inside a class every flatteningrunspergap runs (one concept,
--                           one duration -- confirmed 2026-07-21).
-- flatteningrunspergap    = how many runs between mid-class gaps. Fixed at 6 for now;
--                           deliberately NOT linked to the regular/minimum/maximum switcher.
--
-- DEPLOYED LIVE 2026-07-20 with 7 columns; this revision adds an 8th and therefore CANNOT
-- ship via CREATE OR REPLACE -- a return-type change requires an explicit DROP FUNCTION
-- first. The DROP below is part of the migration, not a leftover.
DROP FUNCTION IF EXISTS public.usp_getscheduleconfigbyfieldid(smallint);

CREATE FUNCTION public.usp_getscheduleconfigbyfieldid(p_fieldid smallint)
RETURNS TABLE(
    minutesperentrymin numeric,
    minutesperentrymax numeric,
    betweenclassgapminutes numeric,
    latefinishyellowhour numeric,
    latefinishorangehour numeric,
    latefinishredhour numeric,
    defaultfirstclassstarthour numeric,
    flatteningrunspergap numeric
)
LANGUAGE sql
STABLE
AS $function$
    SELECT
        fc.minutesperentrymin,
        fc.minutesperentrymax,
        CASE WHEN p_fieldid = 1 THEN
            (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'betweenclassgapminutes')
        END,
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'latefinishyellowhour'),
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'latefinishorangehour'),
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'latefinishredhour'),
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'defaultfirstclassstarthour'),
        CASE WHEN p_fieldid = 1 THEN
            (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'flatteningrunspergap')
        END
    FROM (SELECT p_fieldid AS fieldid) f
    LEFT JOIN fieldconfig fc ON fc.fieldid = f.fieldid;
$function$;
