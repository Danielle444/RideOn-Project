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

        // Bounded, real-horse-only lookup for on-demand pickers. Same
        // authorization and response shape as GetHorses, but backed by
        // usp_getrealhorsesbyranch (federation-numbered horses only, max 200
        // rows). Deliberately a separate route so GetHorses / the full ranch
        // horse list stay untouched.
        [HttpGet("real")]
        public IActionResult GetRealHorses([FromQuery] int ranchId, [FromQuery] string? search)
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

                var horses = Horse.GetRealHorsesByRanch(filters);
                return Ok(horses);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetRealHorses: {ex.Message}");
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

        // RanchAdmin-only, always ranch-scoped. A secondary HostSecretary role in
        // this same ranch (or anywhere else) is never consulted here and can never
        // widen this read - the only role checked is RanchAdmin, and the only BL
        // call is the ranch-scoped one (Proc 117). The competition-wide read for a
        // HostSecretary lives on its own route below.
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

        // HostSecretary-only, competition-wide (Proc 184). Requires the supplied
        // ranchId to be the competition's OWN host ranch - the same cross-check
        // usp_gethealthcertificatesforhostedcompetition's caller has always used
        // on the approve endpoint. A plain RanchAdmin (no HostSecretary role) and
        // a HostSecretary of a ranch that is not hosting this competition both get
        // 403 from EnsureUserHasRoleInRanch / the host-ranch mismatch below.
        [HttpGet("health-certificates/hosted")]
        public IActionResult GetHostedHealthCertificates(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
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
                    return StatusCode(403, "אין לך הרשאה לצפות בתעודות הבריאות של תחרות זו");
                }

                var certificates =
                    HorseParticipationInCompetition.GetHealthCertificatesForHostedCompetition(
                        competitionId
                    );

                return Ok(new { data = certificates });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHostedHealthCertificates: {ex.Message}");
                return StatusCode(500, "שגיאה בשליפת תעודות הבריאות");
            }
        }

        [HttpPost("health-certificates/upload")]
        [RequestSizeLimit(20_000_000)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadHealthCertificate(
            [FromForm] int horseId,
            [FromForm] int competitionId,
            [FromForm] int ranchId,
            IFormFile file
        )
        {
            try
            {
                if (horseId <= 0)
                {
                    return BadRequest("מזהה סוס לא תקין");
                }

                if (competitionId <= 0)
                {
                    return BadRequest("מזהה תחרות לא תקין");
                }

                if (ranchId <= 0)
                {
                    return BadRequest("מזהה חווה לא תקין");
                }

                if (file == null || file.Length == 0)
                {
                    return BadRequest("יש לצרף קובץ להעלאה");
                }

                if (!IsPdfFile(file))
                {
                    return BadRequest("ניתן להעלות קובץ PDF בלבד");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                // Ownership is settled BEFORE the request stream is read and
                // before anything reaches Supabase Storage, so a rejected upload
                // leaves no object behind.
                EnsureCanUploadHealthCertificate(
                    currentPersonId,
                    horseId,
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
                Console.WriteLine($"[HealthCertificateUpload] {ex.Message}");
                return StatusCode(500, "שגיאה בהעלאת תעודת הבריאות");
            }
        }

        // POST health-certificates/save is gone. It had no caller anywhere in the
        // repo and let a RanchAdmin write an arbitrary hcPath for any horse without
        // ever going through the real upload. The multipart upload above calls
        // HorseParticipationInCompetition.SaveHealthCertificate directly, so the BL
        // method and SaveHealthCertificateRequest both stay.

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

                bool approved = HorseParticipationInCompetition.ApproveHealthCertificate(request, currentPersonId);

                if (!approved)
                {
                    return StatusCode(409, "לא ניתן לאשר את תעודת הבריאות: היא אינה קיימת, לא הועלה עבורה קובץ, או שאינה ממתינה לאישור.");
                }

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

        // Upload authorization: RanchAdmin-only. No HostSecretary branch exists on
        // this route (the pre-existing secretary upload branch had no caller
        // anywhere in the repo - grep-verified - and is removed rather than kept
        // as a silent widening path). Holding a secondary HostSecretary role is
        // never even read here, so it cannot influence this decision.
        private void EnsureCanUploadHealthCertificate(
            int currentPersonId,
            int horseId,
            int ranchId,
            int competitionId
        )
        {
            UserAccessValidator.EnsureUserHasRoleInRanch(
                currentPersonId,
                ranchId,
                RoleNames.RanchAdmin
            );

            if (!HorseParticipatesInCompetitionForRanch(horseId, competitionId, ranchId))
            {
                throw new UnauthorizedAccessException(
                    "אין לך הרשאה להעלות תעודת בריאות עבור סוס זה");
            }
        }

        // Proves both requirements in one read: the horse belongs to ranchId AND
        // holds an active entry in competitionId. Reuses usp_gethorsesforcompetition
        // (backs GET /Horses/competition) rather than inventing new SQL - it is the
        // same entry-derived, COALESCE(entrystatus,'Active')='Active' whitelist that
        // 117/184 use, already filtered by h.ranchid = p_ranchid. A horse from
        // another ranch, a horse with no entry in this competition, or a horse whose
        // only entries are cancelled/replaced is simply absent from the result.
        private static bool HorseParticipatesInCompetitionForRanch(
            int horseId,
            int competitionId,
            int ranchId
        )
        {
            if (horseId <= 0 || competitionId <= 0 || ranchId <= 0)
            {
                return false;
            }

            var filters = new GetCompetitionHorsesFiltersRequest
            {
                CompetitionId = competitionId,
                RanchId = ranchId
            };

            return Horse.GetHorsesForCompetition(filters)
                .Any(horse => horse.HorseId == horseId);
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

                Console.WriteLine($"[HealthCertificateUpload] Supabase upload failed: {response.StatusCode} {errorText}");

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