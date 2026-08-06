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

        [HttpGet("health-certificates")]
        public IActionResult GetHealthCertificates(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                bool isRanchAdminInRanch = UserAccessValidator.HasUserRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                bool isHostSecretaryInRanch = UserAccessValidator.HasUserRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                // The competition is only fetched when the secretary branch is
                // actually in play, so the RanchAdmin path keeps the exact number
                // of round trips it had before.
                int? competitionHostRanchId = null;

                if (isHostSecretaryInRanch && competitionId > 0)
                {
                    Competition? competition = Competition.GetCompetitionById(competitionId);

                    competitionHostRanchId = competition?.HostRanchId;
                }

                HealthCertificateReadScope scope = ResolveHealthCertificateReadScope(
                    competitionId,
                    ranchId,
                    isRanchAdminInRanch,
                    isHostSecretaryInRanch,
                    competitionHostRanchId
                );

                if (scope == HealthCertificateReadScope.Denied)
                {
                    throw new UnauthorizedAccessException(
                        "אין לך הרשאה לצפות בתעודות הבריאות של תחרות זו");
                }

                // The scope resolved above - never anything the caller sent -
                // decides which read runs. There is no include-all flag on this
                // endpoint, and each branch is a single BL call: no per-ranch fan
                // out, no loop.
                var certificates =
                    scope == HealthCertificateReadScope.CompetitionWide
                        ? HorseParticipationInCompetition
                            .GetHealthCertificatesForHostedCompetition(competitionId)
                        : HorseParticipationInCompetition
                            .GetHealthCertificatesForCompetition(competitionId, ranchId);

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

        // Who may read the health-certificate list, and how wide that read is.
        //
        //   RanchScoped     - a RanchAdmin sees only horses of their own ranch.
        //   CompetitionWide - a HostSecretary of the competition's host ranch sees
        //                     every participating horse, visiting ranches included.
        private enum HealthCertificateReadScope
        {
            Denied = 0,
            RanchScoped = 1,
            CompetitionWide = 2
        }

        // Which branch, if any, authorizes an upload.
        private enum HealthCertificateUploadBranch
        {
            Denied = 0,
            RanchAdminOwnHorse = 1,
            HostSecretaryHostedCompetition = 2
        }

        // Pure authorization decision for GET health-certificates. Every input is
        // resolved by the caller - no claims, no DB, no HTTP - so the rule itself
        // is directly testable (RideOnServer.Tests/HealthCertificateAuthorizationTests).
        //
        // competitionHostRanchId is null when the competition does not exist, which
        // is why the secretary branch can never pass on an unknown competition.
        private static HealthCertificateReadScope ResolveHealthCertificateReadScope(
            int competitionId,
            int ranchId,
            bool isRanchAdminInRanch,
            bool isHostSecretaryInRanch,
            int? competitionHostRanchId
        )
        {
            if (competitionId <= 0 || ranchId <= 0)
            {
                return HealthCertificateReadScope.Denied;
            }

            // Holding the secretary role in SOME ranch is not enough: the role, the
            // supplied ranch and the competition's own host ranch must all agree.
            if (isHostSecretaryInRanch &&
                competitionHostRanchId.HasValue &&
                competitionHostRanchId.Value == ranchId)
            {
                return HealthCertificateReadScope.CompetitionWide;
            }

            // Checked after the secretary branch so a user holding both roles in the
            // hosting ranch is not narrowed to their own horses. A plain RanchAdmin
            // is never widened past their own ranch.
            if (isRanchAdminInRanch)
            {
                return HealthCertificateReadScope.RanchScoped;
            }

            return HealthCertificateReadScope.Denied;
        }

        // Pure authorization decision for the multipart upload, same shape and same
        // reasons as ResolveHealthCertificateReadScope.
        private static HealthCertificateUploadBranch ResolveHealthCertificateUploadBranch(
            int horseId,
            int competitionId,
            int ranchId,
            bool isRanchAdminInRanch,
            bool isHostSecretaryInRanch,
            bool horseBelongsToRanch,
            int? competitionHostRanchId
        )
        {
            if (horseId <= 0 || competitionId <= 0 || ranchId <= 0)
            {
                return HealthCertificateUploadBranch.Denied;
            }

            if (!competitionHostRanchId.HasValue)
            {
                return HealthCertificateUploadBranch.Denied;
            }

            // The Stage B1 fix: holding RanchAdmin in ranchId is no longer enough,
            // the horse has to actually belong to that ranch.
            if (isRanchAdminInRanch && horseBelongsToRanch)
            {
                return HealthCertificateUploadBranch.RanchAdminOwnHorse;
            }

            // Pre-existing branch with no UI behind it, left exactly as it was: a
            // HostSecretary of the hosting ranch may upload for any horse in the
            // competition, including a visiting one. Evaluated after the admin
            // branch so a dual-role user keeps the wider capability they had.
            if (isHostSecretaryInRanch && competitionHostRanchId.Value == ranchId)
            {
                return HealthCertificateUploadBranch.HostSecretaryHostedCompetition;
            }

            return HealthCertificateUploadBranch.Denied;
        }

        private void EnsureCanUploadHealthCertificate(
            int currentPersonId,
            int horseId,
            int ranchId,
            int competitionId
        )
        {
            bool isRanchAdminInRanch = UserAccessValidator.HasUserRoleInRanch(
                currentPersonId,
                ranchId,
                RoleNames.RanchAdmin
            );

            bool isHostSecretaryInRanch = UserAccessValidator.HasUserRoleInRanch(
                currentPersonId,
                ranchId,
                RoleNames.HostSecretary
            );

            if (!isRanchAdminInRanch && !isHostSecretaryInRanch)
            {
                throw new UnauthorizedAccessException(
                    "אין לך הרשאה להעלות תעודת בריאות עבור סוס זה");
            }

            Competition? competition = Competition.GetCompetitionById(competitionId);

            // The horse list is only read when the admin branch can still pass, so
            // the secretary branch costs exactly what it cost before.
            bool horseBelongsToRanch =
                isRanchAdminInRanch && HorseBelongsToRanch(horseId, ranchId);

            HealthCertificateUploadBranch branch = ResolveHealthCertificateUploadBranch(
                horseId,
                competitionId,
                ranchId,
                isRanchAdminInRanch,
                isHostSecretaryInRanch,
                horseBelongsToRanch,
                competition?.HostRanchId
            );

            if (branch == HealthCertificateUploadBranch.Denied)
            {
                throw new UnauthorizedAccessException(
                    "אין לך הרשאה להעלות תעודת בריאות עבור סוס זה");
            }
        }

        // Existence and ownership in one read, through the horse retrieval method
        // this controller already uses (usp_gethorsesbyranch). A horse from another
        // ranch - or a horse id that does not exist at all - is simply absent.
        private static bool HorseBelongsToRanch(int horseId, int ranchId)
        {
            if (horseId <= 0 || ranchId <= 0)
            {
                return false;
            }

            var filters = new GetHorsesFiltersRequest
            {
                RanchId = ranchId
            };

            return Horse.GetHorsesByRanch(filters).Any(horse => horse.HorseId == horseId);
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