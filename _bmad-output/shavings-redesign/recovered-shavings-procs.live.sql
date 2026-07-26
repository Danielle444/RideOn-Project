-- ============================================================================
-- RECOVERED shavings stored procedures — pulled verbatim from LIVE DB
-- Project: sxplumrexbolpwqacpiz  |  Pulled: 2026-07-23  |  Source: pg_get_functiondef
--
-- These 9 procedures are DEPLOYED and running in production but had NO committed
-- .sql file in the repo (see shavings-data-layer-map.md, finding #5). Captured
-- here so the redesign is written against real source, not names.
--
-- ACTION FOR THE bmad-spec / dev SESSION: split into one-file-per-proc under
-- RideOnDB/StoredProcedures/PostgreSQL/Individual/ following the NNN_usp_*.sql
-- convention, assigning NON-colliding numbers (current on-disk collisions: two
-- 114_*, two 115_*). Do NOT invent numbers blindly — reconcile against the folder.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) usp_createshavingsorder  (WRITE — secretary/admin add-order; issue #32)
--    Note: already accepts p_ranchid + p_stalls jsonb. Inserts productrequest +
--    shavingsorder + shavingsorderforstallbooking, then splits cost across payers
--    via billcharge/billproductrequest. deliverystatus seeded 'Pending'.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_createshavingsorder(
    p_competitionid integer,
    p_orderedbysystemuserid integer,
    p_pricecatalogid integer,
    p_ranchid integer,
    p_notes text,
    p_requesteddeliverytime timestamp without time zone,
    p_stalls jsonb
)
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) usp_getallshavingsorderdetailsforcompetitionandranch  (READ — per-stall lines)
--    NOTE: param names are competitionid_param / ranchid_param (inconsistent with
--    the p_ convention used elsewhere — flagged in map).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_getallshavingsorderdetailsforcompetitionandranch(
    competitionid_param integer,
    ranchid_param integer
)
 RETURNS TABLE("ShavingsOrderId" integer, "StallBookingId" integer, "HorseId" integer, "HorseName" character varying, "BagQuantityPerStall" smallint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        sosbs.shavingsorderid,
        sosbs.stallbookingid,
        h.horseid,
        h.horsename,
        sosbs.bagquantityperstall
    FROM shavingsorderforstallbooking sosbs
    INNER JOIN stallbooking sb
        ON sb.stallbookingid = sosbs.stallbookingid
    LEFT JOIN horse h
        ON h.horseid = sb.horseid
    INNER JOIN productrequest pr
        ON pr.prequestid = sb.stallbookingid
    WHERE
        pr.competitionid = competitionid_param
        AND sb.ranchid = ranchid_param;
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) usp_getallshavingsorderpayersforcompetitionandranch  (READ — payers per order)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_getallshavingsorderpayersforcompetitionandranch(
    p_competitionid integer,
    p_ranchid integer
)
 RETURNS TABLE(shavingsorderid integer, billid integer, paidbypersonid integer, payerfullname text, amounttopay numeric, dateopened timestamp with time zone, dateclosed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        so.shavingsorderid,
        b.billid,
        b.paidbypersonid,
        (p.firstname || ' ' || p.lastname)::TEXT AS payerfullname,
        bpr.amounttopay,
        b.dateopened,
        b.dateclosed
    FROM shavingsorder so
    INNER JOIN productrequest pr
        ON pr.prequestid = so.shavingsorderid
    INNER JOIN billproductrequest bpr
        ON bpr.prequestid = so.shavingsorderid
    INNER JOIN bill b
        ON b.billid = bpr.billid
    INNER JOIN person p
        ON p.personid = b.paidbypersonid
    INNER JOIN shavingsorderforstallbooking sosb
        ON sosb.shavingsorderid = so.shavingsorderid
    INNER JOIN stallbooking sb
        ON sb.stallbookingid = sosb.stallbookingid
    WHERE pr.competitionid = p_competitionId
      AND sb.ranchid = p_ranchId
    ORDER BY so.shavingsorderid, payerfullname;
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) usp_getcompetitionsummaryshavingsdetails  (READ — end-of-comp summary rollup)
--    ** issue #29 draws its redesign from this. Groups by BOOKING ranch, rolls up
--    OrderCount/StallCount/BagQuantity + Expected/Paid/Unpaid. Filters p.categoryid=3.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummaryshavingsdetails(
    p_competitionid integer,
    p_ranchid integer
)
 RETURNS TABLE("BookingRanchId" integer, "BookingRanchName" text, "OrderCount" integer, "StallCount" integer, "BagQuantity" integer, "ExpectedAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if not exists (
        select 1
        from public.competition c
        where c.competitionid = p_competitionid
          and c.hostranchid = p_ranchid
    ) then
        raise exception 'Competition not found for this host ranch';
    end if;

    return query
    with order_amounts as (
        select
            bc.sourceid as prequestid,
            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid') then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as expectedamount,
            coalesce(sum(
                case
                    when bc.chargestatus = 'Paid' then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as paidamount,
            coalesce(sum(
                case
                    when bc.chargestatus = 'Open' then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as unpaidamount
        from public.billcharge bc
        where bc.competitionid = p_competitionid
          and bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'shavings'
          and bc.chargestatus in ('Open', 'Paid')
        group by bc.sourceid
    ),
    order_ranch_data as (
        select
            so.shavingsorderid,
            sb.ranchid as bookingranchid,
            r.ranchname::text as bookingranchname,
            count(sofsb.stallbookingid)::integer as stallcount,
            coalesce(sum(sofsb.bagquantityperstall), 0)::integer as bagquantity,
            max(oa.expectedamount)::numeric as expectedamount,
            max(oa.paidamount)::numeric as paidamount,
            max(oa.unpaidamount)::numeric as unpaidamount
        from public.shavingsorder so
        inner join public.productrequest pr
            on pr.prequestid = so.shavingsorderid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = pr.pricecatalogid
        inner join public.product p
            on p.productid = pc.productid
        inner join public.shavingsorderforstallbooking sofsb
            on sofsb.shavingsorderid = so.shavingsorderid
        inner join public.stallbooking sb
            on sb.stallbookingid = sofsb.stallbookingid
        inner join public.ranch r
            on r.ranchid = sb.ranchid
        inner join order_amounts oa
            on oa.prequestid = pr.prequestid
        where pr.competitionid = p_competitionid
          and p.categoryid = 3
        group by
            so.shavingsorderid,
            sb.ranchid,
            r.ranchname
    )
    select
        ord.bookingranchid::integer as "BookingRanchId",
        ord.bookingranchname::text as "BookingRanchName",
        count(distinct ord.shavingsorderid)::integer as "OrderCount",
        coalesce(sum(ord.stallcount), 0)::integer as "StallCount",
        coalesce(sum(ord.bagquantity), 0)::integer as "BagQuantity",
        coalesce(sum(ord.expectedamount), 0)::numeric as "ExpectedAmount",
        coalesce(sum(ord.paidamount), 0)::numeric as "PaidAmount",
        coalesce(sum(ord.unpaidamount), 0)::numeric as "UnpaidAmount"
    from order_ranch_data ord
    group by
        ord.bookingranchid,
        ord.bookingranchname
    order by
        ord.bookingranchname;
end;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) usp_getcompetitionsummaryshavingsentries  (READ — end-of-comp per-order rows)
--    ** issue #29 draws its redesign from this. Per-order rows for one booking ranch,
--    with DeliveryStatus, HorseNames, PayerNames, IsPaid + amounts. Note the Hebrew
--    literal 'תא ציוד' (tack/equipment stall) as horsename fallback.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummaryshavingsentries(
    p_competitionid integer,
    p_ranchid integer,
    p_bookingranchid integer
)
 RETURNS TABLE("ShavingsOrderId" integer, "BookingRanchName" text, "StallCount" integer, "BagQuantity" integer, "RequestedDeliveryTime" timestamp without time zone, "DeliveryStatus" text, "HorseNames" text, "PayerNames" text, "IsPaid" boolean, "ExpectedAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_bookingranchid is null or p_bookingranchid <= 0 then
        raise exception 'Invalid booking ranch id';
    end if;

    return query
    with payer_data as (
        select
            bc.sourceid as prequestid,
            string_agg(
                distinct concat_ws(' ', payer_p.firstname, payer_p.lastname),
                ', '
            )::text as payernames,
            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid') then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as expectedamount,
            coalesce(sum(
                case
                    when bc.chargestatus = 'Paid' then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as paidamount,
            coalesce(sum(
                case
                    when bc.chargestatus = 'Open' then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as unpaidamount
        from public.billcharge bc
        inner join public.person payer_p
            on payer_p.personid = bc.paidbypersonid
        where bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'shavings'
          and bc.chargestatus in ('Open', 'Paid')
        group by bc.sourceid
    )
    select
        so.shavingsorderid::integer as "ShavingsOrderId",
        r.ranchname::text as "BookingRanchName",
        count(sofsb.stallbookingid)::integer as "StallCount",
        coalesce(sum(sofsb.bagquantityperstall), 0)::integer as "BagQuantity",
        so.requesteddeliverytime as "RequestedDeliveryTime",
        so.deliverystatus::text as "DeliveryStatus",
        string_agg(
            distinct coalesce(h.horsename, 'תא ציוד'),
            ', '
        )::text as "HorseNames",
        coalesce(pd.payernames, '-')::text as "PayerNames",
        (
            coalesce(pd.expectedamount, 0) > 0
            and coalesce(pd.unpaidamount, 0) = 0
        )::boolean as "IsPaid",
        coalesce(pd.expectedamount, 0)::numeric as "ExpectedAmount",
        coalesce(pd.paidamount, 0)::numeric as "PaidAmount",
        coalesce(pd.unpaidamount, 0)::numeric as "UnpaidAmount"
    from public.shavingsorder so
    inner join public.productrequest pr
        on pr.prequestid = so.shavingsorderid
    inner join public.pricecatalog pc
        on pc.pricecatalogid = pr.pricecatalogid
    inner join public.product p
        on p.productid = pc.productid
    inner join public.shavingsorderforstallbooking sofsb
        on sofsb.shavingsorderid = so.shavingsorderid
    inner join public.stallbooking sb
        on sb.stallbookingid = sofsb.stallbookingid
    inner join public.ranch r
        on r.ranchid = sb.ranchid
    left join public.horse h
        on h.horseid = sb.horseid
    inner join payer_data pd
        on pd.prequestid = pr.prequestid
    inner join public.competition c
        on c.competitionid = pr.competitionid
    where pr.competitionid = p_competitionid
      and c.hostranchid = p_ranchid
      and p.categoryid = 3
      and sb.ranchid = p_bookingranchid
    group by
        so.shavingsorderid,
        r.ranchname,
        so.requesteddeliverytime,
        so.deliverystatus,
        pd.payernames,
        pd.expectedamount,
        pd.paidamount,
        pd.unpaidamount
    order by
        so.requesteddeliverytime nulls last,
        so.shavingsorderid;
end;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6) usp_getpayersforshavingsorder  (READ — payers for a single order)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_getpayersforshavingsorder(
    p_shavingsorderid integer
)
 RETURNS TABLE(shavingsorderid integer, billid integer, paidbypersonid integer, payerfullname text, amounttopay numeric, dateopened timestamp with time zone, dateclosed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        so.shavingsorderid,
        b.billid,
        b.paidbypersonid,
        (p.firstname || ' ' || p.lastname)::TEXT AS payerfullname,
        bpr.amounttopay,
        b.dateopened,
        b.dateclosed
    FROM shavingsorder so
    INNER JOIN billproductrequest bpr
        ON bpr.prequestid = so.shavingsorderid
    INNER JOIN bill b
        ON b.billid = bpr.billid
    INNER JOIN person p
        ON p.personid = b.paidbypersonid
    WHERE so.shavingsorderid = p_shavingsOrderId
    ORDER BY payerfullname;
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7) usp_getshavingsorderdetails  (READ — per-stall lines for one order)
--    NOTE: INNER JOIN horse (vs LEFT in #2) — a tack/equipment stall with no horse
--    would be dropped here. Behavioral inconsistency flagged in map.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_getshavingsorderdetails(
    p_shavingsorderid integer
)
 RETURNS TABLE(stallbookingid integer, horseid integer, horsename character varying, bagquantityperstall smallint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        sb.stallbookingid,
        sb.horseid,
        h.horsename,
        sosb.bagquantityperstall
    FROM shavingsorderforstallbooking sosb
    INNER JOIN stallbooking sb
        ON sb.stallbookingid = sosb.stallbookingid
    INNER JOIN horse h
        ON h.horseid = sb.horseid
    WHERE sosb.shavingsorderid = p_shavingsOrderId
    ORDER BY h.horsename;
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8) usp_getshavingsordersforcompetitionandranch  (READ — secretary order list)
--    ** Primary read behind the CURRENT secretary Shavings page. Returns the
--    zombie approval fields (ApprovedByPersonId/ApprovedAt) — issue #29 redesign
--    should stop surfacing these once approval is retired.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_getshavingsordersforcompetitionandranch(
    p_competitionid integer,
    p_ranchid integer
)
 RETURNS TABLE("ShavingsOrderId" integer, "RequestedDeliveryTime" timestamp without time zone, "BagQuantity" smallint, "DeliveryStatus" character varying, "Notes" character varying, "WorkerSystemUserId" integer, "ApprovedByPersonId" integer, "ApprovedAt" timestamp with time zone, "OrderedByName" text, "PriceCatalogId" integer, "ItemPrice" numeric, "TotalAmount" numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        so.shavingsorderid,
        so.requesteddeliverytime,
        so.bagquantity,
        so.deliverystatus,
        so.notes,
        so.workersystemuserid,
        so.approvedbypersonid,
        so.approvedat,
        CONCAT(
            p.firstname,
            ' ',
            p.lastname
        ) AS orderedbyname,
        pr.pricecatalogid,
        pc.itemprice,
        COALESCE(
            bpr_total.totalamount,
            0
        ) AS totalamount
    FROM shavingsorder so
    INNER JOIN productrequest pr
        ON pr.prequestid = so.shavingsorderid
    INNER JOIN pricecatalog pc
        ON pc.pricecatalogid = pr.pricecatalogid
    INNER JOIN systemuser su
        ON su.systemuserid = pr.orderedbysystemuserid
    INNER JOIN person p
        ON p.personid = su.systemuserid
    INNER JOIN shavingsorderforstallbooking sosb
        ON sosb.shavingsorderid = so.shavingsorderid
    INNER JOIN stallbooking sb
        ON sb.stallbookingid = sosb.stallbookingid
    LEFT JOIN (
        SELECT
            bpr.prequestid,
            SUM(bpr.amounttopay) AS totalamount
        FROM billproductrequest bpr
        GROUP BY bpr.prequestid
    ) bpr_total
        ON bpr_total.prequestid = pr.prequestid
    WHERE
        pr.competitionid = p_competitionid
        AND sb.ranchid = p_ranchid
    ORDER BY
        so.requesteddeliverytime DESC;
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9) usp_getstallbookingsforshavings  (READ — pickable stalls for add-order form)
--    Feeds issue #32 form: stalls available to attach a new shavings order to.
--    Excludes tack stalls (isfortack=false) and cancelled/superseded change reqs.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.usp_getstallbookingsforshavings(
    p_competitionid integer,
    p_ranchid integer
)
 RETURNS TABLE(stallbookingid integer, horseid integer, horsename character varying, startdate date, enddate date, compoundid smallint, stallid smallint, payernames text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        sb.stallbookingid,
        sb.horseid,
        h.horsename,
        sb.startdate,
        sb.enddate,
        sb.compoundid,
        sb.stallid,
        COALESCE(
            string_agg(DISTINCT (p.firstname || ' ' || p.lastname), ', '),
            ''
        )::text AS payernames
    FROM stallbooking sb
    INNER JOIN productrequest pr
        ON pr.prequestid = sb.stallbookingid
    INNER JOIN horse h
        ON h.horseid = sb.horseid
    LEFT JOIN billproductrequest bpr
        ON bpr.prequestid = sb.stallbookingid
    LEFT JOIN bill b
        ON b.billid = bpr.billid
    LEFT JOIN person p
        ON p.personid = b.paidbypersonid
    LEFT JOIN productchangerequest pcr
        ON pcr.originalprequestid = pr.prequestid
       AND pcr.status = 'Approved'
    WHERE pr.competitionid = p_competitionId
      AND sb.ranchid = p_ranchId
      AND sb.isfortack = false
      AND (
            pcr.productchangerequestid IS NULL
            OR (
                pcr.iscancelled = false
                AND pcr.newprequestid IS NULL
            )
          )
    GROUP BY
        sb.stallbookingid,
        sb.horseid,
        h.horsename,
        sb.startdate,
        sb.enddate,
        sb.compoundid,
        sb.stallid
    ORDER BY sb.startdate, h.horsename;
END;
$function$;
