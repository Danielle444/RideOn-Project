-- ============================================================================
-- usp_GetPaymentChargesPendingFlags
-- ============================================================================
-- Companion SP for the existing payment charges query.
-- Returns one row per billcharge with two flags surfacing pending change /
-- pending cancellation requests against that charge's source.
--
-- The DAL calls this in parallel with the main charges SP and merges by
-- billChargeId. No modification to the existing payment charges SP needed.
--
-- HOW TO APPLY: paste into Supabase SQL editor and Run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_getpaymentchargespendingflags(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getpaymentchargespendingflags(
    p_competitionid  integer,
    p_ranchid        integer
)
RETURNS TABLE (
    billchargeid             integer,
    haspendingchange         boolean,
    haspendingcancellation   boolean
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        bc.billchargeid,

        -- Pending CHANGE flag (iscancelled = FALSE on the matching request)
        CASE
            WHEN bc.sourcetype = 'Entry' THEN EXISTS (
                SELECT 1
                FROM public.changeentryrequest cer
                WHERE cer.originalentryid = bc.sourceid
                  AND cer.status = 'Pending'
                  AND cer.iscancelled = FALSE
            )
            WHEN bc.sourcetype = 'ProductRequest' THEN EXISTS (
                SELECT 1
                FROM public.productchangerequest pcr
                WHERE pcr.originalprequestid = bc.sourceid
                  AND pcr.status = 'Pending'
                  AND pcr.iscancelled = FALSE
            )
            ELSE FALSE
        END                                                AS haspendingchange,

        -- Pending CANCELLATION flag (iscancelled = TRUE on the matching request)
        CASE
            WHEN bc.sourcetype = 'Entry' THEN EXISTS (
                SELECT 1
                FROM public.changeentryrequest cer
                WHERE cer.originalentryid = bc.sourceid
                  AND cer.status = 'Pending'
                  AND cer.iscancelled = TRUE
            )
            WHEN bc.sourcetype = 'ProductRequest' THEN EXISTS (
                SELECT 1
                FROM public.productchangerequest pcr
                WHERE pcr.originalprequestid = bc.sourceid
                  AND pcr.status = 'Pending'
                  AND pcr.iscancelled = TRUE
            )
            ELSE FALSE
        END                                                AS haspendingcancellation

    FROM public.billcharge bc
    WHERE bc.competitionid = p_competitionid
      -- Only charges relevant to the requested host ranch's payers:
      -- (mirror existing payment charges SP scope — competition is always
      --  hosted by one ranch, so this is a no-op filter that proves the
      --  caller is the host ranch)
      AND EXISTS (
          SELECT 1
          FROM public.competition c
          WHERE c.competitionid = p_competitionid
            AND c.hostranchid = p_ranchid
      );
$$;
