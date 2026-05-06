using System.Text.Json;
using System.Text.Json.Serialization;

namespace RideOnServer.BL.AutoScheduler
{
    // מודל הנתונים שמתקבל מ-usp_GetAutoSchedulerData (snapshot עקבי).
    public class SchedulerData
    {
        [JsonPropertyName("competitionId")]
        public int CompetitionId { get; set; }

        [JsonPropertyName("now")]
        public DateTime Now { get; set; }

        [JsonPropertyName("slots")]
        public List<SchedulerSlot> Slots { get; set; } = new();

        [JsonPropertyName("requests")]
        public List<SchedulerRequest> Requests { get; set; } = new();

        [JsonPropertyName("batches")]
        public List<SchedulerBatch> Batches { get; set; } = new();
    }

    public class SchedulerSlot
    {
        [JsonPropertyName("paidTimeSlotInCompId")]
        public int PaidTimeSlotInCompId { get; set; }

        [JsonPropertyName("slotDate")]
        public DateTime SlotDate { get; set; }

        [JsonPropertyName("startTime")]
        public string StartTimeRaw { get; set; } = "00:00:00";

        [JsonPropertyName("endTime")]
        public string EndTimeRaw { get; set; } = "00:00:00";

        [JsonIgnore]
        public TimeSpan StartTime => TimeSpan.Parse(StartTimeRaw);

        [JsonIgnore]
        public TimeSpan EndTime => TimeSpan.Parse(EndTimeRaw);

        [JsonPropertyName("totalCapacityMinutes")]
        public int TotalCapacityMinutes { get; set; }

        [JsonPropertyName("arenaRanchId")]
        public int ArenaRanchId { get; set; }

        [JsonPropertyName("arenaId")]
        public int ArenaId { get; set; }

        [JsonPropertyName("arenaName")]
        public string ArenaName { get; set; } = string.Empty;

        [JsonPropertyName("isPublished")]
        public bool IsPublished { get; set; }

        [JsonPropertyName("slotStatus")]
        public string? SlotStatus { get; set; }

        public string ArenaKey => ArenaRanchId + "-" + ArenaId;
    }

    public class SchedulerRequest
    {
        [JsonPropertyName("paidTimeRequestId")]
        public int PaidTimeRequestId { get; set; }

        [JsonPropertyName("horseId")]
        public int HorseId { get; set; }

        [JsonPropertyName("coachFederationMemberId")]
        public int CoachFederationMemberId { get; set; }

        [JsonPropertyName("riderFederationMemberId")]
        public int RiderFederationMemberId { get; set; }

        [JsonPropertyName("priceCatalogId")]
        public int PriceCatalogId { get; set; }

        [JsonPropertyName("productId")]
        public int ProductId { get; set; }

        [JsonPropertyName("durationMinutes")]
        public int DurationMinutes { get; set; }   // effective (with +1 transition)

        [JsonPropertyName("requestedCompSlotId")]
        public int RequestedCompSlotId { get; set; }

        [JsonPropertyName("assignedCompSlotId")]
        public int? AssignedCompSlotId { get; set; }

        [JsonPropertyName("assignedStartTime")]
        public DateTime? AssignedStartTime { get; set; }

        [JsonPropertyName("assignedOrder")]
        public int? AssignedOrder { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Pending";

        [JsonPropertyName("srequestdatetime")]
        public DateTime SrequestDateTime { get; set; }

        [JsonPropertyName("batchId")]
        public int? BatchId { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }

    public class SchedulerBatch
    {
        [JsonPropertyName("batchId")]
        public int BatchId { get; set; }

        [JsonPropertyName("competitionId")]
        public int CompetitionId { get; set; }

        [JsonPropertyName("createdByPersonId")]
        public int CreatedByPersonId { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("payload")]
        public JsonElement Payload { get; set; }

        [JsonPropertyName("requestIds")]
        public List<int> RequestIds { get; set; } = new();
    }

    // התוצאה שהאלגוריתם מייצר ושנכתבת חזרה ל-DB.
    public class AutoScheduleResult
    {
        public int CompetitionId { get; set; }
        public DateTime ExecutedAt { get; set; }
        public int ScheduledCount { get; set; }
        public int UnscheduledCount { get; set; }
        public int FrozenCount { get; set; }
        public List<AssignmentDecision> Assignments { get; set; } = new();
        public List<AuditLogEntry> Audit { get; set; } = new();
    }

    public class AssignmentDecision
    {
        public int PaidTimeRequestId { get; set; }
        public int? AssignedCompSlotId { get; set; }
        public DateTime? AssignedStartTime { get; set; }
        public int? AssignedOrder { get; set; }
        public string Status { get; set; } = "Pending";
    }

    public class AuditLogEntry
    {
        public int PaidTimeRequestId { get; set; }
        public string Action { get; set; } = string.Empty;   // scheduled | unscheduled | kept-frozen | moved
        public string? Reason { get; set; }
        public int? PreviousSlotId { get; set; }
        public int? NewSlotId { get; set; }
        public DateTime? NewStartTime { get; set; }
    }
}
