-- יוצר אצוות בקשות פייד-טיים בטרנזקציה אחת + שורת מטא-דאטה אחת.
-- אם בקשה אחת נכשלת (RAISE EXCEPTION מתוך usp_InsertPaidTimeRequest) -
-- הטרנזקציה מתבטלת לחלוטין ושום בקשה לא נשמרת.
--
-- p_Items: מערך JSONB. כל פריט:
--   {
--     "horseId": int, "riderFederationMemberId": int,
--     "coachFederationMemberId": int, "paidByPersonId": int,
--     "priceCatalogId": int, "requestedCompSlotId": int,
--     "notes": string|null
--   }
-- p_Metadata: JSONB חופשי - נשמר כמו שהוא לשימוש אלגוריתם השיבוץ.
--
-- מחזיר שורה לכל בקשה שנוצרה: PaidTimeRequestId + ה-BatchId המשותף.
CREATE OR REPLACE FUNCTION public.usp_bulkinsertpaidtimerequests(p_orderedbysystemuserid integer, p_ranchid integer, p_competitionid integer, p_createdbypersonid integer, p_items jsonb, p_metadata jsonb)
 RETURNS TABLE("PaidTimeRequestId" integer, "BatchId" integer)
 LANGUAGE plpgsql
AS $function$
declare
    v_item jsonb;
    v_request_id integer;
    v_request_ids integer[] := array[]::integer[];
    v_batch_id integer;
    v_item_slot_competitionid integer;
begin
    if p_orderedbysystemuserid is null or p_orderedbysystemuserid <= 0 then
        raise exception 'Invalid ordered by system user id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_createdbypersonid is null or p_createdbypersonid <= 0 then
        raise exception 'Invalid created by person id';
    end if;

    if p_items is null or jsonb_typeof(p_items) <> 'array' then
        raise exception 'Items must be a json array';
    end if;

    if jsonb_array_length(p_items) = 0 then
        raise exception 'At least one paid time request item is required';
    end if;

    for v_item in
        select *
        from jsonb_array_elements(p_items)
    loop
        if not (v_item ? 'horseId') then
            raise exception 'Missing horseId in paid time item';
        end if;

        if not (v_item ? 'riderFederationMemberId') then
            raise exception 'Missing riderFederationMemberId in paid time item';
        end if;

        if not (v_item ? 'coachFederationMemberId') then
            raise exception 'Missing coachFederationMemberId in paid time item';
        end if;

        if not (v_item ? 'paidByPersonId') then
            raise exception 'Missing paidByPersonId in paid time item';
        end if;

        if not (v_item ? 'priceCatalogId') then
            raise exception 'Missing priceCatalogId in paid time item';
        end if;

        if not (v_item ? 'requestedCompSlotId') then
            raise exception 'Missing requestedCompSlotId in paid time item';
        end if;

        select pts.competitionid
        into v_item_slot_competitionid
        from public.paidtimeslotincompetition pts
        where pts.paidtimeslotincompid =
            (v_item ->> 'requestedCompSlotId')::integer;

        if v_item_slot_competitionid is null then
            raise exception 'Requested paid time slot not found';
        end if;

        if v_item_slot_competitionid <> p_competitionid then
            raise exception 'Paid time slot does not belong to the given competition';
        end if;

        v_request_id :=
            public.usp_insertpaidtimerequest(
                p_pricecatalogid := (v_item ->> 'priceCatalogId')::integer,
                p_requestedcompslotid := (v_item ->> 'requestedCompSlotId')::integer,
                p_orderedbysystemuserid := p_orderedbysystemuserid,
                p_ranchid := p_ranchid,
                p_horseid := (v_item ->> 'horseId')::integer,
                p_riderfederationmemberid := (v_item ->> 'riderFederationMemberId')::integer,
                p_coachfederationmemberid := (v_item ->> 'coachFederationMemberId')::integer,
                p_paidbypersonid := (v_item ->> 'paidByPersonId')::integer,
                p_notes := nullif(v_item ->> 'notes', '')
            );

        v_request_ids := array_append(v_request_ids, v_request_id);
    end loop;

    insert into public.paidtimerequestbatch
    (
        competitionid,
        createdbypersonid,
        payload,
        requestids
    )
    values
    (
        p_competitionid,
        p_createdbypersonid,
        p_metadata,
        v_request_ids
    )
    returning batchid
    into v_batch_id;

    update public.paidtimerequest
    set batchid = v_batch_id
    where paidtimerequestid = any(v_request_ids);

    return query
    select
        unnest(v_request_ids) as "PaidTimeRequestId",
        v_batch_id as "BatchId";
end;
$function$;
