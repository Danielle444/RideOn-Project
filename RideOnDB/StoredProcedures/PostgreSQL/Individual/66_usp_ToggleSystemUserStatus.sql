CREATE OR REPLACE FUNCTION usp_ToggleSystemUserStatus(
    "SystemUserId" INTEGER,
    "IsActive"     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser SET isactive = "IsActive"
    WHERE systemuserid = "SystemUserId";
END;
$$;
