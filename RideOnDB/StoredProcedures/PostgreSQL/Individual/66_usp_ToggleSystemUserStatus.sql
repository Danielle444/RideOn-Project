CREATE OR REPLACE FUNCTION usp_ToggleSystemUserStatus(
    p_SystemUserId INTEGER,
    p_IsActive     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE systemuser SET isactive = p_IsActive
    WHERE systemuserid = p_SystemUserId;
END;
$$;
