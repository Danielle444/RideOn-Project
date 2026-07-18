using RideOnServer.BL.DTOs.Prediction;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    // Computes and caches entry-count predictions for classincompetition rows. Every public
    // method here catches broad Exception and logs instead of throwing -- a prediction failure
    // (PredictionUnavailableException, a DB error, anything) must never break a class create,
    // edit, delete, or competition-duplicate flow. Callers wire this in as a single fire-and-
    // forget line; no try/catch is needed at the call site.
    public static class PredictionService
    {
        // classes_per_competition is a feature (see FeatureVectorBuilder), so adding, editing, or
        // deleting any one class changes every sibling class's feature vector. Recompute always
        // covers the whole competition, never just the touched class.
        public static void RecomputeCompetition(int competitionId)
        {
            try
            {
                EntryPredictionDAL dal = new EntryPredictionDAL();
                ActiveModelParameters modelParameters = dal.GetActiveModelParameters();

                List<ClassInCompetition> classes = ClassInCompetition.GetClassesByCompetitionId(competitionId);

                foreach (ClassInCompetition classInCompetition in classes)
                {
                    RecomputeClass(classInCompetition.ClassInCompId, modelParameters, dal);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in PredictionService.RecomputeCompetition (competitionId={competitionId}): {ex.Message}");
            }
        }

        // One class's failure (e.g. PredictionUnavailableException for a field with no completed-
        // competition history) is caught and logged here, per class, so it does not stop the rest
        // of the competition's siblings from being recomputed.
        private static void RecomputeClass(int classIncompId, ActiveModelParameters modelParameters, EntryPredictionDAL dal)
        {
            try
            {
                PredictionFeatureVector vector = FeatureVectorBuilder.Build(classIncompId, modelParameters);
                decimal predictedEntries = ComputePrediction(vector);
                dal.UpsertEntryPrediction(classIncompId, predictedEntries, modelParameters.ModelVersionId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in PredictionService recompute for classIncompId={classIncompId}: {ex.Message}");
            }
        }

        // prediction = intercept + sum(coefficient * (value - scalerMean) / scalerScale), clamped
        // at 0. Mirrors FeatureVectorBuilderParityTests.ComputeRawPrediction's formula exactly, but
        // that test method stays unclamped on purpose -- parity_reference_v1.csv holds the raw
        // sklearn output (three historical rows are genuinely negative), so clamping only belongs
        // here, at serving/caching time, never in the parity comparison.
        public static decimal ComputePrediction(PredictionFeatureVector vector)
        {
            double prediction = vector.Intercept;
            for (int i = 0; i < vector.Parameters.Count; i++)
            {
                ModelParameterRow parameter = vector.Parameters[i];
                prediction += parameter.Coefficient * (vector.Values[i] - parameter.ScalerMean) / parameter.ScalerScale;
            }

            return (decimal)Math.Max(prediction, 0);
        }
    }
}
