-- ============================================================================
-- usp_getpayercompetitionaccount - full JSON account view for one managed payer
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. This proc had
-- only been recovered at signature level during the initial Stage 1 sweep; a
-- fresh pg_get_functiondef read was performed before writing this file.
-- Reproduced verbatim; no behavioral change of any kind.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). This proc DOES perform a real authorization check internally -
-- it verifies p_adminsystemuserid actually manages p_payerpersonid (via
-- personmanagedbysystemuser + personranchrole, role 'משלם') within
-- p_ranchid, and raises if not. The audit's finding was at the C# controller
-- layer only: GET /api/Payers/competition-account checks the caller's role
-- but never cross-checks that the competition it was given belongs to the
-- ranch it was given (unlike the self-service my-competition-account variant,
-- which forces payerPersonId=caller and so has limited blast radius). No
-- issue in this SQL body itself was flagged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getpayercompetitionaccount(p_competitionid integer, p_ranchid integer, p_payerpersonid integer, p_adminsystemuserid integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    v_is_managed boolean;
    v_result jsonb;
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_payerpersonid is null or p_payerpersonid <= 0 then
        raise exception 'Invalid payer person id';
    end if;

    if p_adminsystemuserid is null or p_adminsystemuserid <= 0 then
        raise exception 'Invalid admin system user id';
    end if;

    select exists (
        select 1
        from public.personmanagedbysystemuser m
        inner join public.personranchrole prr
            on prr.personid = m.personid
        inner join public.role r
            on r.roleid = prr.roleid
        where m.systemuserid = p_adminsystemuserid
          and m.personid = p_payerpersonid
          and m.approvalstatus = 'Approved'
          and prr.ranchid = p_ranchid
          and r.rolename = 'משלם'
    )
    into v_is_managed;

    if v_is_managed = false then
        raise exception 'Payer is not managed by this admin in this ranch';
    end if;

    with payer_base as (
        select
            p.personid,
            p.firstname,
            p.lastname,
            p.cellphone,
            p.email
        from public.person p
        where p.personid = p_payerpersonid
    ),

    charge_allocations as (
        select
            fca.billchargeid,
            coalesce(sum(fca.allocatedamount), 0)::numeric as coveredamount
        from public.federationcreditallocation fca
        group by
            fca.billchargeid
    ),

    payer_charges as (
        select
            bc.*,
            coalesce(ca.coveredamount, 0)::numeric as federationcoveredamount
        from public.billcharge bc
        left join charge_allocations ca
            on ca.billchargeid = bc.billchargeid
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_payerpersonid
          and bc.chargestatus in ('Open', 'Paid')
    ),

    class_charge_summary as (
        select
            bc.sourceid as entryid,

            max(bc.billid) as billid,

            coalesce(sum(
                case
                    when bc.chargeowner = 'Organizer'
                     and bc.categorykey = 'classes'
                     and bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as organizercost,

            coalesce(sum(
                case
                    when bc.chargeowner = 'Federation'
                     and bc.categorykey = 'classes'
                     and bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as federationcost,

            coalesce(sum(
                case
                    when bc.categorykey = 'classes'
                     and bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as totalamount,

            coalesce(sum(
                case
                    when bc.chargeowner = 'Federation'
                     and bc.categorykey = 'classes'
                    then
                        case
                            when bc.chargestatus = 'Paid' then bc.amounttopay
                            else least(
                                bc.amounttopay,
                                coalesce(bc.federationcoveredamount, 0)
                            )
                        end

                    when bc.chargestatus = 'Paid'
                    then bc.amounttopay

                    else 0
                end
            ), 0)::numeric as paidamount,

            coalesce(sum(
                case
                    when bc.chargeowner = 'Federation'
                     and bc.categorykey = 'classes'
                    then greatest(
                        bc.amounttopay -
                        case
                            when bc.chargestatus = 'Paid' then bc.amounttopay
                            else least(
                                bc.amounttopay,
                                coalesce(bc.federationcoveredamount, 0)
                            )
                        end,
                        0
                    )

                    when bc.chargestatus = 'Open'
                    then bc.amounttopay

                    else 0
                end
            ), 0)::numeric as unpaidamount,

            (
                coalesce(sum(
                    case
                        when bc.categorykey = 'classes'
                         and bc.chargestatus in ('Open', 'Paid')
                        then bc.amounttopay
                        else 0
                    end
                ), 0) > 0
                and
                coalesce(sum(
                    case
                        when bc.chargeowner = 'Federation'
                         and bc.categorykey = 'classes'
                        then greatest(
                            bc.amounttopay -
                            case
                                when bc.chargestatus = 'Paid' then bc.amounttopay
                                else least(
                                    bc.amounttopay,
                                    coalesce(bc.federationcoveredamount, 0)
                                )
                            end,
                            0
                        )

                        when bc.chargestatus = 'Open'
                        then bc.amounttopay

                        else 0
                    end
                ), 0) = 0
            )::boolean as ispaid

        from payer_charges bc
        where bc.sourcetype = 'Entry'
          and bc.categorykey = 'classes'
        group by
            bc.sourceid
    ),

    class_items as (
        select
            e.entryid,
            ccs.billid,
            ct.classname::text as classname,
            cic.classdatetime,
            cic.starttime,
            cic.orderinday,

            ccs.organizercost,
            ccs.federationcost,
            ccs.totalamount,
            ccs.paidamount,
            ccs.unpaidamount,

            h.horseid,
            h.horsename::text as horsename,
            h.barnname::text as barnname,

            concat_ws(' ', rider_person.firstname, rider_person.lastname)::text as ridername,

            case
                when coach_person.personid is null then null
                else concat_ws(' ', coach_person.firstname, coach_person.lastname)::text
            end as coachname,

            ccs.ispaid

        from class_charge_summary ccs
        inner join public.entry e
            on e.entryid = ccs.entryid
        inner join public.servicerequest sr
            on sr.srequestid = e.entryid
        inner join public.classincompetition cic
            on cic.classincompid = e.classincompid
        inner join public.classtype ct
            on ct.classtypeid = cic.classtypeid
        inner join public.horse h
            on h.horseid = sr.horseid
        inner join public.federationmember rider_fm
            on rider_fm.federationmemberid = sr.riderfederationmemberid
        inner join public.person rider_person
            on rider_person.personid = rider_fm.federationmemberid
        left join public.federationmember coach_fm
            on coach_fm.federationmemberid = sr.coachfederationmemberid
        left join public.person coach_person
            on coach_person.personid = coach_fm.federationmemberid
        where cic.competitionid = p_competitionid
          and h.ranchid = p_ranchid
    ),

    paidtime_charge_summary as (
        select
            bc.sourceid as paidtimerequestid,
            max(bc.billid) as billid,

            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as amounttopay,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Paid'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as paidamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Open'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as unpaidamount,

            (
                coalesce(sum(
                    case
                        when bc.chargestatus in ('Open', 'Paid')
                        then bc.amounttopay
                        else 0
                    end
                ), 0) > 0
                and
                coalesce(sum(
                    case
                        when bc.chargestatus = 'Open'
                        then bc.amounttopay
                        else 0
                    end
                ), 0) = 0
            )::boolean as ispaid

        from payer_charges bc
        where bc.sourcetype = 'PaidTimeRequest'
          and bc.categorykey = 'paid-time'
        group by
            bc.sourceid
    ),

    paidtime_items as (
        select
            ptr.paidtimerequestid,
            pcs.billid,

            ptr.status::text as status,
            ptr.notes::text as notes,
            pcs.amounttopay,
            pcs.paidamount,
            pcs.unpaidamount,

            p.productname::text as productname,

            h.horseid,
            h.horsename::text as horsename,
            h.barnname::text as barnname,

            concat_ws(' ', rider_person.firstname, rider_person.lastname)::text as ridername,

            case
                when coach_person.personid is null then null
                else concat_ws(' ', coach_person.firstname, coach_person.lastname)::text
            end as coachname,

            requested_slot.slotdate as requestedslotdate,
            requested_slot.starttime as requestedstarttime,
            requested_slot.endtime as requestedendtime,
            requested_arena.arenaname::text as requestedarenaname,

            assigned_slot.slotdate as assignedslotdate,
            assigned_slot.starttime as assignedstarttime,
            assigned_slot.endtime as assignedendtime,
            assigned_arena.arenaname::text as assignedarenaname,

            coalesce(assigned_slot.slotdate, requested_slot.slotdate) as displayslotdate,
            coalesce(assigned_slot.starttime, requested_slot.starttime) as displaystarttime,
            coalesce(assigned_slot.endtime, requested_slot.endtime) as displayendtime,
            coalesce(assigned_arena.arenaname, requested_arena.arenaname)::text as displayarenaname,

            pcs.ispaid

        from paidtime_charge_summary pcs
        inner join public.paidtimerequest ptr
            on ptr.paidtimerequestid = pcs.paidtimerequestid
        inner join public.servicerequest sr
            on sr.srequestid = ptr.paidtimerequestid
        inner join public.horse h
            on h.horseid = sr.horseid
        inner join public.federationmember rider_fm
            on rider_fm.federationmemberid = sr.riderfederationmemberid
        inner join public.person rider_person
            on rider_person.personid = rider_fm.federationmemberid
        left join public.federationmember coach_fm
            on coach_fm.federationmemberid = sr.coachfederationmemberid
        left join public.person coach_person
            on coach_person.personid = coach_fm.federationmemberid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = ptr.pricecatalogid
        inner join public.product p
            on p.productid = pc.productid
        inner join public.paidtimeslotincompetition requested_slot
            on requested_slot.paidtimeslotincompid = ptr.requestedcompslotid
        inner join public.arena requested_arena
            on requested_arena.ranchid = requested_slot.arenaranchid
           and requested_arena.arenaid = requested_slot.arenaid
        left join public.paidtimeslotincompetition assigned_slot
            on assigned_slot.paidtimeslotincompid = ptr.assignedcompslotid
        left join public.arena assigned_arena
            on assigned_arena.ranchid = assigned_slot.arenaranchid
           and assigned_arena.arenaid = assigned_slot.arenaid
        where requested_slot.competitionid = p_competitionid
          and h.ranchid = p_ranchid
    ),

    product_charge_summary as (
        select
            bc.sourceid as prequestid,
            max(bc.billid) as billid,
            bc.categorykey,

            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as amounttopay,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Paid'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as paidamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Open'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as unpaidamount,

            (
                coalesce(sum(
                    case
                        when bc.chargestatus in ('Open', 'Paid')
                        then bc.amounttopay
                        else 0
                    end
                ), 0) > 0
                and
                coalesce(sum(
                    case
                        when bc.chargestatus = 'Open'
                        then bc.amounttopay
                        else 0
                    end
                ), 0) = 0
            )::boolean as ispaid

        from payer_charges bc
        where bc.sourcetype = 'ProductRequest'
          and bc.categorykey in ('stalls', 'shavings')
        group by
            bc.sourceid,
            bc.categorykey
    ),

    stall_items as (
        select
            sb.stallbookingid,
            pcs.billid,

            sb.horseid,
            h.horsename::text as horsename,
            h.barnname::text as barnname,

            sb.isfortack,
            sb.startdate,
            sb.enddate,
            sb.compoundid,
            sb.stallid,

            pc.pricecatalogid,
            pc.itemprice,
            product.productname::text as productname,

            pr.notes,

            pcs.amounttopay,
            pcs.paidamount,
            pcs.unpaidamount,
            pcs.ispaid,

            exists (
                select 1
                from public.productchangerequest pcr
                where pcr.originalprequestid = pr.prequestid
                  and pcr.iscancelled = true
                  and pcr.status = 'Approved'
            ) as iscancelled,

            exists (
                select 1
                from public.productchangerequest pcr
                where pcr.originalprequestid = pr.prequestid
                  and pcr.iscancelled = true
                  and pcr.status = 'Pending'
            ) as haspendingcancellation,

            exists (
                select 1
                from public.productchangerequest pcr
                where pcr.originalprequestid = pr.prequestid
                  and pcr.iscancelled = false
                  and pcr.status = 'Pending'
                  and pcr.newprequestid is not null
            ) as haspendingchange

        from product_charge_summary pcs
        inner join public.productrequest pr
            on pr.prequestid = pcs.prequestid
        inner join public.stallbooking sb
            on sb.stallbookingid = pr.prequestid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = pr.pricecatalogid
        inner join public.product product
            on product.productid = pc.productid
        left join public.horse h
            on h.horseid = sb.horseid
        where pcs.categorykey = 'stalls'
          and pr.competitionid = p_competitionid
          and sb.ranchid = p_ranchid
          and not exists (
              select 1
              from public.productchangerequest pcr
              where pcr.newprequestid = pr.prequestid
                and pcr.status = 'Pending'
          )
    ),

    shavings_items as (
        select
            so.shavingsorderid,
            pcs.billid,

            so.bagquantity,
            so.requesteddeliverytime,
            so.deliverystatus::text as deliverystatus,
            so.notes::text as notes,

            pc.pricecatalogid,
            pc.itemprice,
            product.productname::text as productname,

            pcs.amounttopay,
            pcs.paidamount,
            pcs.unpaidamount,
            pcs.ispaid

        from product_charge_summary pcs
        inner join public.productrequest pr
            on pr.prequestid = pcs.prequestid
        inner join public.shavingsorder so
            on so.shavingsorderid = pr.prequestid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = pr.pricecatalogid
        inner join public.product product
            on product.productid = pc.productid
        where pcs.categorykey = 'shavings'
          and pr.competitionid = p_competitionid
          and exists (
              select 1
              from public.shavingsorderforstallbooking sosb
              inner join public.stallbooking sb
                  on sb.stallbookingid = sosb.stallbookingid
              where sosb.shavingsorderid = so.shavingsorderid
                and sb.ranchid = p_ranchid
          )
    ),

    fine_items as (
        select
            bc.billchargeid,
            bc.billid,
            bc.sourceid,
            bc.amounttopay,
            bc.chargestatus,
            bc.notes
        from payer_charges bc
        where bc.categorykey = 'fine'
          and bc.sourcetype = 'Fine'
    ),

    summary_values as (
        select
            coalesce((select sum(organizercost) from class_items), 0)::numeric as classorganizertotal,
            coalesce((select sum(federationcost) from class_items), 0)::numeric as classfederationtotal,
            coalesce((select sum(totalamount) from class_items), 0)::numeric as classgrandtotal,

            coalesce((select sum(amounttopay) from paidtime_items), 0)::numeric as paidtimetotal,
            coalesce((select sum(amounttopay) from stall_items), 0)::numeric as stalltotal,
            coalesce((select sum(amounttopay) from shavings_items), 0)::numeric as shavingstotal,
            coalesce((select sum(amounttopay) from fine_items), 0)::numeric as finetotal,

            coalesce((select sum(paidamount) from class_items), 0)::numeric as classpaidamount,
            coalesce((select sum(paidamount) from paidtime_items), 0)::numeric as paidtimepaidamount,
            coalesce((select sum(paidamount) from stall_items), 0)::numeric as stallpaidamount,
            coalesce((select sum(paidamount) from shavings_items), 0)::numeric as shavingspaidamount,
            coalesce((
                select sum(amounttopay)
                from fine_items
                where chargestatus = 'Paid'
            ), 0)::numeric as finepaidamount
    ),

    final_summary as (
        select
            classorganizertotal,
            classfederationtotal,
            classgrandtotal,
            paidtimetotal,
            stalltotal,
            shavingstotal,
            finetotal,

            classorganizertotal + paidtimetotal + stalltotal + shavingstotal + finetotal as organizertotal,
            classfederationtotal as federationtotal,

            classgrandtotal + paidtimetotal + stalltotal + shavingstotal + finetotal as grandtotal,

            classpaidamount
            + paidtimepaidamount
            + stallpaidamount
            + shavingspaidamount
            + finepaidamount as paidamount,

            greatest(
                classgrandtotal + paidtimetotal + stalltotal + shavingstotal + finetotal
                -
                (
                    classpaidamount
                    + paidtimepaidamount
                    + stallpaidamount
                    + shavingspaidamount
                    + finepaidamount
                ),
                0
            ) as remainingamount,

            case
                when classgrandtotal + paidtimetotal + stalltotal + shavingstotal + finetotal = 0 then 'Unpaid'
                when
                    classpaidamount
                    + paidtimepaidamount
                    + stallpaidamount
                    + shavingspaidamount
                    + finepaidamount = 0
                    then 'Unpaid'
                when
                    classpaidamount
                    + paidtimepaidamount
                    + stallpaidamount
                    + shavingspaidamount
                    + finepaidamount
                    <
                    classgrandtotal + paidtimetotal + stalltotal + shavingstotal + finetotal
                    then 'Partial'
                else 'Paid'
            end as paymentstatus
        from summary_values
    )

    select jsonb_build_object(
        'payer',
        (
            select jsonb_build_object(
                'payerPersonId', pb.personid,
                'firstName', pb.firstname,
                'lastName', pb.lastname,
                'fullName', trim(pb.firstname || ' ' || pb.lastname),
                'cellPhone', pb.cellphone,
                'email', pb.email
            )
            from payer_base pb
        ),

        'summary',
        (
            select jsonb_build_object(
                'classOrganizerTotal', fs.classorganizertotal,
                'classFederationTotal', fs.classfederationtotal,
                'classGrandTotal', fs.classgrandtotal,
                'paidTimeTotal', fs.paidtimetotal,
                'stallTotal', fs.stalltotal,
                'shavingsTotal', fs.shavingstotal,
                'fineTotal', fs.finetotal,
                'organizerTotal', fs.organizertotal,
                'federationTotal', fs.federationtotal,
                'grandTotal', fs.grandtotal,
                'paidAmount', fs.paidamount,
                'remainingAmount', fs.remainingamount,
                'paymentStatus', fs.paymentstatus
            )
            from final_summary fs
        ),

        'classes',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'entryId', ci.entryid,
                        'billId', ci.billid,
                        'className', ci.classname,
                        'classDateTime', ci.classdatetime,
                        'startTime', ci.starttime,
                        'orderInDay', ci.orderinday,
                        'horseId', ci.horseid,
                        'horseName', ci.horsename,
                        'barnName', ci.barnname,
                        'riderName', ci.ridername,
                        'coachName', ci.coachname,
                        'organizerCost', ci.organizercost,
                        'federationCost', ci.federationcost,
                        'totalAmount', ci.totalamount,
                        'isPaid', ci.ispaid
                    )
                    order by
                        ci.classdatetime nulls last,
                        ci.orderinday nulls last,
                        ci.starttime nulls last,
                        ci.classname
                )
                from class_items ci
            ),
            '[]'::jsonb
        ),

        'paidTimes',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'paidTimeRequestId', pti.paidtimerequestid,
                        'billId', pti.billid,
                        'status', pti.status,
                        'notes', pti.notes,
                        'productName', pti.productname,
                        'amountToPay', pti.amounttopay,
                        'horseId', pti.horseid,
                        'horseName', pti.horsename,
                        'barnName', pti.barnname,
                        'riderName', pti.ridername,
                        'coachName', pti.coachname,
                        'displaySlotDate', pti.displayslotdate,
                        'displayStartTime', pti.displaystarttime,
                        'displayEndTime', pti.displayendtime,
                        'displayArenaName', pti.displayarenaname,
                        'requestedSlotDate', pti.requestedslotdate,
                        'requestedStartTime', pti.requestedstarttime,
                        'requestedEndTime', pti.requestedendtime,
                        'requestedArenaName', pti.requestedarenaname,
                        'assignedSlotDate', pti.assignedslotdate,
                        'assignedStartTime', pti.assignedstarttime,
                        'assignedEndTime', pti.assignedendtime,
                        'assignedArenaName', pti.assignedarenaname,
                        'isPaid', pti.ispaid
                    )
                    order by
                        pti.displayslotdate nulls last,
                        pti.displaystarttime nulls last,
                        pti.paidtimerequestid
                )
                from paidtime_items pti
            ),
            '[]'::jsonb
        ),

        'stalls',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'stallBookingId', si.stallbookingid,
                        'billId', si.billid,
                        'horseId', si.horseid,
                        'horseName', si.horsename,
                        'barnName', si.barnname,
                        'isForTack', si.isfortack,
                        'startDate', si.startdate,
                        'endDate', si.enddate,
                        'compoundId', si.compoundid,
                        'stallId', si.stallid,
                        'priceCatalogId', si.pricecatalogid,
                        'itemPrice', si.itemprice,
                        'productName', si.productname,
                        'notes', si.notes,
                        'amountToPay', si.amounttopay,
                        'paidAmount', si.paidamount,
                        'unpaidAmount', si.unpaidamount,
                        'isPaid', si.ispaid,
                        'isCancelled', si.iscancelled,
                        'hasPendingCancellation', si.haspendingcancellation,
                        'hasPendingChange', si.haspendingchange,
                        'shavingsOrders',
                        coalesce(
                            (
                                select jsonb_agg(
                                    jsonb_build_object(
                                        'shavingsOrderId', shi.shavingsorderid,
                                        'billId', shi.billid,
                                        'bagQuantity', shi.bagquantity,
                                        'requestedDeliveryTime', shi.requesteddeliverytime,
                                        'deliveryStatus', shi.deliverystatus,
                                        'notes', shi.notes,
                                        'priceCatalogId', shi.pricecatalogid,
                                        'itemPrice', shi.itemprice,
                                        'productName', shi.productname,
                                        'amountToPay', shi.amounttopay,
                                        'paidAmount', shi.paidamount,
                                        'unpaidAmount', shi.unpaidamount,
                                        'isPaid', shi.ispaid
                                    )
                                    order by
                                        shi.requesteddeliverytime nulls last,
                                        shi.shavingsorderid
                                )
                                from shavings_items shi
                                inner join public.shavingsorderforstallbooking sofsb
                                    on sofsb.shavingsorderid = shi.shavingsorderid
                                where sofsb.stallbookingid = si.stallbookingid
                            ),
                            '[]'::jsonb
                        )
                    )
                    order by
                        si.startdate,
                        si.horsename nulls last,
                        si.stallbookingid
                )
                from stall_items si
            ),
            '[]'::jsonb
        ),

        'shavings',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'shavingsOrderId', shi.shavingsorderid,
                        'billId', shi.billid,
                        'bagQuantity', shi.bagquantity,
                        'requestedDeliveryTime', shi.requesteddeliverytime,
                        'deliveryStatus', shi.deliverystatus,
                        'notes', shi.notes,
                        'priceCatalogId', shi.pricecatalogid,
                        'itemPrice', shi.itemprice,
                        'productName', shi.productname,
                        'amountToPay', shi.amounttopay,
                        'paidAmount', shi.paidamount,
                        'unpaidAmount', shi.unpaidamount,
                        'isPaid', shi.ispaid
                    )
                    order by
                        shi.requesteddeliverytime nulls last,
                        shi.shavingsorderid
                )
                from shavings_items shi
            ),
            '[]'::jsonb
        ),

        'fines',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'billChargeId', fi.billchargeid,
                        'billId', fi.billid,
                        'sourceId', fi.sourceid,
                        'amountToPay', fi.amounttopay,
                        'chargeStatus', fi.chargestatus,
                        'notes', fi.notes
                    )
                    order by fi.billchargeid
                )
                from fine_items fi
            ),
            '[]'::jsonb
        )
    )
    into v_result;

    return coalesce(v_result, '{}'::jsonb);
end;
$function$
