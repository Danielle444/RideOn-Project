-- Smart Element Phase 7 - schedule view. Returns exactly one row combining a field's
-- fieldconfig duration bounds (both NULL when the field is exempt -- all-around/field 3,
-- jumping/field 5 and dressage/field 6) with the smartconfig values needed for the schedule
-- roll-forward and late-finish tiers.
--
-- EXEMPTION KEYS OFF NULL MINUTES, NOT ROW ABSENCE (corrected 2026-07-22, Phase 8). The
-- schedule view treats a field as exempt when minutesperentrymin/max come back NULL, NOT when
-- the fieldconfig row is missing: this proc LEFT JOINs fieldconfig and classSchedule.utils.js
-- returns "render no columns" on NULL minutes. All-around (field 3) is the live proof -- it HAS
-- a fieldconfig row (maxhorseclassesperday = 5, notes "NULL minutes = exempt...") with NULL
-- minutes and is correctly schedule-exempt. The earlier "no fieldconfig row at all" wording was
-- false for field 3. This distinction is load-bearing for the Phase 8 financial layer, which
-- adds fieldconfig rows (for the horse cap) whose minute columns stay NULL so the schedule
-- stays off. Smartconfig is a key/value table, so each value is
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
