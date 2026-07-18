using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Prediction;
using RideOnServer.DAL;
using Xunit.Abstractions;

namespace RideOnServer.Tests
{
    // Compares FeatureVectorBuilder.Build(...) against every row of
    // models/parity_reference_v1.csv (965 historical classes, frozen at training time in
    // Smart_Element/01_data_prep.ipynb Stage 7).
    //
    // Requires a live DB connection with usp_GetEntryPredictionFeatureInputs and
    // usp_GetActiveModelParameters deployed, and modelversion/modelparameter populated with one
    // isactive=true row — gated behind an env var so it's a no-op (not a failure) otherwise. To
    // run it: set ConnectionStrings__DefaultConnection (only that one — this path never touches
    // Jwt/auth config, unlike running the full API) and RIDEON_RUN_PARITY_HARNESS=1, then
    // `dotnet test --filter FullyQualifiedName~FeatureVectorBuilderParityTests
    // --logger "console;verbosity=detailed"` from inside RideOnServer/ (DBServices.Connect uses
    // Directory.GetCurrentDirectory() to find appsettings.json, so the shell's cwd matters).
    //
    // usp_GetActiveModelParameters is called exactly ONCE for the whole run (the active model's
    // 44 parameters don't change between rows) via the Build(classIncompId, modelParameters)
    // overload — every other DB round trip is one usp_GetEntryPredictionFeatureInputs call per
    // classincompid, and those are run with bounded parallelism (ConcurrencyDegree) since
    // DBServices.Connect() opens a brand new NpgsqlConnection per call with no shared mutable
    // state across DAL instances — safe to call concurrently from multiple threads. If that
    // assumption turns out wrong in practice (e.g. Supabase's pooler chokes), drop
    // ConcurrencyDegree to 1 rather than removing the Parallel.ForEach.
    //
    // The report (row count, exact-match count, per-feature mismatch counts) is written via
    // ITestOutputHelper unconditionally, on both pass and fail — Assert.True's message argument
    // alone would only have surfaced it on failure.
    //
    // This is also the only point in this codebase where DateTime.Kind for a `timestamptz` read
    // through Npgsql under Program.cs's EnableLegacyTimestampBehavior switch can be observed — it
    // could not be verified from source alone. The report logs ClassDateTime.Kind and the UTC hour
    // for the first few rows; cross-check that hour against the known value in Supabase before
    // trusting day_of_week/month beyond this harness.
    public class FeatureVectorBuilderParityTests
    {
        private const double FeatureTolerance = 1e-6;
        private const double PredictionTolerance = 1e-3;
        private const int KindSampleSize = 5;
        private const int ProgressInterval = 50;
        private const int ConcurrencyDegree = 6;

        private readonly ITestOutputHelper _output;

        public FeatureVectorBuilderParityTests(ITestOutputHelper output)
        {
            _output = output;
        }

