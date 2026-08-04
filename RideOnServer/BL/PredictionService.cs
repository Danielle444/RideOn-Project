using RideOnServer.BL.DTOs.Prediction;
using RideOnServer.DAL;
using System.Diagnostics;
using System.Linq;

namespace RideOnServer.BL
{
    // Computes and caches entry-count predictions for classincompetition rows. Every public
    // method here catches broad Exception and logs instead of throwing -- a prediction failure
    // (PredictionUnavailableException, a DB error, anything) must never break a class create,
    // edit, delete, or competition-duplicate flow. Callers wire this in as a single fire-and-
    // forget line; no try/catch is needed at the call site.
    public static class PredictionService
    {
        // Read-side lookup for the classes page. Unlike RecomputeCompetition/RecomputeClass this
        // does NOT catch-and-log -- it's a request/response read path, not fire-and-forget, so
        // failures propagate to the controller's normal catch block. The frontend is responsible
        // for treating a failed fetch here as "show nothing," not this layer.
        public static List<ClassEntryPrediction> GetPredictionsByCompetitionId(int competitionId)
        {
            EntryPredictionDAL dal = new EntryPredictionDAL();
            List<EntryPredictionCacheRow> rows = dal.GetPredictionsByCompetitionId(competitionId);

            return rows.Select(row => new ClassEntryPrediction
            {
                ClassInCompId = row.ClassInCompId,
                PredictedEntries = row.PredictedEntries,
                MinPredictedEntries = Math.Max(row.PredictedEntries - (decimal)row.Rmse, 0),
                MaxPredictedEntries = row.PredictedEntries + (decimal)row.Rmse,
                ModelVersionId = row.ModelVersionId,
                ComputedAt = row.ComputedAt
            }).ToList();
        }

        // classes_per_competition is a feature (see FeatureVectorBuilder), so adding, editing, or
        // deleting any one class changes every sibling class's feature vector. Recompute always
        // covers the whole competition, never just the touched class.
        //
        // Perf note (Option B, 2026-08-04): feature-input reads are loaded once for the whole
        // competition via EntryPredictionDAL.GetFeatureInputsByCompetitionId instead of once per
        // class via GetClassesByCompetitionId + N x GetFeatureInputs -- see repo file 224
        // (usp_GetEntryPredictionFeatureInputsByCompetitionId) for the live-verified equivalence.
        // GetClassesByCompetitionId is no longer called here; it was only ever used to enumerate
        // ClassInCompIds, which the batched read already returns per row. Writes stay per-class
        // (UpsertEntryPrediction), unchanged.
        //
        // [PerfTiming] logging below is TEMPORARY instrumentation for validating this change
        // against production timings -- remove once the fix is confirmed, per the audit's
        // instrumentation plan. Logs only competitionId, counts, and millisecond durations; never
        // class names, payloads, tokens, or connection strings.
        public static void RecomputeCompetition(int competitionId)
        {
            Stopwatch totalStopwatch = Stopwatch.StartNew();
            Stopwatch modelParamsStopwatch = new Stopwatch();
            Stopwatch featureReadStopwatch = new Stopwatch();
            Stopwatch vectorBuildStopwatch = new Stopwatch();
            Stopwatch writeStopwatch = new Stopwatch();
            int classCount = 0;
            int failureCount = 0;

            try
            {
                EntryPredictionDAL dal = new EntryPredictionDAL();

                modelParamsStopwatch.Start();
                ActiveModelParameters modelParameters = dal.GetActiveModelParameters();
                modelParamsStopwatch.Stop();

                featureReadStopwatch.Start();
                List<EntryPredictionFeatureInputs> inputsList = dal.GetFeatureInputsByCompetitionId(competitionId);
                featureReadStopwatch.Stop();

                // Defensive: usp_GetEntryPredictionFeatureInputsByCompetitionId is keyed on
                // classincompetition's own primary key, so a duplicate ClassInCompId in the
                // batched result would mean the read itself is untrustworthy -- not a single
                // class's own bad data, so per-class isolation does not apply here. Abort the
                // whole recompute rather than upsert the same class twice.
                List<int> duplicateClassIds = inputsList
                    .GroupBy(inputs => inputs.ClassInCompId)
                    .Where(group => group.Count() > 1)
                    .Select(group => group.Key)
                    .ToList();

                if (duplicateClassIds.Count > 0)
                {
                    Console.WriteLine(
                        $"Error in PredictionService.RecomputeCompetition (competitionId={competitionId}): " +
                        $"batched feature-input read returned {duplicateClassIds.Count} duplicate ClassInCompId(s) " +
                        "-- aborting recompute without writing any prediction for this call.");
                    return;
                }

                // An empty list (a competition with zero classes) is a valid no-op: the loop below
                // simply does not execute, matching the pre-existing convention when
                // GetClassesByCompetitionId returned an empty list.
                classCount = inputsList.Count;

                foreach (EntryPredictionFeatureInputs inputs in inputsList)
                {
                    bool succeeded = RecomputeClass(inputs, modelParameters, dal, vectorBuildStopwatch, writeStopwatch);
                    if (!succeeded)
                    {
                        failureCount++;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in PredictionService.RecomputeCompetition (competitionId={competitionId}): {ex.Message}");
            }
            finally
            {
                totalStopwatch.Stop();
                Console.WriteLine(
                    "[PerfTiming][TEMP] RecomputeCompetition " +
                    $"competitionId={competitionId} classes={classCount} failures={failureCount} " +
                    $"modelParamsMs={modelParamsStopwatch.Elapsed.TotalMilliseconds:F1} " +
                    $"featureReadMs={featureReadStopwatch.Elapsed.TotalMilliseconds:F1} " +
                    $"vectorBuildMs={vectorBuildStopwatch.Elapsed.TotalMilliseconds:F1} " +
                    $"writeMs={writeStopwatch.Elapsed.TotalMilliseconds:F1} " +
                    $"totalMs={totalStopwatch.Elapsed.TotalMilliseconds:F1}");
            }
        }

        // One class's failure (e.g. PredictionUnavailableException for a field with no completed-
        // competition history) is caught and logged here, per class, so it does not stop the rest
        // of the competition's siblings from being recomputed. Returns whether the class succeeded
        // so the caller can accumulate a failure count for the timing summary line.
        private static bool RecomputeClass(
            EntryPredictionFeatureInputs inputs,
            ActiveModelParameters modelParameters,
            EntryPredictionDAL dal,
            Stopwatch vectorBuildStopwatch,
            Stopwatch writeStopwatch)
        {
            try
            {
                vectorBuildStopwatch.Start();
                PredictionFeatureVector vector = FeatureVectorBuilder.Build(inputs, modelParameters);
                decimal predictedEntries = ComputePrediction(vector);
                vectorBuildStopwatch.Stop();

                writeStopwatch.Start();
                dal.UpsertEntryPrediction(inputs.ClassInCompId, predictedEntries, modelParameters.ModelVersionId);
                writeStopwatch.Stop();

                return true;
            }
            catch (Exception ex)
            {
                if (vectorBuildStopwatch.IsRunning)
                {
                    vectorBuildStopwatch.Stop();
                }

                if (writeStopwatch.IsRunning)
                {
                    writeStopwatch.Stop();
                }

                Console.WriteLine($"Error in PredictionService recompute for classIncompId={inputs.ClassInCompId}: {ex.Message}");
                return false;
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
