CREATE OR REPLACE FUNCTION public.usp_setpaidtimeslotpublishstate(
    p_paidtimeslotincompid integer,
    p_hostranchid           integer,
    p_ispublished           boolean
)
RETURNS void
LANGUAGE plpgsql
AS $function$
declare
    v_competitionid integer;
begin
    select ptc.competitionid
    into v_competitionid
    from paidtimeslotincompetition ptc
    inner join competition c
        on c.competitionid = ptc.competitionid
    where ptc.paidtimeslotincompid = p_paidtimeslotincompid
      and c.hostranchid = p_hostranchid;

    if v_competitionid is null then
        raise exception 'Paid time slot not found for this ranch';
    end if;

    update paidtimeslotincompetition
    set ispublished = p_ispublished
    where paidtimeslotincompid = p_paidtimeslotincompid;
end;
$function$;
