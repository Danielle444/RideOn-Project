using RideOnServer.BL.DTOs.Auth;

namespace RideOnServer.BL.DTOs.Profile
{
    public class ProfileSettingsResponse
    {
        public SystemUserProfile UserProfile { get; set; } = new SystemUserProfile();

        public RanchProfile ActiveRanch { get; set; } = new RanchProfile();

        public UserProfileRole ActiveProfile { get; set; } = new UserProfileRole();

        public List<ApprovedRoleRanch> ApprovedProfiles { get; set; } = new List<ApprovedRoleRanch>();

        public List<UserProfileRole> AllProfiles { get; set; } = new List<UserProfileRole>();
    }
}