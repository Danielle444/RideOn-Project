-- Was never checked into the repo. Fixes the Issue C bug: the previously-deployed
-- version deleted ALL classprize rows for the class before inserting the one row it
-- was given, so a per-row loop (SaveClassPrizes in ClassInCompetitionDAL.cs) self-erased
-- every prize but the last one written. Replaced with a true upsert keyed on the
-- classprize PK (classincompid, prizetypeid).
--
-- Confirmed safe for the currently-deployed main branch: its SaveClassPrize already
-- calls usp_DeleteClassPrizeByClassId itself before calling this proc, so main never
-- relied on this proc's internal delete-all -- no deploy-timing coordination needed.
--
-- Proposed text below -- please reconcile against what claude.ai actually deploys and
-- confirm the exact body so this file can be finalized, same as the other procs this
-- session.
CREATE OR REPLACE FUNCTION usp_UpsertClassPrize(
    classincompid_param INTEGER,
    prizetypeid_param SMALLINT,
    prizeamount_param NUMERIC(10,2)
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO classprize (classincompid, prizetypeid, prizeamount)
    VALUES (classincompid_param, prizetypeid_param, prizeamount_param)
    ON CONFLICT (classincompid, prizetypeid)
    DO UPDATE SET prizeamount = EXCLUDED.prizeamount;
END;
$$;
