-- Matches the live deployed definition exactly (pg_get_functiondef). Reconciled during the
-- prediction-service phase: claude.ai deployed a one-line addition deleting the entryprediction
-- cache row before the class row, alongside the pre-existing reiningtype/classprize/classjudge
-- child deletes -- same explicit-delete convention as every other class child table. The repo
-- copy was previously stale (missing reiningtype and entryprediction deletes, different param
-- naming style) -- proof this drifted from live before this reconciliation, not the other way.
CREATE OR REPLACE FUNCTION public.usp_deleteclassincompetition(classincompid_param integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
    if exists (select 1 from entry where classincompid = classincompid_param) then
        raise exception 'Cannot delete class: There are registered entries.';
    end if;

    delete from reiningtype where reiningclassincompid = classincompid_param;
    delete from classprize where classincompid = classincompid_param;
    delete from classjudge  where classincompid = classincompid_param;
    delete from entryprediction where classincompid = classincompid_param;
    delete from classincompetition where classincompid = classincompid_param;
end;
$function$
