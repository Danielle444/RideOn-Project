CREATE OR REPLACE FUNCTION usp_InsertPaidTimeRequest(
    p_OrderedBySystemUserId    INTEGER,
    p_RanchId                  INTEGER,
    p_HorseId                  INTEGER,
    p_RiderFederationMemberId  INTEGER,
    p_CoachFederationMemberId  INTEGER,
    p_PaidByPersonId           INTEGER,
    p_PriceCatalogId           INTEGER,
    p_RequestedCompSlotId      INTEGER,
    p_Notes                    TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_billid INT;
    v_srequestid INT;
    v_paidtimerequestid INT;
    v_amounttopay NUMERIC(10,2);
    v_catalog_ranchid INT;
    v_horse_ranchid INT;
    v_competitionid INT;
BEGIN
    SELECT
        pc.itemprice,
        pc.ranchid
    INTO
        v_amounttopay,
        v_catalog_ranchid
    FROM pricecatalog pc
    WHERE pc.pricecatalogid = p_pricecatalogid
      AND pc.isactive = true;

    IF v_amounttopay IS NULL THEN
        RAISE EXCEPTION 'Price catalog item not found or inactive';
    END IF;

    IF v_catalog_ranchid <> p_ranchid THEN
        RAISE EXCEPTION 'Price catalog item does not belong to this ranch';
    END IF;

    SELECT pts.competitionid
    INTO v_competitionid
    FROM paidtimeslotincompetition pts
    WHERE pts.paidtimeslotincompid = p_requestedcompslotid;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'Requested paid time slot not found';
    END IF;

    SELECT h.ranchid
    INTO v_horse_ranchid
    FROM horse h
    WHERE h.horseid = p_horseid;

    IF v_horse_ranchid IS NULL THEN
        RAISE EXCEPTION 'Horse not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM servicerequest sr
        INNER JOIN entry e
            ON e.entryid = sr.srequestid
        INNER JOIN classincompetition cic
            ON cic.classincompid = e.classincompid
        WHERE sr.horseid = p_horseid
          AND cic.competitionid = v_competitionid
    ) THEN
        RAISE EXCEPTION 'Horse is not registered to the competition through entries';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM federationmember fm
        WHERE fm.federationmemberid = p_riderfederationmemberid
    ) THEN
        RAISE EXCEPTION 'Rider not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM federationmember fm
        WHERE fm.federationmemberid = p_coachfederationmemberid
    ) THEN
        RAISE EXCEPTION 'Coach not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM person p
        WHERE p.personid = p_paidbypersonid
    ) THEN
        RAISE EXCEPTION 'Payer not found';
    END IF;

    v_billid := usp_getorcreateopenbillforpayerandcompetition(
        p_paidbypersonid,
        v_competitionid
    );

    INSERT INTO servicerequest (
        orderedbysystemuserid,
        horseid,
        riderfederationmemberid,
        coachfederationmemberid,
        billid,
        paymentid,
        srequestdatetime
    )
    VALUES (
        p_orderedbysystemuserid,
        p_horseid,
        p_riderfederationmemberid,
        p_coachfederationmemberid,
        v_billid,
        NULL,
        now()
    )
    RETURNING srequestid INTO v_srequestid;

    INSERT INTO paidtimerequest (
        paidtimerequestid,
        pricecatalogid,
        requestedcompslotid,
        assignedcompslotid,
        assignedstarttime,
        status,
        notes
    )
    VALUES (
        v_srequestid,
        p_pricecatalogid,
        p_requestedcompslotid,
        NULL,
        NULL,
        'Pending',
        p_notes
    )
    RETURNING paidtimerequestid INTO v_paidtimerequestid;

    UPDATE bill
    SET amounttopay = amounttopay + v_amounttopay
    WHERE billid = v_billid;

    RETURN v_paidtimerequestid;
END;
$$;
