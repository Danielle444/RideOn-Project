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
CREATE OR REPLACE FUNCTION usp_BulkInsertPaidTimeRequests(
    p_OrderedBySystemUserId INTEGER,
    p_RanchId               INTEGER,
    p_CompetitionId         INTEGER,
    p_CreatedByPersonId     INTEGER,
    p_Items                 JSONB,
    p_Metadata              JSONB
)
RETURNS TABLE(
    "PaidTimeRequestId" INTEGER,
    "BatchId"           INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
    v_item        JSONB;
    v_request_id  INTEGER;
    v_request_ids INTEGER[] := ARRAY[]::INTEGER[];
    v_batch_id    INTEGER;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_Items)
    LOOP
        v_request_id := usp_InsertPaidTimeRequest(
            p_OrderedBySystemUserId   := p_OrderedBySystemUserId,
            p_RanchId                 := p_RanchId,
            p_HorseId                 := (v_item->>'horseId')::INTEGER,
            p_RiderFederationMemberId := (v_item->>'riderFederationMemberId')::INTEGER,
            p_CoachFederationMemberId := (v_item->>'coachFederationMemberId')::INTEGER,
            p_PaidByPersonId          := (v_item->>'paidByPersonId')::INTEGER,
            p_PriceCatalogId          := (v_item->>'priceCatalogId')::INTEGER,
            p_RequestedCompSlotId     := (v_item->>'requestedCompSlotId')::INTEGER,
            p_Notes                   := NULLIF(v_item->>'notes', '')
        );
        v_request_ids := array_append(v_request_ids, v_request_id);
    END LOOP;

    INSERT INTO paidtimerequestbatch (
        competitionid, createdbypersonid, payload, requestids
    ) VALUES (
        p_CompetitionId, p_CreatedByPersonId, p_Metadata, v_request_ids
    )
    RETURNING batchid INTO v_batch_id;

    RETURN QUERY
    SELECT unnest(v_request_ids) AS req_id, v_batch_id AS batch_id;
END;
$$;
