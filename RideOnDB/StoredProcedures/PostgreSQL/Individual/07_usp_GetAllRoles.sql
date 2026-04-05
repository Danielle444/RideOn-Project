CREATE OR REPLACE FUNCTION usp_GetAllRoles()
RETURNS TABLE("RoleId" SMALLINT, "RoleName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT r.roleid, r.rolename FROM role r ORDER BY r.rolename;
END;
$$;
