using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Horses;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class HorsesController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public HorsesController(
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory
        )
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public IActionResult GetHorses([FromQuery] int ranchId, [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var filters = new GetHorsesFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = search
                };

                var horses = Horse.GetHorsesByRanch(filters);
                return Ok(horses);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHorses: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת סוסים");
            }
        }

        [HttpGet("competition")]
        public IActionResult GetCompetitionHorses(
            [FromQuery] int ranchId,
            [FromQuery] int competitionId,
            [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var filters = new GetCompetitionHorsesFiltersRequest
                {
                    CompetitionId = competitionId,
                    RanchId = ranchId,
                    SearchText = search
                };

                var horses = Horse.GetHorsesForCompetition(filters);
                return Ok(horses);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionHorses: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת סוסים לתחרות");
            }
        }

        [HttpPut("{horseId}/barnname")]
        public IActionResult UpdateHorseBarnName(int horseId, [FromBody] UpdateHorseBarnNameRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (horseId != request.HorseId)
                {
                    return BadRequest("HorseId mismatch");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                Horse.UpdateHorseBarnName(request);
                return Ok("Horse barn name updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateHorseBarnName: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון שם הסוס");
            }
        }

        [HttpGet("health-certificates")]
        public IActionResult GetHealthCertificates(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var certificates =
                    HorseParticipationInCompetition.GetHealthCertificatesForCompetition(
                        competitionId,
                        ranchId
                    );

                return Ok(new { data = certificates });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHealthCertificates: {ex.Message}");
                return StatusCode(500, "שגיאה בשליפת תעודות הבריאות");
            }
        }

        [HttpPost("health-certificates/upload")]
        [RequestSizeLimit(20_000_000)]
        public async Task<IActionResult> UploadHealthCertificate(
            [FromForm] int horseId,
            [FromForm] int competitionId,
            [FromForm] int ranchId,
            [FromForm] IFormFile file
        )
        {
            try
            {
                if (horseId <= 0)
                {
                    return BadRequest("Invalid horse id");
                }

                if (competitionId <= 0)
                {
                    return BadRequest("Invalid competition id");
                }

                if (ranchId <= 0)
                {
                    return BadRequest("Invalid ranch id");
                }

                if (file == null || file.Length == 0)
                {
                    return BadRequest("File is required");
                }

                if (!IsPdfFile(file))
                {
                    return BadRequest("ניתן להעלות קובץ PDF בלבד");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                EnsureCanUploadHealthCertificate(
                    currentPersonId,
                    ranchId,
                    competitionId
                );

                string publicUrl = await UploadPdfToSupabaseStorage(
                    horseId,
                    competitionId,
                    file
                );

                SaveHealthCertificateRequest request = new SaveHealthCertificateRequest
                {
                    HorseId = horseId,
                    CompetitionId = competitionId,
                    RanchId = ranchId,
                    HcPath = publicUrl
                };

                HorseParticipationInCompetition.SaveHealthCertificate(request);

                return Ok(new
                {
                    message = "תעודת הבריאות הועלתה בהצלחה",
                    hcPath = publicUrl
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UploadHealthCertificate: {ex.Message}");
                return StatusCode(500, "שגיאה בהעלאת תעודת הבריאות");
            }
        }

        [HttpPost("health-certificates/save")]
        public IActionResult SaveHealthCertificate([FromBody] SaveHealthCertificateRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                HorseParticipationInCompetition.SaveHealthCertificate(request);

                return Ok(new { message = "תעודת הבריאות נשמרה בהצלחה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SaveHealthCertificate: {ex.Message}");
                return StatusCode(500, "שגיאה בשמירת תעודת הבריאות");
            }
        }

        [HttpPost("health-certificates/approve")]
        public IActionResult ApproveHealthCertificate([FromBody] ApproveHealthCertificateRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != request.RanchId)
                {
                    return StatusCode(403, "אין לך הרשאה לאשר תעודות בתחרות זו");
                }

                HorseParticipationInCompetition.ApproveHealthCertificate(request, currentPersonId);

                return Ok(new { message = "תעודת הבריאות אושרה בהצלחה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApproveHealthCertificate: {ex.Message}");
                return StatusCode(500, "שגיאה באישור תעודת הבריאות");
            }
        }

        private void EnsureCanUploadHealthCertificate(
            int currentPersonId,
            int ranchId,
            int competitionId
        )
        {
            try
            {
                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                return;
            }
            catch (UnauthorizedAccessException)
            {
            }

            Competition? competition = Competition.GetCompetitionById(competitionId);

            if (competition == null)
            {
                throw new UnauthorizedAccessException("Competition not found");
            }

            if (competition.HostRanchId == ranchId)
            {
                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                return;
            }

            throw new UnauthorizedAccessException("אין לך הרשאה להעלות תעודת בריאות עבור סוס זה");
        }

        private bool IsPdfFile(IFormFile file)
        {
            string contentType = file.ContentType?.ToLower() ?? "";
            string fileName = file.FileName?.ToLower() ?? "";

            return contentType == "application/pdf" || fileName.EndsWith(".pdf");
        }

        private async Task<string> UploadPdfToSupabaseStorage(
            int horseId,
            int competitionId,
            IFormFile file
        )
        {
            string supabaseUrl = _configuration["Supabase:Url"] ?? "";
            string serviceRoleKey = _configuration["Supabase:ServiceRoleKey"] ?? "";
            string bucket = _configuration["Supabase:HealthCertificatesBucket"] ?? "health-certificates";

            if (string.IsNullOrWhiteSpace(supabaseUrl))
            {
                throw new Exception("Missing Supabase URL configuration");
            }

            if (string.IsNullOrWhiteSpace(serviceRoleKey))
            {
                throw new Exception("Missing Supabase service role key configuration");
            }

            string safeFileName =
                "horse_" +
                horseId +
                "_comp_" +
                competitionId +
                "_" +
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() +
                ".pdf";

            string filePath =
                "competitions/" +
                competitionId +
                "/" +
                safeFileName;

            string uploadUrl =
                supabaseUrl.TrimEnd('/') +
                "/storage/v1/object/" +
                bucket +
                "/" +
                filePath;

            HttpClient client = _httpClientFactory.CreateClient();

            using Stream fileStream = file.OpenReadStream();

            using StreamContent content = new StreamContent(fileStream);

            content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

            using HttpRequestMessage request = new HttpRequestMessage(
                HttpMethod.Post,
                uploadUrl
            );

            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", serviceRoleKey);

            request.Headers.Add("apikey", serviceRoleKey);
            request.Headers.Add("x-upsert", "true");
            request.Content = content;

            using HttpResponseMessage response = await client.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                string errorText = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"Supabase upload failed: {response.StatusCode} {errorText}");

                throw new Exception("Supabase upload failed");
            }

            return
                supabaseUrl.TrimEnd('/') +
                "/storage/v1/object/public/" +
                bucket +
                "/" +
                filePath;
        }
    }
}