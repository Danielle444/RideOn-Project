using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Role
    {
        public byte RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;

        internal static List<Role> GetAllRoles()
        {
            RoleDAL dal = new RoleDAL();
            return dal.GetAllRoles();
        }
    }
}