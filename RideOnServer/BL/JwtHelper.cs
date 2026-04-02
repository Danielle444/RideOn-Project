using Microsoft.IdentityModel.Tokens;
using RideOnServer.BL.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RideOnServer.BL
{
    public class JwtHelper
    {
        public static string GenerateToken(SystemUser user, List<ApprovedRoleRanch> approvedRolesAndRanches, IConfiguration configuration)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, configuration["Jwt:Subject"]),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("PersonId", user.PersonId.ToString()),
                new Claim("Username", user.Username),
                new Claim("FirstName", user.FirstName),
                new Claim("LastName", user.LastName)
            };

            foreach (ApprovedRoleRanch item in approvedRolesAndRanches)
            {
                claims.Add(new Claim("RoleId", item.RoleId.ToString()));
                claims.Add(new Claim("RoleName", item.RoleName));
                claims.Add(new Claim("RanchId", item.RanchId.ToString()));
                claims.Add(new Claim("RanchName", item.RanchName));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]));
            var signingCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: configuration["Jwt:Issuer"],
                audience: configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: signingCredentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public static string GenerateSuperUserToken(SuperUser user, IConfiguration configuration)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, configuration["Jwt:Subject"]),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("SuperUserId", user.SuperUserId.ToString()),
                new Claim("Email", user.Email),
                new Claim("UserType", "SuperUser")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]));
            var signingCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: configuration["Jwt:Issuer"],
                audience: configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: signingCredentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}