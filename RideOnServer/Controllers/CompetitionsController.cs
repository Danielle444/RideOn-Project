using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CompetitionsController : ControllerBase
    {
        [HttpGet("by-host-ranch")]
        public IActionResult GetCompetitionsByHostRanch(
            [FromQuery] int ranchId,
            [FromQuery] string? searchText,
            [FromQuery] string? status,
            [FromQuery] byte? fieldId,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                CompetitionFiltersRequest filters = new CompetitionFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = searchText,
                    Status = status,
                    FieldId = fieldId,
                    DateFrom = dateFrom,
                    DateTo = dateTo
                };

                List<Competition> list = Competition.GetCompetitionsByHostRanch(filters);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionsByHostRanch: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת תחרויות החווה המארחת");
            }
        }

        [HttpGet("{competitionId}")]
        public IActionResult GetCompetitionById(int competitionId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בתחרות זו");
                }

                return Ok(competition);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionById: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פרטי התחרות");
            }
        }

        [HttpPost]
        public IActionResult CreateCompetition([FromBody] CreateCompetitionRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                int newCompetitionId = Competition.CreateCompetition(request, personId);

                return Ok(new
                {
                    CompetitionId = newCompetitionId,
                    Message = "Competition created successfully"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת תחרות");
            }
        }

        [HttpPut("{competitionId}")]
        public IActionResult UpdateCompetition(int competitionId, [FromBody] UpdateCompetitionRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (competitionId != request.CompetitionId)
                {
                    return BadRequest("CompetitionId in URL does not match body");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition existingCompetition = Competition.GetCompetitionById(request.CompetitionId)
                    ?? throw new Exception("Competition not found");

                if (existingCompetition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לערוך תחרות זו");
                }

                Competition.UpdateCompetition(request);

                return Ok("Competition updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון תחרות");
            }
        }

        [HttpGet("mobile/admin-board")]
        public IActionResult GetMobileAdminCompetitionsBoard([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                List<Competition> list = Competition.GetAllCompetitionsForMobileAdmin();
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMobileAdminCompetitionsBoard: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת לוח התחרויות לאדמין");
            }
        }

        [HttpGet("mobile/worker-board")]
        public IActionResult GetMobileWorkerCompetitionsBoard([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchWorker
                );

                List<Competition> list = Competition.GetCompetitionsForMobileWorker(ranchId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMobileWorkerCompetitionsBoard: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת לוח התחרויות לעובד");
            }
        }

        [HttpGet("mobile/payer-board")]
        public IActionResult GetMobilePayerCompetitionsBoard([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.Payer
                );

                List<Competition> list = Competition.GetCompetitionsForMobilePayer(personId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMobilePayerCompetitionsBoard: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת לוח התחרויות למשלם");
            }
        }

        [HttpGet("mobile/admin-home")]
        public IActionResult GetMobileAdminHomeCompetitions([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                List<Competition> list = Competition.GetCompetitionsForMobileAdminHome(personId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMobileAdminHomeCompetitions: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת תחרויות הבית לאדמין");
            }
        }

        [HttpGet("{competitionId}/invitation")]
        public IActionResult GetCompetitionInvitationDetails(int competitionId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                var roles = User.Claims
                    .Where(c => c.Type == "RoleName")
                    .Select(c => c.Value)
                    .ToList();

                if (roles.Count == 0)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "Missing roles");
                }

                if (roles.Contains(RoleNames.HostSecretary))
                {
                    UserAccessValidator.EnsureUserHasRoleInRanch(
                        personId,
                        competition.HostRanchId,
                        RoleNames.HostSecretary
                    );
                }
                else if (roles.Contains(RoleNames.RanchAdmin))
                {
                    UserAccessValidator.EnsureUserHasAnyApprovedRole(
                        personId,
                        RoleNames.RanchAdmin
                    );
                }
                else if (roles.Contains(RoleNames.Payer))
                {
                    UserAccessValidator.EnsureUserHasAnyApprovedRole(
                        personId,
                        RoleNames.Payer
                    );
                }
                else
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בפרטי תחרות");
                }

                if (competition.CompetitionStatus == CompetitionStatuses.Draft &&
                    !roles.Contains(RoleNames.HostSecretary))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "טיוטת תחרות זמינה רק לחווה המארחת");
                }

                var response = CompetitionInvitationManager.GetInvitationDetails(competitionId);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionInvitationDetails: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פרטי הזמנת התחרות");
            }
        }
    }
}