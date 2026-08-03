using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ChangeEntryRequest;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChangeEntryRequestsController : ControllerBase
    {
        [HttpPost]
        public IActionResult Create(
            [FromBody]
            CreateChangeEntryRequestDTO dto
        )
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                // Structured, pre-write classification via plain booleans from
                // usp_getchangeentryrequestauthorizationcontext (218) - never by
                // parsing exception text. personId is JWT-derived only; the
                // entry's real competition/ranch are resolved server-side and
                // cross-checked against dto.CompetitionId, never trusted as-is.
                ChangeEntryRequestAuthorizationContext ctx =
                    ChangeEntryRequest.GetAuthorizationContext(
                        dto.OriginalEntryId,
                        dto.NewEntryId,
                        dto.CompetitionId,
                        personId
                    );

                if (!ctx.EntryExists)
                {
                    return NotFound("Original entry not found");
                }

                if (ctx.ActualCompetitionId != dto.CompetitionId)
                {
                    return BadRequest(
                        "Competition id does not match the entry's actual competition"
                    );
                }

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ctx.HostRanchId ?? 0,
                    RoleNames.RanchAdmin
                );

                if (!ctx.IsWithinModelCScope)
                {
                    throw new UnauthorizedAccessException(
                        "אין לך הרשאה לבצע פעולה זו עבור הכניסה שנבחרה"
                    );
                }

                if (ctx.IsCompetitionEnded)
                {
                    return StatusCode(
                        StatusCodes.Status409Conflict,
                        "לא ניתן ליצור בקשת שינוי או ביטול לאחר סיום התחרות"
                    );
                }

                if (!dto.IsCancelled)
                {
                    if (!ctx.NewEntryExists)
                    {
                        return NotFound("New entry not found");
                    }

                    if (
                        ctx.NewEntryCompetitionId != ctx.ActualCompetitionId ||
                        ctx.NewEntryHostRanchId != ctx.HostRanchId
                    )
                    {
                        return BadRequest(
                            "New entry does not belong to the same competition or ranch as the original entry"
                        );
                    }

                    if (!ctx.NewEntryCreatedByAdmin)
                    {
                        throw new UnauthorizedAccessException(
                            "הכניסה החדשה לא נוצרה על ידך"
                        );
                    }
                }

                // Existence is already guaranteed by ctx.EntryExists +
                // ctx.ActualCompetitionId matching dto.CompetitionId above, so
                // this can only return null on a genuine race; kept as a
                // defensive fallback, not the primary existence check.
                Competition? competition =
                    Competition.GetCompetitionById(
                        dto.CompetitionId
                    );

                if (competition == null)
                {
                    return NotFound(
                        "Competition not found"
                    );
                }

                int requestId =
                    ChangeEntryRequest.CreateRequest(
                        competition,
                        dto.OriginalEntryId,
                        dto.NewEntryId,
                        dto.IsCancelled,
                        personId,
                        dto.CompetitionId
                    );

                return Ok(requestId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    ex.Message
                );
            }
            catch (ValidationException ex)
            {
                // Business-rule/race guard raised inside
                // usp_insertchangeentryrequestsecured (RN001) - the SP-level
                // defense-in-depth backstop. By the time execution reaches the
                // SP, the checks above already passed, so anything the SP
                // itself still rejects represents a conflict with state that
                // changed between the check and the write.
                return StatusCode(
                    StatusCodes.Status409Conflict,
                    ex.Message
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error creating change request: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה ביצירת בקשת שינוי"
                );
            }
        }

        [HttpPost("cancel-by-payer")]
        public IActionResult CancelByPayer(
            [FromBody] CancelEntryByPayerRequest dto)
        {
            try
            {
                if (dto == null || dto.EntryId <= 0 || dto.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    dto.RanchId,
                    RoleNames.Payer
                );

                int requestId = ChangeEntryRequest.CancelByPayer(dto.EntryId, personId);

                return Ok(requestId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CancelByPayer: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }
    }
}