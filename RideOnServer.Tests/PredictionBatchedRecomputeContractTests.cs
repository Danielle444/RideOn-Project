using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Prediction;

namespace RideOnServer.Tests
{
    // Option B batched-recompute integration (2026-08-04): PredictionService.RecomputeCompetition
    // now reads all of a competition's feature inputs in one call
    // (EntryPredictionDAL.GetFeatureInputsByCompetitionId /
    // usp_GetEntryPredictionFeatureInputsByCompetitionId, repo file 224) instead of enumerating
    // classes via ClassInCompetition.GetClassesByCompetitionId and reading each class's feature
    // inputs individually. This file follows the same two techniques already established in this
    // project (RescheduleCompetitionContractTests, HealthCertificateApprovalContractTests):
    // reflection/pure execution for behavior that needs no live DB connection, and bounded
    // source-text assertions for behavior that does (the actual DB round-trip shape, exception
    // logging, and control flow inside DB-touching methods) -- no mocking framework exists in
    // this project.
    //
    // What live-DB verification (NOT this file) already proved separately: the batched SP is
    // byte-for-byte equivalent to N calls of the single-class SP for competitions 78 (38 classes),
    // 3 (57 classes), and 44 (1 class) -- zero missing/extra/duplicate rows, zero column
    // mismatches across all 15 columns (see repo file 224's header comment for the full result).
    public class PredictionBatchedRecomputeContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ReadServerFile(params string[] relativeParts)
        {
            string[] parts = new string[relativeParts.Length + 2];
            parts[0] = TestSourceDirectory();
            parts[1] = "..";
            Array.Copy(relativeParts, 0, parts, 2, relativeParts.Length);

            string path = Path.GetFullPath(Path.Combine(parts));

            File.Exists(path).Should().BeTrue("expected file at {0}", path);

            return File.ReadAllText(path);
        }

        private static int CountOccurrences(string haystack, string needle)
        {
            int count = 0;
            int index = 0;

            while ((index = haystack.IndexOf(needle, index, StringComparison.Ordinal)) != -1)
            {
                count++;
                index += needle.Length;
            }

            return count;
        }

        private static string BoundedBody(string source, string fromMarker, string toMarker, string context)
        {
            int from = source.IndexOf(fromMarker, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, $"'{fromMarker}' was expected in {context}");

            string rest = source.Substring(from);

            int to = rest.IndexOf(toMarker, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1, $"'{toMarker}' was expected after '{fromMarker}' in {context}");

            return rest.Substring(0, to);
        }

        // =================================================================
        // EntryPredictionDAL — new batched method, shared mapper, existing
        // single-class method left behaviorally unchanged.
        // =================================================================

        private static string EntryPredictionDALSource()
        {
            return ReadServerFile("RideOnServer", "DAL", "EntryPredictionDAL.cs");
        }

        private static string GetFeatureInputsByCompetitionIdBody()
        {
            return BoundedBody(
                EntryPredictionDALSource(),
                "public List<EntryPredictionFeatureInputs> GetFeatureInputsByCompetitionId(int competitionId)",
                "private static EntryPredictionFeatureInputs MapFeatureInputs(",
                "EntryPredictionDAL");
        }

        private static string MapFeatureInputsBody()
        {
            string source = EntryPredictionDALSource();
            int from = source.IndexOf(
                "private static EntryPredictionFeatureInputs MapFeatureInputs(",
                StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "MapFeatureInputs was expected in EntryPredictionDAL");
            return source.Substring(from);
        }

        [Fact]
        public void GetFeatureInputsByCompetitionId_CallsTheVerifiedBatchedStoredProcedureExactlyOnce()
        {
            string body = GetFeatureInputsByCompetitionIdBody();

            CountOccurrences(body, "CreateCommandWithStoredProcedure(\"usp_GetEntryPredictionFeatureInputsByCompetitionId\"").Should().Be(1);
            CountOccurrences(body, "Connect(\"DefaultConnection\")").Should().Be(1);
        }

