using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Prediction;

namespace RideOnServer.Tests
{
    public class PredictionServiceTests
    {
        // --- ComputePrediction clamp behavior --------------------------------------------------

        [Fact]
        public void ComputePrediction_ClampsNegativeRawPredictionToZero()
        {
            // intercept alone is already negative, and the single feature pushes it further
            // negative -- raw prediction here is -10 + (2 * (5 - 0) / 1) = 0, so use a coefficient
            // that drives it clearly below zero.
            PredictionFeatureVector vector = BuildVector(
                intercept: -10,
                featureName: "orderinday",
                coefficient: 1,
                value: 0,
                scalerMean: 0,
                scalerScale: 1);

            decimal result = PredictionService.ComputePrediction(vector);

            result.Should().Be(0m);
        }

        [Fact]
        public void ComputePrediction_LeavesPositiveRawPredictionUnclamped()
        {
            // raw prediction = 5 + (2 * (10 - 0) / 1) = 25
            PredictionFeatureVector vector = BuildVector(
                intercept: 5,
                featureName: "orderinday",
                coefficient: 2,
                value: 10,
                scalerMean: 0,
                scalerScale: 1);

            decimal result = PredictionService.ComputePrediction(vector);

            result.Should().Be(25m);
        }

        [Fact]
        public void ComputePrediction_AppliesScalerMeanAndScaleBeforeCoefficient()
        {
            // raw prediction = 0 + (10 * (8 - 3) / 2) = 25
            PredictionFeatureVector vector = BuildVector(
                intercept: 0,
                featureName: "totalcost",
                coefficient: 10,
                value: 8,
                scalerMean: 3,
                scalerScale: 2);

            decimal result = PredictionService.ComputePrediction(vector);

            result.Should().Be(25m);
        }

        // --- RecomputeCompetition failure swallowing -------------------------------------------

        [Fact]
        public void RecomputeCompetition_NeverThrows_WhenCompetitionIdIsInvalid()
        {
            // No DB connection is configured in this test project, and CompetitionId <= 0 also
            // fails BL-level validation on its own -- either way, something inside the recompute
            // pipeline throws. The contract under test is that PredictionService swallows it
            // rather than letting it escape to the caller (a class create/edit/delete BL method
            // must never fail because prediction recompute failed).
            Action act = () => PredictionService.RecomputeCompetition(-1);

            act.Should().NotThrow();
        }

        [Fact]
        public void RecomputeCompetition_NeverThrows_WhenNoDatabaseIsConfigured()
        {
            // A well-formed but unreachable competitionid still has to go through
            // GetActiveModelParameters() first, which fails to connect in this test environment --
            // exercising the same swallow path as above via a different failure point.
            Action act = () => PredictionService.RecomputeCompetition(999999999);

            act.Should().NotThrow();
        }

        private static PredictionFeatureVector BuildVector(
            double intercept,
            string featureName,
            double coefficient,
            double value,
            double scalerMean,
            double scalerScale)
        {
            ModelParameterRow parameter = new ModelParameterRow
            {
                FeatureName = featureName,
                FeatureOrder = 1,
                Coefficient = coefficient,
                ScalerMean = scalerMean,
                ScalerScale = scalerScale
            };

            return new PredictionFeatureVector(
                ClassInCompId: 1,
                ModelVersionId: 1,
                Intercept: intercept,
                Rmse: 0,
                FeatureNames: new List<string> { featureName },
                Values: new List<double> { value },
                Parameters: new List<ModelParameterRow> { parameter });
        }
    }
}
