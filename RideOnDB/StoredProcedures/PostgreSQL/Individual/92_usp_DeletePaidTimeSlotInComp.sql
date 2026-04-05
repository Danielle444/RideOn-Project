CREATE OR REPLACE FUNCTION usp_DeletePaidTimeSlotInComp(
    "CompSlotId"  INTEGER,
    "ForceDelete" BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    -- Hard block: active assignments exist
    IF EXISTS (
        SELECT 1 FROM paidtimerequest ptr
        WHERE ptr.assignedcompslotid = "CompSlotId"
          AND COALESCE(ptr.status, '') <> 'Cancelled'
    ) THEN
        RAISE EXCEPTION 'Cannot delete: Participants are actively ASSIGNED to this slot.';
    END IF;

    -- Warning: active requests exist (user must confirm)
    IF EXISTS (
        SELECT 1 FROM paidtimerequest ptr
        WHERE ptr.requestedcompslotid = "CompSlotId"
          AND COALESCE(ptr.status, '') <> 'Cancelled'
    ) THEN
        IF "ForceDelete" = FALSE THEN
            RAISE EXCEPTION 'Warning: There are active REQUESTS for this slot. User confirmation required.';
        END IF;
    END IF;

    DELETE FROM paidtimeslotincompetition WHERE compslotid = "CompSlotId";
END;
$$;
