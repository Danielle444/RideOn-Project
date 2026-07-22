-- Captured verbatim from live (project sxplumrexbolpwqacpiz) via pg_get_functiondef, 2026-07-21.
-- This proc had never been committed; it was deployed straight through the SQL editor.
--
-- This `date`-argument overload is the REAL implementation and the one the app calls.
-- Live also carries a DEPRECATED timestamptz-argument overload of the same name: a thin
-- shim that casts ::date and delegates here. It is kept (not dropped) only for backward
-- compatibility; do not call it or extend it from new code. The C# DAL now sends real
-- `date` for p_newcompetitionstartdate/enddate, so it binds to this overload directly.
-- Do not redeploy this file without diffing against live first.

CREATE OR REPLACE FUNCTION public.usp_duplicatecompetitionfromselection(p_sourcecompetitionid integer, p_createdbysystemuserid integer, p_newcompetitionname text, p_newcompetitionstartdate date, p_newcompetitionenddate date, p_registrationopendate date DEFAULT NULL::date, p_registrationenddate date DEFAULT NULL::date, p_paidtimeregistrationdate date DEFAULT NULL::date, p_paidtimepublicationdate date DEFAULT NULL::date, p_notes text DEFAULT NULL::text, p_classjudgeids integer[] DEFAULT NULL::integer[], p_classesjson jsonb DEFAULT '[]'::jsonb, p_paidtimeslotsjson jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE("NewCompetitionId" integer, "CopiedClassesCount" integer, "CopiedClassPrizesCount" integer, "CopiedReiningPatternsCount" integer, "CopiedClassJudgesCount" integer, "CopiedPaidTimeSlotsCount" integer, "Message" text)
 LANGUAGE plpgsql
AS $function$
declare
    v_source competition%rowtype;
    v_new_competition_id integer;
    v_day_offset integer;

    v_selected_classes_count integer := 0;

    v_class record;
    v_new_class_id integer;
    v_judge_id integer;
    v_missing_judge_id integer;

    v_copied_classes_count integer := 0;
    v_copied_class_prizes_count integer := 0;
    v_copied_reining_patterns_count integer := 0;
    v_copied_class_judges_count integer := 0;
    v_copied_paid_time_slots_count integer := 0;
begin
    if p_sourcecompetitionid is null or p_sourcecompetitionid <= 0 then
        raise exception 'Source competition id is invalid';
    end if;

    if p_createdbysystemuserid is null or p_createdbysystemuserid <= 0 then
        raise exception 'Created by system user id is invalid';
    end if;

    if p_newcompetitionname is null or length(trim(p_newcompetitionname)) = 0 then
        raise exception 'Competition name is required';
    end if;

    if p_newcompetitionstartdate is null then
        raise exception 'Competition start date is required';
    end if;

    if p_newcompetitionenddate is null then
        raise exception 'Competition end date is required';
    end if;

    if p_newcompetitionenddate < p_newcompetitionstartdate then
        raise exception 'Competition end date cannot be earlier than start date';
    end if;

    if p_registrationopendate is not null
       and p_registrationenddate is not null
       and p_registrationenddate < p_registrationopendate then
        raise exception 'Registration end date cannot be earlier than registration open date';
    end if;

    select *
    into v_source
    from competition
    where competitionid = p_sourcecompetitionid;

    if not found then
        raise exception 'Source competition was not found';
    end if;

    if exists (
        select 1
        from competition
        where lower(trim(competitionname)) = lower(trim(p_newcompetitionname))
    ) then
        raise exception 'Competition name already exists';
    end if;

    create temporary table tmp_selected_classes (
        sourceclassincompid integer not null,
        copyclass boolean not null,
        copyclassprices boolean not null,
        copyclassprizes boolean not null,
        copyreiningpattern boolean not null
    ) on commit drop;

    insert into tmp_selected_classes (
        sourceclassincompid,
        copyclass,
        copyclassprices,
        copyclassprizes,
        copyreiningpattern
    )
    select
        item."sourceClassInCompId",
        coalesce(item."copyClass", true),
        coalesce(item."copyClassPrices", true),
        coalesce(item."copyClassPrizes", true),
        coalesce(item."copyReiningPattern", false)
    from jsonb_to_recordset(coalesce(p_classesjson, '[]'::jsonb)) as item(
        "sourceClassInCompId" integer,
        "copyClass" boolean,
        "copyClassPrices" boolean,
        "copyClassPrizes" boolean,
        "copyReiningPattern" boolean
    )
    where item."sourceClassInCompId" is not null;

    delete from tmp_selected_classes
    where copyclass = false;

    if exists (
        select 1
        from tmp_selected_classes selected_class
        where not exists (
            select 1
            from classincompetition source_class
            where source_class.classincompid = selected_class.sourceclassincompid
              and source_class.competitionid = p_sourcecompetitionid
        )
    ) then
        raise exception 'One or more selected classes do not belong to the source competition';
    end if;

    select count(*)
    into v_selected_classes_count
    from tmp_selected_classes;

    if v_selected_classes_count > 0 then
        if p_classjudgeids is null or cardinality(p_classjudgeids) = 0 then
            raise exception 'At least one judge must be selected when duplicating classes';
        end if;

        select selected_judge_id
        into v_missing_judge_id
        from unnest(p_classjudgeids) as selected_judge_id
        where selected_judge_id is null
           or selected_judge_id <= 0
           or not exists (
                select 1
                from judge j
                where j.judgeid = selected_judge_id
           )
        limit 1;

        if v_missing_judge_id is not null then
            raise exception 'One or more selected judges are invalid';
        end if;
    end if;

    create temporary table tmp_selected_paid_time_slots (
        sourcepaidtimeslotincompid integer not null,
        copypaidtimeslot boolean not null
    ) on commit drop;

    insert into tmp_selected_paid_time_slots (
        sourcepaidtimeslotincompid,
        copypaidtimeslot
    )
    select
        item."sourcePaidTimeSlotInCompId",
        coalesce(item."copyPaidTimeSlot", true)
    from jsonb_to_recordset(coalesce(p_paidtimeslotsjson, '[]'::jsonb)) as item(
        "sourcePaidTimeSlotInCompId" integer,
        "copyPaidTimeSlot" boolean
    )
    where item."sourcePaidTimeSlotInCompId" is not null;

    delete from tmp_selected_paid_time_slots
    where copypaidtimeslot = false;

    if exists (
        select 1
        from tmp_selected_paid_time_slots selected_slot
        where not exists (
            select 1
            from paidtimeslotincompetition source_slot
            where source_slot.paidtimeslotincompid = selected_slot.sourcepaidtimeslotincompid
              and source_slot.competitionid = p_sourcecompetitionid
        )
    ) then
        raise exception 'One or more selected paid time slots do not belong to the source competition';
    end if;

    v_day_offset := p_newcompetitionstartdate - v_source.competitionstartdate;

    insert into competition (
        hostranchid,
        fieldid,
        createdbysystemuserid,
        competitionname,
        competitionstartdate,
        competitionenddate,
        registrationopendate,
        registrationenddate,
        paidtimeregistrationdate,
        paidtimepublicationdate,
        competitionstatus,
        notes,
        stallmapurl,
        stallmappublishedat,
        stallmappublishedbysystemuserid
    )
    values (
        v_source.hostranchid,
        v_source.fieldid,
        p_createdbysystemuserid,
        trim(p_newcompetitionname),
        p_newcompetitionstartdate,
        p_newcompetitionenddate,
        p_registrationopendate,
        p_registrationenddate,
        p_paidtimeregistrationdate,
        p_paidtimepublicationdate,
        'Draft',
        nullif(trim(coalesce(p_notes, '')), ''),
        null,
        null,
        null
    )
    returning competitionid into v_new_competition_id;

    create temporary table tmp_duplicate_class_map (
        oldclassincompid integer not null,
        newclassincompid integer not null,
        copyclassprizes boolean not null,
        copyreiningpattern boolean not null
    ) on commit drop;

    for v_class in
        select
            selected_class.sourceclassincompid,
            selected_class.copyclassprices,
            selected_class.copyclassprizes,
            selected_class.copyreiningpattern,
            source_class.*
        from tmp_selected_classes selected_class
        join classincompetition source_class
            on source_class.classincompid = selected_class.sourceclassincompid
        order by source_class.classdatetime, source_class.starttime, source_class.orderinday, source_class.classincompid
    loop
        insert into classincompetition (
            competitionid,
            classtypeid,
            arenaranchid,
            arenaid,
            classdatetime,
            starttime,
            orderinday,
            organizercost,
            federationcost,
            classnotes
        )
        values (
            v_new_competition_id,
            v_class.classtypeid,
            v_class.arenaranchid,
            v_class.arenaid,
            case
                when v_class.classdatetime is null then null
                else v_class.classdatetime + (v_day_offset * interval '1 day')
            end,
            v_class.starttime,
            v_class.orderinday,
            case
                when v_class.copyclassprices = true then v_class.organizercost
                else 0
            end,
            case
                when v_class.copyclassprices = true then v_class.federationcost
                else 0
            end,
            v_class.classnotes
        )
        returning classincompid into v_new_class_id;

        insert into tmp_duplicate_class_map (
            oldclassincompid,
            newclassincompid,
            copyclassprizes,
            copyreiningpattern
        )
        values (
            v_class.sourceclassincompid,
            v_new_class_id,
            v_class.copyclassprizes,
            v_class.copyreiningpattern
        );

        v_copied_classes_count := v_copied_classes_count + 1;

        foreach v_judge_id in array p_classjudgeids
        loop
            insert into classjudge (
                classincompid,
                judgeid
            )
            values (
                v_new_class_id,
                v_judge_id
            )
            on conflict do nothing;

            v_copied_class_judges_count := v_copied_class_judges_count + 1;
        end loop;
    end loop;

    insert into classprize (
        classincompid,
        prizetypeid,
        prizeamount
    )
    select
        class_map.newclassincompid,
        source_prize.prizetypeid,
        source_prize.prizeamount
    from classprize source_prize
    join tmp_duplicate_class_map class_map
        on class_map.oldclassincompid = source_prize.classincompid
    where class_map.copyclassprizes = true;

    get diagnostics v_copied_class_prizes_count = row_count;

    insert into reiningtype (
        reiningclassincompid,
        patternnumber
    )
    select
        class_map.newclassincompid,
        source_reining.patternnumber
    from reiningtype source_reining
    join tmp_duplicate_class_map class_map
        on class_map.oldclassincompid = source_reining.reiningclassincompid
    where class_map.copyreiningpattern = true;

    get diagnostics v_copied_reining_patterns_count = row_count;

    insert into paidtimeslotincompetition (
        competitionid,
        paidtimeslotid,
        arenaranchid,
        arenaid,
        slotdate,
        starttime,
        endtime,
        slotstatus,
        slotnotes,
        ispublished
    )
    select
        v_new_competition_id,
        source_slot.paidtimeslotid,
        source_slot.arenaranchid,
        source_slot.arenaid,
        source_slot.slotdate + v_day_offset,
        source_slot.starttime,
        source_slot.endtime,
        source_slot.slotstatus,
        source_slot.slotnotes,
        false
    from paidtimeslotincompetition source_slot
    join tmp_selected_paid_time_slots selected_slot
        on selected_slot.sourcepaidtimeslotincompid = source_slot.paidtimeslotincompid
    order by source_slot.slotdate, source_slot.starttime, source_slot.paidtimeslotincompid;

    get diagnostics v_copied_paid_time_slots_count = row_count;

    return query
    select
        v_new_competition_id as "NewCompetitionId",
        v_copied_classes_count as "CopiedClassesCount",
        v_copied_class_prizes_count as "CopiedClassPrizesCount",
        v_copied_reining_patterns_count as "CopiedReiningPatternsCount",
        v_copied_class_judges_count as "CopiedClassJudgesCount",
        v_copied_paid_time_slots_count as "CopiedPaidTimeSlotsCount",
        'Competition duplicated from selection successfully'::text as "Message";
end;
$function$
