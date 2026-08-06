-- 238_usp_SplitWholeShekels.sql
-- ============================================================================
-- usp_splitwholeshekels - shared whole-shekel equal-split arithmetic
-- ============================================================================
-- NEW FUNCTION (2026-08-06). Approved business rule: payer charges generated
-- from an equal split must be whole shekels only (no agorot), any two
-- payers' shares must differ by at most ₪1, and the shares must sum EXACTLY
-- to the service total. This helper centralizes only the pure arithmetic
-- (base share + remainder count) that every split site needs identically:
-- usp_createstallbooking (188), usp_secretaryupdatestallbooking (147),
-- usp_admineditstallbooking (236), usp_answerproductchangerequest (211),
-- usp_answerproductchangerequestsecured (222), and usp_createshavingsorder
-- (169). Each call site keeps its own short ROW_NUMBER() OVER (ORDER BY
-- paidbypersonid ASC) allocation directly against its own row source (a
-- jsonb payer array on create, existing billproductrequest/billcharge rows
-- on edit/change-request/shavings) -- only the arithmetic is shared here,
-- not the per-row plumbing, since the row source genuinely differs per site.
--
-- No table reads or writes -- pure function. Same (total, payerCount) always
-- produces the same (o_baseshare, o_remainder), so the same booking/total
-- always allocates the same way, including on retry.
--
-- Guarantee: o_baseshare * p_payercount + o_remainder = p_totalamount,
-- exactly, using only integer/exact-numeric division (Postgres NUMERIC is
-- arbitrary-precision decimal, never IEEE float) -- no floating point
-- anywhere in this function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_splitwholeshekels(
    p_totalamount numeric,
    p_payercount  integer,
    OUT o_baseshare integer,
    OUT o_remainder integer
)
LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_payercount IS NULL OR p_payercount <= 0 THEN
        RAISE EXCEPTION 'Payer count must be greater than zero' USING ERRCODE = 'RN001';
    END IF;

    IF p_totalamount IS NULL OR p_totalamount < 0 THEN
        RAISE EXCEPTION 'Total amount must be a non-negative value' USING ERRCODE = 'RN001';
    END IF;

    IF p_totalamount <> floor(p_totalamount) THEN
        RAISE EXCEPTION 'Service total must be a whole shekel amount, got %', p_totalamount USING ERRCODE = 'RN001';
    END IF;

    o_baseshare := floor(p_totalamount / p_payercount)::integer;
    o_remainder := p_totalamount::integer - (o_baseshare * p_payercount);
END;
$function$;
