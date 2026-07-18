namespace RideOnServer.BL
{
    // Thrown by FeatureVectorBuilder when field_avg_past_entries has no completed-competition
    // history to draw from (a field with zero completed classes). Distinct from ValidationException
    // (user input problem) — this is a data-availability problem the caller cannot fix by
    // correcting a form field.
    public class PredictionUnavailableException : Exception
    {
        public PredictionUnavailableException(string message) : base(message)
        {
        }
    }
}
