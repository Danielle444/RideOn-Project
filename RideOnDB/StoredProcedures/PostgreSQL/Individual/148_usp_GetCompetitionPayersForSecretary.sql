-- ============================================================================
-- usp_GetCompetitionPayersForSecretary
-- ============================================================================
-- Returns a deduplicated list of payers who currently have at least one
-- billable item (entry / paid-time / stall / shavings) in this competition.
-- Used by the secretary "+ הוסף תא" modal to pick which payer the new stall
-- booking is for.
--
-- Ownership: caller must hold 'מזכירת חווה מארחת' at the competition's host
-- ranch.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_getcompetitionpayersforsecretary(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getcompetitionpayersforsecretary(
    p_competitionid            integer,
    p_secretarysystemuserid    integer
)
RETURNS TABLE (
    payerpersonid   integer,
    firstname       varchar,
    lastname        varchar,
    fullname        varchar,
    email           varchar,
    cellphone       varchar,
    openbillid      integer
)
LANGUAGE plpgsql AS $$
DECLARE
    v_hostranchid integer;
BEGIN
    SELECT c.hostranchid
    INTO v_hostranchid
    FROM public.competition c
    WHERE c.competitionid = p_competitionid;

    IF v_hostranchid IS NULL THEN
        RAISE EXCEPTION 'Competition not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_secretarysystemuserid
          AND prr.ranchid = v_hostranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'מזכירת חווה מארחת'
    ) THEN
        RAISE EXCEPTION 'Permission denied: not the host ranch secretary';
    END IF;

    RETURN QUERY
    SELECT DISTINCT
        p.personid                                              AS payerpersonid,
        p.firstname::varchar                                    AS firstname,
        p.lastname::varchar                                     AS lastname,
        (p.firstname || ' ' || p.lastname)::varchar             AS fullname,
        p.email::varchar                                        AS email,
        p.cellphone::varchar                                    AS cellphone,
        (
            SELECT b2.billid
            FROM public.bill b2
            WHERE b2.paidbypersonid = p.personid
              AND b2.competitionid = p_competitionid
              AND b2.dateclosed IS NULL
            ORDER BY b2.dateopened DESC
            LIMIT 1
        )                                                       AS openbillid
    FROM public.bill b
    JOIN public.person p ON p.personid = b.paidbypersonid
    WHERE b.competitionid = p_competitionid
    ORDER BY fullname;
END;
$$;
