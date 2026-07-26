CREATE OR REPLACE FUNCTION public.usp_createshavingsorder(p_competitionid integer, p_orderedbysystemuserid integer, p_pricecatalogid integer, p_ranchid integer, p_notes text, p_requesteddeliverytime timestamp without time zone, p_stalls jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_prequestid integer;
    v_shavingsorderid integer;
    v_itemprice numeric(10,2);
    v_catalog_ranchid integer;
    v_totalbags integer := 0;

    v_stall jsonb;
    v_stallbookingid integer;
    v_bagqty integer;
    v_stallprice numeric(10,2);
    v_payercount integer;
    v_amountperpayer numeric(10,2);

    v_billid integer;
    v_payerpersonid integer;
    v_payeramount numeric(10,2);
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_orderedbysystemuserid is null or p_orderedbysystemuserid <= 0 then
        raise exception 'Invalid ordered by system user id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_stalls is null
       or jsonb_typeof(p_stalls) <> 'array'
       or jsonb_array_length(p_stalls) = 0 then
        raise exception 'At least one stall is required';
    end if;

    select
        pc.itemprice,
        pc.ranchid
    into
        v_itemprice,
        v_catalog_ranchid
    from public.pricecatalog pc
    where pc.pricecatalogid = p_pricecatalogid
      and pc.isactive = true;

    if v_itemprice is null then
        raise exception 'PriceCatalog item not found or inactive';
    end if;

    if v_catalog_ranchid <> p_ranchid then
        raise exception 'Price catalog item does not belong to this ranch';
    end if;

    create temporary table temp_shavings_payer_amounts
    (
        payerpersonid integer primary key,
        amounttopay numeric(10,2) not null
    ) on commit drop;

    for v_stall in
        select *
        from jsonb_array_elements(p_stalls)
    loop
        v_stallbookingid := coalesce(
            v_stall ->> 'stallBookingId',
            v_stall ->> 'StallBookingId'
        )::integer;

        v_bagqty := coalesce(
            v_stall ->> 'bagQuantity',
            v_stall ->> 'BagQuantity'
        )::integer;

        if v_stallbookingid is null then
            raise exception 'stallBookingId is required';
        end if;

        if v_bagqty is null or v_bagqty <= 0 then
            raise exception 'Bag quantity must be positive';
        end if;

        if not exists (
            select 1
            from public.stallbooking sb
            inner join public.productrequest pr
                on pr.prequestid = sb.stallbookingid
            where sb.stallbookingid = v_stallbookingid
              and pr.competitionid = p_competitionid
              and sb.ranchid = p_ranchid
              and sb.isfortack = false
        ) then
            raise exception 'Invalid stall booking id %', v_stallbookingid;
        end if;

        select count(distinct b.paidbypersonid)
        into v_payercount
        from public.billcharge bc
        inner join public.bill b
            on b.billid = bc.billid
        where bc.sourcetype = 'ProductRequest'
          and bc.sourceid = v_stallbookingid
          and bc.categorykey = 'stalls'
          and bc.chargestatus in ('Open', 'Paid');

        if v_payercount = 0 then
            raise exception 'No payers found for stall booking id %', v_stallbookingid;
        end if;

        v_totalbags := v_totalbags + v_bagqty;
        v_stallprice := v_bagqty * v_itemprice;
        v_amountperpayer := ceil(v_stallprice / v_payercount);

        for v_payerpersonid in
            select distinct b.paidbypersonid
            from public.billcharge bc
            inner join public.bill b
                on b.billid = bc.billid
            where bc.sourcetype = 'ProductRequest'
              and bc.sourceid = v_stallbookingid
              and bc.categorykey = 'stalls'
              and bc.chargestatus in ('Open', 'Paid')
        loop
            insert into temp_shavings_payer_amounts
            (
                payerpersonid,
                amounttopay
            )
            values
            (
                v_payerpersonid,
                v_amountperpayer
            )
            on conflict (payerpersonid)
            do update
            set amounttopay =
                temp_shavings_payer_amounts.amounttopay + excluded.amounttopay;
        end loop;
    end loop;

    insert into public.productrequest
    (
        competitionid,
        orderedbysystemuserid,
        pricecatalogid,
        prequestdatetime,
        notes,
        approvaldate
    )
    values
    (
        p_competitionid,
        p_orderedbysystemuserid,
        p_pricecatalogid,
        now(),
        p_notes,
        null
    )
    returning prequestid
    into v_prequestid;

    insert into public.shavingsorder
    (
        shavingsorderid,
        notes,
        workersystemuserid,
        bagquantity,
        requesteddeliverytime,
        deliverystatus
    )
    values
    (
        v_prequestid,
        p_notes,
        null,
        v_totalbags,
        p_requesteddeliverytime,
        'Pending'
    )
    returning shavingsorderid
    into v_shavingsorderid;

    for v_stall in
        select *
        from jsonb_array_elements(p_stalls)
    loop
        v_stallbookingid := coalesce(
            v_stall ->> 'stallBookingId',
            v_stall ->> 'StallBookingId'
        )::integer;

        v_bagqty := coalesce(
            v_stall ->> 'bagQuantity',
            v_stall ->> 'BagQuantity'
        )::integer;

        insert into public.shavingsorderforstallbooking
        (
            shavingsorderid,
            stallbookingid,
            bagquantityperstall
        )
        values
        (
            v_prequestid,
            v_stallbookingid,
            v_bagqty
        );
    end loop;

    for v_payerpersonid, v_payeramount in
        select
            payerpersonid,
            amounttopay
        from temp_shavings_payer_amounts
    loop
        v_billid := public.usp_getorcreateopenbillforpayerandcompetition(
            v_payerpersonid,
            p_competitionid
        );

        insert into public.billproductrequest
        (
            billid,
            prequestid,
            amounttopay
        )
        values
        (
            v_billid,
            v_prequestid,
            v_payeramount
        );

        if v_payeramount > 0 then
            insert into public.billcharge
            (
                billid,
                competitionid,
                paidbypersonid,
                chargeowner,
                categorykey,
                sourcetype,
                sourceid,
                amounttopay,
                chargestatus,
                paymentbatchid,
                createdat
            )
            values
            (
                v_billid,
                p_competitionid,
                v_payerpersonid,
                'Organizer',
                'shavings',
                'ProductRequest',
                v_prequestid,
                v_payeramount,
                'Open',
                null,
                now()
            );
        end if;

        perform public.usp_recalculatebillamount(v_billid);
    end loop;

    return v_shavingsorderid;
end;
$function$;
