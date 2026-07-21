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
-- DEPLOYED LIVE 2026-07-20, verified against all six fieldids.
-- CREATE OR REPLACE matches the convention of the rest of the family. Note that
-- CREATE OR REPLACE cannot change a return type: adding a further column to RETURNS TABLE
-- requires an explicit DROP FUNCTION first.
CREATE OR REPLACE FUNCTION public.usp_getscheduleconfigbyfieldid(p_fieldid smallint)
RETURNS TABLE(
    minutesperentrymin numeric,
    minutesperentrymax numeric,
    betweenclassgapminutes numeric,
    latefinishyellowhour numeric,
    latefinishorangehour numeric,
    latefinishredhour numeric,
    defaultfirstclassstarthour numeric
)
LANGUAGE sql
STABLE
AS $function$
    SELECT
        fc.minutesperentrymin,
        fc.minutesperentrymax,
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'betweenclassgapminutes'),
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'latefinishyellowhour'),
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'latefinishorangehour'),
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'latefinishredhour'),
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'defaultfirstclassstarthour')
    FROM (SELECT p_fieldid AS fieldid) f
    LEFT JOIN fieldconfig fc ON fc.fieldid = f.fieldid;
$function$;