        [Fact]
        public void GetFeatureInputsByCompetitionId_PassesCompetitionIdOnce()
        {
            string body = GetFeatureInputsByCompetitionIdBody();

            CountOccurrences(body, "\"@CompetitionId\"").Should().Be(1);
        }

        [Fact]
        public void GetFeatureInputsByCompetitionId_ReusesTheSharedMapperInsteadOfDuplicatingItsBody()
        {
            string body = GetFeatureInputsByCompetitionIdBody();

            body.Should().Contain("list.Add(MapFeatureInputs(reader));");
            // The 15-column inline object initializer must live only in the shared mapper, not
            // duplicated inline here.
            body.Should().NotContain("new EntryPredictionFeatureInputs");
        }

        [Fact]
        public void MapFeatureInputs_ReadsAllFifteenColumnsWithTheExactNullHandlingConvention()
        {
            string body = MapFeatureInputsBody();

            body.Should().Contain("reader[\"ClassInCompId\"]");
            body.Should().Contain("reader[\"CompetitionId\"]");
            body.Should().Contain("reader[\"ClassDateTime\"]");
            body.Should().Contain("reader[\"OrderInDay\"]");
            body.Should().Contain("reader[\"TotalCost\"]");
            body.Should().Contain("reader[\"ClassTypeId\"]");
            body.Should().Contain("reader[\"ClassName\"]");
            body.Should().Contain("reader[\"FieldId\"]");
            body.Should().Contain("reader[\"FieldName\"]");
            body.Should().Contain("reader[\"ClassesPerCompetition\"]");
            body.Should().Contain("reader[\"FieldAvgPastEntries\"]");
            body.Should().Contain("reader[\"ClassNameAvgPastEntries\"]");
            body.Should().Contain("reader[\"PrizeShovarAmount\"]");
            body.Should().Contain("reader[\"PrizeJackpotPostedAmount\"]");
            body.Should().Contain("reader[\"PrizeAddedMoneyAmount\"]");

            // Nullable columns keep the exact "== DBNull.Value ? null : Convert..." pattern the
            // original inline GetFeatureInputs construction used.
            body.Should().Contain("reader[\"OrderInDay\"] == DBNull.Value ? null : Convert.ToInt16(reader[\"OrderInDay\"])");
            body.Should().Contain("reader[\"FieldAvgPastEntries\"] == DBNull.Value ? null : Convert.ToDecimal(reader[\"FieldAvgPastEntries\"])");
            body.Should().Contain("reader[\"ClassNameAvgPastEntries\"] == DBNull.Value ? null : Convert.ToDecimal(reader[\"ClassNameAvgPastEntries\"])");
        }

