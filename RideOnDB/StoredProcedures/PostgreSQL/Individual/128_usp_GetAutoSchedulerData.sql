-- מחזיר תמונה עקבית (snapshot אחד) של כל הנתונים שאלגוריתם
-- השיבוץ האוטומטי צריך לתחרות נתונה: סלוטים, בקשות (Pending+Assigned),
-- אצוות עם מטא-דאטה, וזמן השרת ברגע הקריאה.
--
-- מחזיר JSONB אחד (קל להמרה ב-C# ל-DTO).
CREATE OR REPLACE FUNCTION usp_GetAutoSchedulerData(
    p_CompetitionId INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_slots    JSONB;
    v_requests JSONB;
    v_batches  JSONB;
    v_result   JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(s ORDER BY (s->>'slotDate'), (s->>'startTime')), '[]'::jsonb)
    INTO v_slots
    FROM (
        SELECT jsonb_build_object(
            'paidTimeSlotInCompId',   pts.paidtimeslotincompid,
            'slotDate',               pts.slotdate,
            'startTime',              pts.starttime,
            'endTime',                pts.endtime,
            'totalCapacityMinutes',   (EXTRACT(EPOCH FROM (pts.endtime - pts.starttime))::INTEGER / 60),
            'arenaRanchId',           pts.arenaranchid,
            'arenaId',                pts.arenaid,
            'arenaName',              COALESCE(a.arenaname, ''),
            'isPublished',            COALESCE(pts.ispublished, FALSE),
            'slotStatus',             pts.slotstatus
        ) AS s
        FROM paidtimeslotincompetition pts
        LEFT JOIN arena a
            ON a.ranchid = pts.arenaranchid AND a.arenaid = pts.arenaid
        WHERE pts.competitionid = p_CompetitionId
    ) sub;

    SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'srequestdatetime')), '[]'::jsonb)
    INTO v_requests
    FROM (
        SELECT jsonb_build_object(
            'paidTimeRequestId',       ptr.paidtimerequestid,
            'horseId',                 sr.horseid,
            'coachFederationMemberId', sr.coachfederationmemberid,
            'riderFederationMemberId', sr.riderfederationmemberid,
            'priceCatalogId',          ptr.pricecatalogid,
            'productId',               pc.productid,
            'durationMinutes',         (ptp.durationminutes + 1),
            'requestedCompSlotId',     ptr.requestedcompslotid,
            'assignedCompSlotId',      ptr.assignedcompslotid,
            'assignedStartTime',       ptr.assignedstarttime,
            'assignedOrder',           ptr.assignedorder,
            'status',                  ptr.status,
            'srequestdatetime',        sr.srequestdatetime,
            'batchId',                 ptr.batchid,
            'notes',                   ptr.notes
        ) AS r
        FROM paidtimerequest ptr
        INNER JOIN servicerequest sr   ON sr.srequestid     = ptr.paidtimerequestid
        INNER JOIN paidtimeslotincompetition reqslot
            ON reqslot.paidtimeslotincompid = ptr.requestedcompslotid
        INNER JOIN pricecatalog pc     ON pc.pricecatalogid = ptr.pricecatalogid
        INNER JOIN paidtimeproduct ptp ON ptp.productid     = pc.productid
        WHERE reqslot.competitionid = p_CompetitionId
          AND ptr.status IN ('Pending', 'Assigned')
    ) sub;

    SELECT COALESCE(jsonb_agg(b ORDER BY (b->>'createdAt')), '[]'::jsonb)
    INTO v_batches
    FROM (
        SELECT jsonb_build_object(
            'batchId',           batchid,
            'competitionId',     competitionid,
            'createdByPersonId', createdbypersonid,
            'createdAt',         createdat,
            'payload',           payload,
            'requestIds',        requestids
        ) AS b
        FROM paidtimerequestbatch
        WHERE competitionid = p_CompetitionId
    ) sub;

    v_result := jsonb_build_object(
        'competitionId', p_CompetitionId,
        'now',           NOW(),
        'slots',         v_slots,
        'requests',      v_requests,
        'batches',       v_batches
    );

    RETURN v_result;
END;
$$;