        [Fact]
        public void Build_MatchesAllRowsInParityReferenceCsv()
        {
            if (Environment.GetEnvironmentVariable("RIDEON_RUN_PARITY_HARNESS") != "1")
            {
                _output.WriteLine(
                    "SKIPPED (not a failure): RIDEON_RUN_PARITY_HARNESS is not set to \"1\". " +
                    "See class remarks for the full run procedure.");
                return;
            }

            string csvPath = FindRepoFile("models/parity_reference_v1.csv");
            List<ParityRow> parityRows = ReadParityCsv(csvPath);

            EntryPredictionDAL dal = new EntryPredictionDAL();
            ActiveModelParameters modelParameters = dal.GetActiveModelParameters();
            _output.WriteLine(
                $"Fetched active model parameters once: modelversionid={modelParameters.ModelVersionId}, " +
                $"{modelParameters.Parameters.Count} features, rmse={modelParameters.Rmse}");

            ConcurrentDictionary<string, int> perFeatureMismatches = new ConcurrentDictionary<string, int>();
            ConcurrentBag<string> rowFailures = new ConcurrentBag<string>();
            ConcurrentBag<string> kindSamples = new ConcurrentBag<string>();
            int kindSampleSlotCounter = 0;
            int predictionMismatchCount = 0;
            int exactRowMatchCount = 0;
            int processedCount = 0;
            int exceptionCount = 0;

            Stopwatch stopwatch = Stopwatch.StartNew();

            Parallel.ForEach(
                parityRows,
                new ParallelOptions { MaxDegreeOfParallelism = ConcurrencyDegree },
                row =>
                {
                    try
                    {
                        ScoreRow(
                            row,
                            modelParameters,
                            perFeatureMismatches,
                            kindSamples,
                            ref kindSampleSlotCounter,
                            ref predictionMismatchCount,
                            ref exactRowMatchCount,
                            rowFailures,
                            ref exceptionCount);
                    }
                    finally
                    {
                        int done = Interlocked.Increment(ref processedCount);
                        if (done % ProgressInterval == 0 || done == parityRows.Count)
                        {
                            _output.WriteLine(
                                $"[progress] {done}/{parityRows.Count} rows done, elapsed {stopwatch.Elapsed:mm\\:ss}, " +
                                $"exceptions so far: {Volatile.Read(ref exceptionCount)}");
                        }
                    }
                });

            stopwatch.Stop();

            string report =
                $"Rows compared: {parityRows.Count}\n" +
                $"Wall time: {stopwatch.Elapsed:mm\\:ss}\n" +
                $"Exact matches (all 44 features within {FeatureTolerance} AND prediction within {PredictionTolerance}): {exactRowMatchCount}\n" +
                $"Row-level failures (exceptions): {rowFailures.Count}\n" +
                $"Prediction mismatches (> {PredictionTolerance}): {predictionMismatchCount}\n" +
                "Per-feature mismatch counts:\n" +
                (perFeatureMismatches.IsEmpty
                    ? "  (none)"
                    : string.Join("\n", perFeatureMismatches.Select(kv => $"  {kv.Key}: {kv.Value}"))) +
                (rowFailures.Count > 0 ? "\nFirst row failures:\n  " + string.Join("\n  ", rowFailures.Take(10)) : string.Empty) +
                "\nClassDateTime.Kind samples (Npgsql timestamptz read-back — cross-check the hour against Supabase):\n" +
                string.Join("\n", kindSamples.Select(s => $"  {s}"));

            _output.WriteLine(report);

            bool allMatch = rowFailures.Count == 0 && perFeatureMismatches.IsEmpty && predictionMismatchCount == 0;
            Assert.True(allMatch, report);
        }

        private static void ScoreRow(
            ParityRow row,
            ActiveModelParameters modelParameters,
            ConcurrentDictionary<string, int> perFeatureMismatches,
            ConcurrentBag<string> kindSamples,
            ref int kindSampleSlotCounter,
            ref int predictionMismatchCount,
            ref int exactRowMatchCount,
            ConcurrentBag<string> rowFailures,
            ref int exceptionCount)
        {
            PredictionFeatureVector vector;
            try
            {
                vector = FeatureVectorBuilder.Build(row.ClassIncompId, modelParameters);
            }
            catch (Exception ex)
            {
                rowFailures.Add($"classincompid {row.ClassIncompId}: {ex.GetType().Name}: {ex.Message}");
                Interlocked.Increment(ref exceptionCount);
                return;
            }

            if (Interlocked.Increment(ref kindSampleSlotCounter) <= KindSampleSize)
            {
                kindSamples.Add(DescribeClassDateTimeKind(row.ClassIncompId));
            }

            bool rowMatchesExactly = true;

            for (int i = 0; i < vector.FeatureNames.Count; i++)
            {
                string featureName = vector.FeatureNames[i];
                if (!row.Features.TryGetValue(featureName, out double expected))
                {
                    continue; // Feature absent from the frozen CSV — nothing to compare.
                }

                if (Math.Abs(vector.Values[i] - expected) > FeatureTolerance)
                {
                    perFeatureMismatches.AddOrUpdate(featureName, 1, (_, count) => count + 1);
                    rowMatchesExactly = false;
                }
            }

            double rawPrediction = ComputeRawPrediction(vector);
            if (Math.Abs(rawPrediction - row.PredictedEntryCount) > PredictionTolerance)
            {
                Interlocked.Increment(ref predictionMismatchCount);
                rowMatchesExactly = false;
            }

            if (rowMatchesExactly)
            {
                Interlocked.Increment(ref exactRowMatchCount);
            }
        }

