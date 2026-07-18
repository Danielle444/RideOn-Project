namespace RideOnServer.BL.DTOs.Prediction
{
    // Full result of usp_GetActiveModelParameters(): the active modelversion's identity/metrics
    // plus its 44 modelparameter rows. Parameters is populated in whatever order the reader saw
    // (the proc orders by featureorder, but FeatureVectorBuilder re-sorts defensively rather than
    // trusting that ordering survives forever).
    public sealed class ActiveModelParameters
    {
        public int ModelVersionId { get; set; }
        public double Intercept { get; set; }
        public double Rmse { get; set; }
        public List<ModelParameterRow> Parameters { get; set; } = new List<ModelParameterRow>();
    }
}
