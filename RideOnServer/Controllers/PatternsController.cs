using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PatternsController : ControllerBase
    {
        [Authorize]
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                PatternDAL dal = new PatternDAL();
                return Ok(dal.GetAllPatterns());
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("with-maneuvers")]
        public IActionResult GetAllWithManeuvers()
        {
            try
            {
                if (UserAccessValidator.IsSuperUser(User))
                {
                    PatternDAL superUserDal = new PatternDAL();
                    return Ok(superUserDal.GetAllPatternsWithManeuvers());
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                List<ApprovedRoleRanch> approvedRoles =
                    SystemUser.GetApprovedPersonRanchesAndRoles(personId);

                bool hasSecretaryRole = approvedRoles.Any(item =>
                    !string.IsNullOrWhiteSpace(item.RoleName) &&
                    item.RoleName.Trim().Equals(RoleNames.HostSecretary, StringComparison.OrdinalIgnoreCase));

                if (!hasSecretaryRole)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בפטרנים");
                }

                PatternDAL dal = new PatternDAL();
                return Ok(dal.GetAllPatternsWithManeuvers());
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult Create([FromBody] Pattern pattern)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                PatternDAL dal = new PatternDAL();
                dal.InsertPattern(pattern.PatternNumber);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] PatternUpdateRequest request)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                PatternDAL dal = new PatternDAL();
                dal.UpdatePattern(request.OldPatternNumber, request.NewPatternNumber);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpDelete("{patternNumber}")]
        public IActionResult Delete(short patternNumber)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                PatternDAL dal = new PatternDAL();
                dal.DeletePattern(patternNumber);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }

    public class PatternUpdateRequest
    {
        public short OldPatternNumber { get; set; }
        public short NewPatternNumber { get; set; }
    }
}