        private static string DescribeClassDateTimeKind(int classIncompId)
        {
            EntryPredictionDAL dal = new EntryPredictionDAL();
            EntryPredictionFeatureInputs? inputs = dal.GetFeatureInputs(classIncompId);
            if (inputs == null)
            {
                return $"classincompid {classIncompId}: not found";
            }

            return $"classincompid {classIncompId}: Kind={inputs.ClassDateTime.Kind}, " +
                   $"raw={inputs.ClassDateTime:yyyy-MM-dd HH:mm:ss}";
        }

        // Runtime formula per the notebook's own self-check (Stage 7):
        // prediction = intercept + sum(coefficient * (value - scalermean) / scalerscale).
        // Deliberately UNCLAMPED here — parity_reference_v1.csv's predicted_entrycount column was
        // written by `model.predict(scaler.transform(X))` (nb01-7-export), which is the raw
        // sklearn output with no floor at 0. Clamping at 0 is a runtime-serving rule for a later
        // phase, not part of what the notebook exported or what this parity check should compare
        // against — confirmed by three rows (classincompid 10, 838, 846) where the raw value here
        // matches the CSV to 1e-6 while being negative, so clamping is applied on the CALLER side
        // when actually serving a prediction, never inside this comparison.
        private static double ComputeRawPrediction(PredictionFeatureVector vector)
        {
            double prediction = vector.Intercept;
            for (int i = 0; i < vector.Parameters.Count; i++)
            {
                ModelParameterRow parameter = vector.Parameters[i];
                prediction += parameter.Coefficient * (vector.Values[i] - parameter.ScalerMean) / parameter.ScalerScale;
            }

            return prediction;
        }

        private static List<ParityRow> ReadParityCsv(string path)
        {
            string[] lines = File.ReadAllLines(path);
            string[] header = lines[0].Split(',');

            List<ParityRow> rows = new List<ParityRow>();
            for (int lineIndex = 1; lineIndex < lines.Length; lineIndex++)
            {
                if (string.IsNullOrWhiteSpace(lines[lineIndex]))
                {
                    continue;
                }

                string[] cells = lines[lineIndex].Split(',');
                Dictionary<string, double> features = new Dictionary<string, double>();
                int classIncompId = 0;
                double predictedEntryCount = 0;

                for (int col = 0; col < header.Length; col++)
                {
                    string columnName = header[col];
                    double value = double.Parse(cells[col], CultureInfo.InvariantCulture);

                    if (columnName == "classincompid")
                    {
                        classIncompId = (int)value;
                    }
                    else if (columnName == "predicted_entrycount")
                    {
                        predictedEntryCount = value;
                    }
                    else
                    {
                        features[columnName] = value;
                    }
                }

                rows.Add(new ParityRow(classIncompId, features, predictedEntryCount));
            }

            return rows;
        }

        private static string FindRepoFile(string relativePath)
        {
            DirectoryInfo? directory = new DirectoryInfo(AppContext.BaseDirectory);
            while (directory != null)
            {
                string candidate = Path.Combine(directory.FullName, relativePath);
                if (File.Exists(candidate))
                {
                    return candidate;
                }

                directory = directory.Parent;
            }

            throw new FileNotFoundException($"Could not locate '{relativePath}' by walking up from {AppContext.BaseDirectory}");
        }

        private sealed record ParityRow(int ClassIncompId, Dictionary<string, double> Features, double PredictedEntryCount);
    }
}
