CREATE OR REPLACE FUNCTION public.usp_recalculatepaidtimeslotassignments(p_ranchid integer, p_assignedcompslotid integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    v_slotdate date;
    v_slotstart time;
    v_slotend time;
    v_slot_start_ts timestamp with time zone;
    v_slot_end_ts timestamp with time zone;

    v_max_order integer;
    v_order integer := 1;
    v_current_start timestamp with time zone;

    v_requestid integer;
    v_duration integer;
    v_competitionid integer;

    -- אימות מצב-סופי: מזהי השורות שהריצה הנוכחית כתבה להן assignedstarttime.
    -- זו "קבוצת השורות המושפעות", והיא הקובעת אילו הפרות חוסמות. הפרה שאינה
    -- נוגעת באף שורה מושפעת קדמה לפעולה הידנית ואינה נחסמת - אחרת קונפליקט
    -- היסטורי במקום אחר בתחרות היה משתיק כל פעולה ידנית בתחרות כולה.
    v_affected integer[] := array[]::integer[];
    v_bad text;
begin
    select
        ptc.slotdate,
        ptc.starttime,
        ptc.endtime,
        ptc.competitionid
    into
        v_slotdate,
        v_slotstart,
        v_slotend,
        v_competitionid
    from paidtimeslotincompetition ptc
    inner join competition c
        on c.competitionid = ptc.competitionid
    where ptc.paidtimeslotincompid = p_assignedcompslotid
      and c.hostranchid = p_ranchid;

    if v_slotdate is null then
        raise exception 'Paid time slot not found for this ranch';
    end if;

    -- נעילת-ייעוץ ברמת התחרות. הפרוצדורה נקראת בדרך-כלל מתוך פרוצדורה נועלת
    -- אחרת (assign/transfer/unassign) - נעילת-טרנזקציה חוזרת על אותו מפתח
    -- אינה חוסמת (re-entrant), ולכן בטוח לרכוש אותה גם כאן.
    perform pg_advisory_xact_lock(1734, v_competitionid);

    v_slot_start_ts := (v_slotdate + v_slotstart)::timestamp with time zone;
    v_slot_end_ts := (v_slotdate + v_slotend)::timestamp with time zone;
    v_current_start := v_slot_start_ts;

    select max(ptr.assignedorder)
    into v_max_order
    from paidtimerequest ptr
    where ptr.assignedcompslotid = p_assignedcompslotid
      and ptr.status = 'Assigned';

    if v_max_order is null then
        return;
    end if;

    while v_order <= v_max_order loop
        v_requestid := null;
        v_duration := 11; -- מקום ריק נחשב כברירת מחדל כמו ארוך

        select
            ptr.paidtimerequestid,
            ptp.durationminutes + 1
        into
            v_requestid,
            v_duration
        from paidtimerequest ptr
        inner join pricecatalog pc
            on pc.pricecatalogid = ptr.pricecatalogid
        inner join paidtimeproduct ptp
            on ptp.productid = pc.productid
        where ptr.assignedcompslotid = p_assignedcompslotid
          and ptr.status = 'Assigned'
          and ptr.assignedorder = v_order
        limit 1;

        if v_requestid is not null then
            if v_current_start + (v_duration || ' minutes')::interval > v_slot_end_ts then
                raise exception 'אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי';
            end if;

            update paidtimerequest
            set assignedstarttime = v_current_start
            where paidtimerequestid = v_requestid;

            v_affected := array_append(v_affected, v_requestid);
        end if;

        v_current_start := v_current_start + (v_duration || ' minutes')::interval;
        v_order := v_order + 1;
    end loop;

    -- =====================================================================
    -- אימות המצב הסופי
    -- =====================================================================
    -- הפרוצדורה מסדרת מחדש את *כל* שורות הסלוט לפי assignedorder, ולכן פעולה
    -- ידנית אחת יכולה להזיז שורות שהמזכירה לא נגעה בהן. עד כה לא נבדק דבר
    -- מלבד גבולות-הסלוט, ולכן פעולה ידנית יכלה לדרוס סידור חוקי שנוצר על ידי
    -- השיבוץ האוטומטי (V2-2) וליצור חפיפת מאמן/רוכב/סוס בלי שום התרעה.
    --
    -- הסמנטיקה זהה במדויק לזו של פרוצדורה 182 (usp_ApplyAutoScheduleV2):
    -- משך = durationminutes + 1, מרווחים חצי-פתוחים, חלון-הסלוט המלא,
    -- ומרווח-מעבר של 7 דקות למאמן אך ורק כשהמגרש שונה.
    --
    -- זהו אימות של התוצאה הסדרתית בלבד. אין כאן חיפוש חלופות ואין אלגוריתם
    -- שיבוץ שני - אם הסידור אינו חוקי, הפעולה נדחית ואינה "מתוקנת".
    --
    -- אטומיות: הפרוצדורה נקראת בתוך הוראה בודדת (assign/unassign/transfer),
    -- ולכן חריגה כאן מגלגלת גם את כל זמני-ההתחלה שחושבו מחדש למעלה וגם את
    -- העדכון של הקורא עצמו. אין מצב חלקי.
    if array_length(v_affected, 1) is null then
        return;
    end if;

    with final as (
        -- כל שורות ה-Assigned של התחרות שיש להן מרווח-זמן להשוות אליו.
        -- שורות ללא assignedstarttime מוחרגות מבדיקות-הזמן במכוון: אין להן
        -- מרווח, ובדיקות החפיפה/הגבולות/הקיבולת אינן יכולות לפעול עליהן.
        -- בבדיקת כפילות-המיקום שלמטה הן כן נכללות.
        select ptr.paidtimerequestid as rid,
               ptr.assignedcompslotid as slotid,
               ptr.assignedstarttime as st,
               ptr.assignedstarttime + ((ptp.durationminutes + 1) || ' minutes')::interval as en,
               (ptp.durationminutes + 1) as dur,
               s.arenaranchid,
               s.arenaid,
               (s.slotdate + s.starttime)::timestamp with time zone as slot_start_ts,
               (s.slotdate + s.endtime)::timestamp with time zone as slot_end_ts,
               (extract(epoch from (s.endtime - s.starttime))::integer / 60) as slot_capacity,
               sr.coachfederationmemberid as coachid,
               sr.riderfederationmemberid as riderid,
               sr.horseid as horseid
        from paidtimerequest ptr
        inner join paidtimeslotincompetition s
            on s.paidtimeslotincompid = ptr.assignedcompslotid
        inner join servicerequest sr
            on sr.srequestid = ptr.paidtimerequestid
        inner join pricecatalog pc
            on pc.pricecatalogid = ptr.pricecatalogid
        inner join paidtimeproduct ptp
            on ptp.productid = pc.productid
        where s.competitionid = v_competitionid
          and ptr.status = 'Assigned'
          and ptr.assignedstarttime is not null
    ),
    all_assigned as (
        -- כל שורות ה-Assigned של התחרות, *כולל* שורות ללא assignedstarttime:
        -- מספר-מיקום נתפס גם כשאין מרווח-זמן.
        select ptr.paidtimerequestid as rid,
               ptr.assignedcompslotid as slotid,
               ptr.assignedorder as ord
        from paidtimerequest ptr
        inner join paidtimeslotincompetition s
            on s.paidtimeslotincompid = ptr.assignedcompslotid
        where s.competitionid = v_competitionid
          and ptr.status = 'Assigned'
          and ptr.assignedorder is not null
    ),
    violation as (
        -- 1. חפיפת מרווחים בתוך אותו סלוט.
        select 1 as vord, 'השיבוץ הידני יוצר חפיפה בתוך הסלוט' as msg
        where exists (
            select 1
            from final a
            inner join final b
                on b.slotid = a.slotid and b.rid > a.rid
            where a.st < b.en and b.st < a.en
              and (a.rid = any(v_affected) or b.rid = any(v_affected)))

        union all
        -- 2. גבולות הסלוט, לשורות המושפעות. הלולאה למעלה בודקת את הקצה העליון
        --    תוך כדי הסידור; זו בדיקה חוזרת על המצב שנשמר בפועל.
        select 2, 'אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי'
        where exists (
            select 1
            from final
            where rid = any(v_affected)
              and (st < slot_start_ts or en > slot_end_ts))

        union all
        -- 3. קיבולת הסלוט. מוגבל לסלוט שסודר מחדש - כל השורות המושפעות יושבות
        --    בו לפי בנייה, שכן הלולאה קוראת אך ורק שורות של p_assignedcompslotid.
        select 3, 'אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי'
        where exists (
            select 1
            from final
            where slotid = p_assignedcompslotid
            group by slotid, slot_capacity
            having sum(dur) > slot_capacity)

        union all
        -- 4. חפיפת מאמן, כולל מרווח-מעבר 7 דק' בין מגרשים שונים בלבד.
        select 4, 'השיבוץ הידני יוצר חפיפה בזמני המאמן'
        where exists (
            select 1
            from final a
            inner join final b
                on b.rid > a.rid and b.coachid = a.coachid
            where a.coachid is not null
              and (a.rid = any(v_affected) or b.rid = any(v_affected))
              and (a.st - ((case when a.arenaranchid = b.arenaranchid
                                  and a.arenaid = b.arenaid
                                 then 0 else 7 end) || ' minutes')::interval) < b.en
              and b.st < (a.en + ((case when a.arenaranchid = b.arenaranchid
                                         and a.arenaid = b.arenaid
                                        then 0 else 7 end) || ' minutes')::interval))

        union all
        -- 5. חפיפת רוכב (ללא מרווח-מעבר).
        select 5, 'השיבוץ הידני יוצר חפיפה בזמני הרוכב'
        where exists (
            select 1
            from final a
            inner join final b
                on b.rid > a.rid and b.riderid = a.riderid
            where a.st < b.en and b.st < a.en
              and (a.rid = any(v_affected) or b.rid = any(v_affected)))

        union all
        -- 6. חפיפת סוס (ללא מרווח-מעבר).
        select 6, 'השיבוץ הידני יוצר חפיפה בזמני הסוס'
        where exists (
            select 1
            from final a
            inner join final b
                on b.rid > a.rid and b.horseid = a.horseid
            where a.st < b.en and b.st < a.en
              and (a.rid = any(v_affected) or b.rid = any(v_affected)))

        union all
        -- 7. כפילות (סלוט, מיקום) - על כל שורות ה-Assigned, כולל כאלה ללא
        --    שעת-התחלה. חוסם רק כשהקבוצה הכפולה מכילה שורה מושפעת. כפילות כזו
        --    היא גם הסיבה שהלולאה למעלה יכולה להשאיר שורה עם זמן מיושן: היא
        --    קוראת מיקום אחד עם limit 1.
        select 7, 'קיים יותר משיבוץ אחד באותו מיקום בסלוט'
        where exists (
            select 1
            from all_assigned
            group by slotid, ord
            having count(*) > 1
               and bool_or(rid = any(v_affected)))
    )
    select msg
    into v_bad
    from violation
    where msg is not null
    order by vord
    limit 1;

    if v_bad is not null then
        raise exception '%', v_bad;
    end if;
end;
$function$;
