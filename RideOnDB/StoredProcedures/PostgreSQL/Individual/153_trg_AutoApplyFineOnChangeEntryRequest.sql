-- ============================================================================
-- trg_AutoApplyFineOnChangeEntryRequest
-- ============================================================================
-- BEFORE INSERT trigger on changeentryrequest.
-- Auto-stamps fineid + fineamountsnapshot when a cancellation/change row is
-- inserted and an active fine matches the trigger window.
--
-- Reads window definition from public.fine:
--   triggermode = 'Between' + startevent + endevent
--   triggermode = 'After'   + startevent (endevent ignored)
--   triggermode = 'None'    → manual only, skipped here
--
-- Supported event tokens (extend if Daniel adds more):
--   'RegistrationEnd'   → competition.registrationenddate
--   'CompetitionStart'  → competition.competitionstartdate
--   'CompetitionEnd'    → competition.competitionenddate
--
-- Fine selection rule for THIS trigger:
--   - finereason = 'EntryCancellation' when NEW.iscancelled = TRUE
--   - finereason = 'EntryChange'       when NEW.iscancelled = FALSE
--     (skipped silently if no such fine row exists)
--
-- Notes:
--   - Skips when caller already set fineid (manual override).
--   - Picks the FIRST matching active fine (ordered by fineid). If multiple
--     overlap, Daniel can prioritize by fineid order in the table.
--
-- HOW TO APPLY: paste into Supabase SQL editor and Run.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_autoapplyfine_changeentryrequest
    ON public.changeentryrequest;

DROP FUNCTION IF EXISTS public.fn_autoapplyfine_changeentryrequest();

CREATE OR REPLACE FUNCTION public.fn_autoapplyfine_changeentryrequest()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_regend     date;
    v_compstart  date;
    v_compend    date;
    v_reason     varchar;
    v_request_ts timestamptz;
    v_matched    public.fine%ROWTYPE;
BEGIN
    -- Manual override wins
    IF NEW.fineid IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT c.registrationenddate, c.competitionstartdate, c.competitionenddate
    INTO v_regend, v_compstart, v_compend
    FROM public.entry e
    JOIN public.classincompetition cic ON cic.classincompid = e.classincompid
    JOIN public.competition c ON c.competitionid = cic.competitionid
    WHERE e.entryid = NEW.originalentryid;

    IF v_compstart IS NULL THEN
        -- Entry/competition not found — leave fine empty, don't block insert
        RETURN NEW;
    END IF;

    v_reason := CASE WHEN NEW.iscancelled THEN 'EntryCancellation' ELSE 'EntryChange' END;
    v_request_ts := COALESCE(NEW.requestdatetime, now());

    -- Find the first matching active fine
    SELECT f.*
    INTO v_matched
    FROM public.fine f
    WHERE f.isactive = TRUE
      AND f.finereason = v_reason
      AND (
            -- Between two events
            (
                f.triggermode = 'Between'
                AND f.startevent IS NOT NULL
                AND f.endevent IS NOT NULL
                AND v_request_ts >= (
                    CASE f.startevent
                        WHEN 'RegistrationEnd'  THEN v_regend
                        WHEN 'CompetitionStart' THEN v_compstart
                        WHEN 'CompetitionEnd'   THEN v_compend
                        ELSE NULL
                    END
                )::timestamptz
                AND v_request_ts < (
                    CASE f.endevent
                        WHEN 'RegistrationEnd'  THEN v_regend
                        WHEN 'CompetitionStart' THEN v_compstart
                        WHEN 'CompetitionEnd'   THEN v_compend
                        ELSE NULL
                    END
                )::timestamptz
            )
            -- After an event
            OR (
                f.triggermode = 'After'
                AND f.startevent IS NOT NULL
                AND v_request_ts >= (
                    CASE f.startevent
                        WHEN 'RegistrationEnd'  THEN v_regend
                        WHEN 'CompetitionStart' THEN v_compstart
                        WHEN 'CompetitionEnd'   THEN v_compend
                        ELSE NULL
                    END
                )::timestamptz
            )
            -- Before an event (defensive — not in current data, but cheap)
            OR (
                f.triggermode = 'Before'
                AND f.endevent IS NOT NULL
                AND v_request_ts < (
                    CASE f.endevent
                        WHEN 'RegistrationEnd'  THEN v_regend
                        WHEN 'CompetitionStart' THEN v_compstart
                        WHEN 'CompetitionEnd'   THEN v_compend
                        ELSE NULL
                    END
                )::timestamptz
            )
      )
    ORDER BY f.fineid
    LIMIT 1;

    IF v_matched.fineid IS NOT NULL THEN
        NEW.fineid := v_matched.fineid;
        NEW.fineamountsnapshot := v_matched.fineamount;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_autoapplyfine_changeentryrequest
    BEFORE INSERT ON public.changeentryrequest
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_autoapplyfine_changeentryrequest();
