-- NEW (Smart Element Phase 7 - schedule view). Brand-new proc, not bound to any live
-- signature to match. Returns exactly one row combining a field's fieldconfig duration
-- bounds (both NULL when the field is exempt, e.g. all-around/field 3, including when
-- fieldconfig has no row at all for that field) with the smartconfig values needed for
-- the schedule roll-forward and late-finish tiers. Smartconfig is a key/value table, so
-- each value is read by configkey via a correlated subquery -- never by row position --
-- and unrecognized keys are simply not selected (tolerant of future additions).
-- Follows the p_* param / lowercase unquoted return-column convention established by the
-- Smart Element proc family (160-163).
CREATE FUNCTION public.usp_getscheduleconfigbyfieldid(p_fieldid smallint)
RETURNS TABLE(
    minutesperentrymin numeric,
    minutesperentrymax numeric,
    betweenclassgapminutes numeric,
    latefinishyellowhour numeric,
    latefinishorangehour numeric,
    latefinishredhour numeric
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
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'latefinishredhour')
    FROM (SELECT p_fieldid AS fieldid) f
    LEFT JOIN fieldconfig fc ON fc.fieldid = f.fieldid;
$function$;