        [Fact]
        public void GetFeatureInputs_SingleClassMethodStillCallsTheOriginalUnbatchedProcedure()
        {
            string source = EntryPredictionDALSource();

            int from = source.IndexOf(
                "public EntryPredictionFeatureInputs? GetFeatureInputs(int classInCompId)",
                StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string rest = source.Substring(from);
            int to = rest.IndexOf(
                "// Competition-scoped batched sibling of GetFeatureInputs",
                StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string body = rest.Substring(0, to);

            // Unchanged single round trip to the ORIGINAL single-class proc, not the new one --
            // and no accidental match on the longer "...ByCompetitionId" name.
            CountOccurrences(body, "CreateCommandWithStoredProcedure(\"usp_GetEntryPredictionFeatureInputs\"").Should().Be(1);
            body.Should().NotContain("usp_GetEntryPredictionFeatureInputsByCompetitionId");
            CountOccurrences(body, "Connect(\"DefaultConnection\")").Should().Be(1);
            body.Should().Contain("return MapFeatureInputs(reader);");
        }

        // =================================================================
        // FeatureVectorBuilder — preloaded-input overload shares the exact
        // same feature-assembly logic as the classIncompId overload.
        // =================================================================

        private static string FeatureVectorBuilderSource()
        {
            return ReadServerFile("RideOnServer", "BL", "FeatureVectorBuilder.cs");
        }

        [Fact]
        public void Build_ClassIncompIdOverload_DelegatesToThePreloadedInputsOverload_NoDuplicatedAssemblyLogic()
        {
            string source = FeatureVectorBuilderSource();

            string body = BoundedBody(
                source,
                "public static PredictionFeatureVector Build(int classIncompId, ActiveModelParameters modelParameters)",
                "public static PredictionFeatureVector Build(EntryPredictionFeatureInputs inputs, ActiveModelParameters modelParameters)",
                "FeatureVectorBuilder");

            body.Should().Contain("return Build(inputs, modelParameters);");
            // The 44-feature assembly loop and BuildFeatureDictionary call must NOT be duplicated
            // in this overload -- they belong only in the preloaded-inputs overload below it.
            body.Should().NotContain("BuildFeatureDictionary(");
            body.Should().NotContain("orderedParameters");
        }

        [Fact]
        public void Build_PreloadedInputsOverload_ContainsTheSoleFeatureAssemblyImplementation()
        {
            string source = FeatureVectorBuilderSource();

            int from = source.IndexOf(
                "public static PredictionFeatureVector Build(EntryPredictionFeatureInputs inputs, ActiveModelParameters modelParameters)",
                StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string body = source.Substring(from);

            body.Should().Contain("BuildFeatureDictionary(inputs, fieldAvgPastEntries, classNameAvgPastEntries)");
            body.Should().Contain("PredictionUnavailableException");
            body.Should().Contain("orderedParameters");

            // Exactly one declaration + one call site for BuildFeatureDictionary in the whole
            // file (the private method itself, plus its single caller here) -- the shared
            // 44-feature dictionary assembly is never duplicated or called from a second place.
            CountOccurrences(source, "BuildFeatureDictionary(").Should().Be(2);
            CountOccurrences(source, "private static Dictionary<string, double> BuildFeatureDictionary(").Should().Be(1);
        }

        // =================================================================
        // FeatureVectorBuilder — pure, DB-free behavior of the new overload.
        // =================================================================

        private static ActiveModelParameters BuildModelParameters(params (string name, double coefficient, double mean, double scale)[] features)
        {
            ActiveModelParameters parameters = new ActiveModelParameters
            {
                ModelVersionId = 1,
                Intercept = 0,
                Rmse = 3.086
            };

            int order = 1;
            foreach ((string name, double coefficient, double mean, double scale) in features)
            {
                parameters.Parameters.Add(new ModelParameterRow
                {
                    FeatureName = name,
                    FeatureOrder = order++,
                    Coefficient = coefficient,
                    ScalerMean = mean,
                    ScalerScale = scale
                });
            }

            return parameters;
        }

        private static EntryPredictionFeatureInputs BuildInputs(
            short? orderInDay = 3,
            decimal totalCost = 250,
            DateTime? classDateTime = null,
            int classesPerCompetition = 12,
            decimal? fieldAvgPastEntries = 8.5m,
            decimal? classNameAvgPastEntries = 6.25m,
            decimal prizeShovar = 0,
            decimal prizeJackpot = 0,
            decimal prizeAddedMoney = 0,
            string className = "פתוח")
        {
            return new EntryPredictionFeatureInputs
            {
                ClassInCompId = 42,
                CompetitionId = 78,
                ClassDateTime = classDateTime ?? new DateTime(2026, 5, 6, 10, 0, 0, DateTimeKind.Utc), // Wednesday, May
                OrderInDay = orderInDay,
                TotalCost = totalCost,
                ClassTypeId = 1,
                ClassName = className,
                FieldId = 1,
                FieldName = "ריינינג",
                ClassesPerCompetition = classesPerCompetition,
                FieldAvgPastEntries = fieldAvgPastEntries,
                ClassNameAvgPastEntries = classNameAvgPastEntries,
                PrizeShovarAmount = prizeShovar,
                PrizeJackpotPostedAmount = prizeJackpot,
                PrizeAddedMoneyAmount = prizeAddedMoney
            };
        }

        [Fact]
        public void Build_WithPreloadedInputs_ProducesTheExpectedRawFeatureValues_NoDbRequired()
        {
            EntryPredictionFeatureInputs inputs = BuildInputs();
            ActiveModelParameters modelParameters = BuildModelParameters(
                ("orderinday", 1, 0, 1),
                ("totalcost", 1, 0, 1),
                ("day_of_week", 1, 0, 1),
                ("classes_per_competition", 1, 0, 1),
                ("field_avg_past_entries", 1, 0, 1),
                ("classname_avg_past_entries", 1, 0, 1),
                ("month_5", 1, 0, 1));

            PredictionFeatureVector vector = FeatureVectorBuilder.Build(inputs, modelParameters);

            vector.ClassInCompId.Should().Be(42);
            vector.FeatureNames.Should().Equal(
                "orderinday", "totalcost", "day_of_week", "classes_per_competition",
                "field_avg_past_entries", "classname_avg_past_entries", "month_5");

            // 2026-05-06 is a Wednesday -> pandas dt.dayofweek (Monday=0) = 2.
            vector.Values.Should().Equal(3, 250, 2, 12, 8.5, 6.25, 1);
        }

        [Fact]
        public void Build_WithPreloadedInputs_ThrowsPredictionUnavailableException_WhenFieldAvgPastEntriesIsNull()
        {
            EntryPredictionFeatureInputs inputs = BuildInputs(fieldAvgPastEntries: null);
            ActiveModelParameters modelParameters = BuildModelParameters(("orderinday", 1, 0, 1));

            Action act = () => FeatureVectorBuilder.Build(inputs, modelParameters);

            act.Should().Throw<PredictionUnavailableException>()
                .WithMessage("*field_avg_past_entries*");
        }

        [Fact]
        public void Build_WithPreloadedInputs_FallsBackToFieldAverage_WhenClassNameAvgPastEntriesIsNull()
        {
            EntryPredictionFeatureInputs inputs = BuildInputs(fieldAvgPastEntries: 9m, classNameAvgPastEntries: null);
            ActiveModelParameters modelParameters = BuildModelParameters(("classname_avg_past_entries", 1, 0, 1));

            PredictionFeatureVector vector = FeatureVectorBuilder.Build(inputs, modelParameters);

            vector.Values.Should().Equal(9);
        }

        [Fact]
        public void Build_WithPreloadedInputs_ThrowsWhenNoActiveModelVersion()
        {
            EntryPredictionFeatureInputs inputs = BuildInputs();
            ActiveModelParameters emptyModel = new ActiveModelParameters();

            Action act = () => FeatureVectorBuilder.Build(inputs, emptyModel);

            act.Should().Throw<Exception>().WithMessage("No active model version found");
        }

        // =================================================================
        // PredictionService.RecomputeCompetition — batched read wiring,
        // per-class isolation, duplicate-guard, upsert-per-class contract.
        // =================================================================

        private static string PredictionServiceSource()
        {
            return ReadServerFile("RideOnServer", "BL", "PredictionService.cs");
        }

        private static string RecomputeCompetitionBody()
        {
            return BoundedBody(
                PredictionServiceSource(),
                "public static void RecomputeCompetition(int competitionId)",
                "private static bool RecomputeClass(",
                "PredictionService");
        }

        private static string RecomputeClassBody()
        {
            string source = PredictionServiceSource();
            int from = source.IndexOf("private static bool RecomputeClass(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);
            return source.Substring(from);
        }

        [Fact]
        public void RecomputeCompetition_NoLongerCallsGetClassesByCompetitionId()
        {
            // The identifier still appears in explanatory comments (why it was removed, and the
            // empty-list no-op convention it used to establish) -- what must be gone is the actual
            // call site.
            RecomputeCompetitionBody().Should().NotContain("ClassInCompetition.GetClassesByCompetitionId(");
            RecomputeCompetitionBody().Should().NotContain("= GetClassesByCompetitionId(");
        }

        [Fact]
        public void RecomputeCompetition_ReadsFeatureInputsWithExactlyOneBatchedCall()
        {
            string body = RecomputeCompetitionBody();

            CountOccurrences(body, "GetFeatureInputsByCompetitionId(").Should().Be(1);
            CountOccurrences(body, "GetActiveModelParameters(").Should().Be(1);
        }

        [Fact]
        public void RecomputeCompetition_DetectsDuplicateClassInCompIdsAndAbortsWithoutUpserting()
        {
            string body = RecomputeCompetitionBody();

            body.Should().Contain("GroupBy(inputs => inputs.ClassInCompId)");
            body.Should().Contain("group.Count() > 1");
            // The abort path must return before entering the per-class loop that upserts.
            int duplicateCheckAt = body.IndexOf("duplicateClassIds.Count > 0", StringComparison.Ordinal);
            int loopAt = body.IndexOf("foreach (EntryPredictionFeatureInputs inputs in inputsList)", StringComparison.Ordinal);
            duplicateCheckAt.Should().BeGreaterThan(-1);
            loopAt.Should().BeGreaterThan(-1);
            duplicateCheckAt.Should().BeLessThan(loopAt);
        }

        [Fact]
        public void RecomputeCompetition_IteratesTheBatchedResultAndDelegatesEachRowToRecomputeClassOnce()
        {
            string body = RecomputeCompetitionBody();

            CountOccurrences(body, "RecomputeClass(").Should().Be(1);
            body.Should().Contain("foreach (EntryPredictionFeatureInputs inputs in inputsList)");
        }

        [Fact]
        public void RecomputeCompetition_OuterCatchStillSwallowsAndLogsWithoutRethrowing()
        {
            string body = RecomputeCompetitionBody();

            body.Should().Contain("catch (Exception ex)");
            body.Should().Contain("Console.WriteLine($\"Error in PredictionService.RecomputeCompetition (competitionId={competitionId}): {ex.Message}\");");
        }

        [Fact]
        public void RecomputeClass_StillIsolatesOneClassFailureFromItsSiblings()
        {
            string body = RecomputeClassBody();

            body.Should().Contain("catch (Exception ex)");
            body.Should().Contain("Console.WriteLine($\"Error in PredictionService recompute for classIncompId={inputs.ClassInCompId}: {ex.Message}\");");
            // The catch must return false (a per-class result), never rethrow.
            body.Should().NotContain("throw;");
        }

        [Fact]
        public void RecomputeClass_CallsUpsertEntryPredictionExactlyOnceWithUnchangedArguments()
        {
            string body = RecomputeClassBody();

            CountOccurrences(body, "dal.UpsertEntryPrediction(").Should().Be(1);
            body.Should().Contain("dal.UpsertEntryPrediction(inputs.ClassInCompId, predictedEntries, modelParameters.ModelVersionId);");
        }

        [Fact]
        public void RecomputeClass_UsesTheUnchangedComputePredictionFormula()
        {
            string body = RecomputeClassBody();

            body.Should().Contain("PredictionFeatureVector vector = FeatureVectorBuilder.Build(inputs, modelParameters);");
            body.Should().Contain("decimal predictedEntries = ComputePrediction(vector);");
        }

        [Fact]
        public void ComputePrediction_FormulaIsUnchanged()
        {
            string source = PredictionServiceSource();

            // Exact formula text pinned -- this method was not touched by the batching change.
            source.Should().Contain(
                "prediction += parameter.Coefficient * (vector.Values[i] - parameter.ScalerMean) / parameter.ScalerScale;");
            source.Should().Contain("return (decimal)Math.Max(prediction, 0);");
        }

        [Fact]
        public void PerfTiming_InstrumentationIsMarkedTemporaryAndLogsNoSensitiveData()
        {
            string body = RecomputeCompetitionBody();

            body.Should().Contain("[PerfTiming][TEMP]");
            // Only IDs, counts, and durations are logged -- never a class name, payload, token,
            // or connection string.
            body.Should().NotContain("inputs.ClassName");
            body.Should().NotContain("ConnectionString");
        }
    }
}
