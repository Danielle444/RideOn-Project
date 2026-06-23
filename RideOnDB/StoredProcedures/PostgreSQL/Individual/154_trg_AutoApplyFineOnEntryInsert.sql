-- ============================================================================
-- trg_AutoApplyFineOnEntryInsert
-- ============================================================================
-- BEFORE INSERT trigger on entry.
-- Auto-stamps entry.fineid when a row is inserted late (after RegistrationEnd
-- or after CompetitionStart) and an active LateRegistration fine matches.
--
-- Window logic: same as 153 (Between / After / Before with event tokens).
--
-- Skips when caller already set fineid.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_autoapplyfine_entry_insert ON public.entry;

DROP FUNCTION IF EXISTS public.fn_autoapplyfine_entry_insert();

CREATE OR REPLACE FUNCTION public.fn_autoapplyfine_entry_insert()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_regend     date;
    v_compstart  date;
    v_compend    date;
    v_request_ts timestamptz;
    v_matched    public.fine%ROWTYPE;
BEGIN
    IF NEW.fineid IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT c.registrationenddate, c.competitionstartdate, c.competitionenddate
    INTO v_regend, v_compstart, v_compend
    FROM public.classincompetition cic
    JOIN public.competition c ON c.competitionid = cic.competitionid
    WHERE cic.classincompid = NEW.classincompid;

    IF v_compstart IS NULL THEN
        RETURN NEW;
    END IF;

    -- The entry has no requestdatetime — use creation time of its
    -- servicerequest if present, otherwise now().
    SELECT COALESCE(sr.srequestdatetime, now())
    INTO v_request_ts
    FROM public.servicerequest sr
    WHERE sr.srequestid = NEW.entryid;

    v_request_ts := COALESCE(v_request_ts, now());

    SELECT f.*
    INTO v_matched
    FROM public.fine f
    WHERE f.isactive = TRUE
      AND f.finereason = 'LateRegistration'
      AND (
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
      )
    -- Larger window first if multiple match (After > Between)
    ORDER BY
        CASE f.triggermode WHEN 'After' THEN 1 WHEN 'Between' THEN 2 ELSE 3 END,
        f.fineamount DESC,
        f.fineid
    LIMIT 1;

    IF v_matched.fineid IS NOT NULL THEN
        NEW.fineid := v_matched.fineid;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_autoapplyfine_entry_insert
    BEFORE INSERT ON public.entry
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_autoapplyfine_entry_insert();
