using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Role
    {
        public byte RoleId { get; set; }
        public string RoleName { get; set; }

        internal static List<Role> GetAllRoles()
        {
            RolesDAL rolesDAL = new RolesDAL();
            return rolesDAL.GetAllRoles();
        }
    }
}