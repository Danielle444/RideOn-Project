using System.Reflection;
using FluentAssertions;
using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // DB-free coverage of ShavingsOrderDAL.ParseDeliveryDestinations (Slice 1) - the shared
    // helper all three destination-bearing read methods (114/190/176) use to turn the proc's
    // jsonb column into List<ShavingsDestinationCompound>. Invoked via reflection since it is
    // private static, matching this project's established pattern for exercising a DAL's pure
    // internal logic without a connection (see PredictionServiceTests' clamp-at-0 math for the
    // same style applied to a different DAL).
    //
    // Malformed-JSON decision (see the method's own doc comment in ShavingsOrderDAL.cs): a
    // null/DBNull/empty payload is a normal, expected shape and maps to an empty list. A
    // non-empty but malformed payload is NOT swallowed into an empty list - it propagates as a
    // JsonException, mirroring the one existing precedent for DB-sourced JSON in this codebase
    // (AutoSchedulerDAL.GetAutoSchedulerData, which likewise does not special-case
    // deserialization failures) and relying on the same generic controller-level catch every
    // other unexpected DAL failure already goes through. This file pins that both halves of the
    // decision are real and intentional, not an accident of what JsonSerializer happens to do.
    public class ShavingsDestinationParsingTests
    {
        private static List<ShavingsDestinationCompound> Parse(object rawValue)
        {
            MethodInfo method = typeof(ShavingsOrderDAL)
                .GetMethod("ParseDeliveryDestinations", BindingFlags.NonPublic | BindingFlags.Static)
                ?? throw new InvalidOperationException("ShavingsOrderDAL.ParseDeliveryDestinations was not found.");

            try
            {
                object? result = method.Invoke(null, new[] { rawValue });
                return (List<ShavingsDestinationCompound>)result!;
            }
            catch (TargetInvocationException ex) when (ex.InnerException != null)
            {
                // Reflection wraps exceptions thrown by the invoked method - unwrap so callers
                // can assert on the real exception type (JsonException), not the wrapper.
                throw ex.InnerException;
            }
        }

        [Fact]
        public void DBNull_maps_to_an_empty_list()
        {
            Parse(DBNull.Value).Should().NotBeNull().And.BeEmpty();
        }

        [Fact]
        public void Empty_string_maps_to_an_empty_list()
        {
            Parse("").Should().NotBeNull().And.BeEmpty();
        }

        [Fact]
        public void Whitespace_only_string_maps_to_an_empty_list()
        {
            Parse("   ").Should().NotBeNull().And.BeEmpty();
        }

        [Fact]
        public void The_literal_empty_array_maps_to_an_empty_list()
        {
            Parse("[]").Should().NotBeNull().And.BeEmpty();
        }

        [Fact]
        public void A_well_formed_single_compound_single_stall_payload_deserializes_correctly()
        {
            string json = """
                [{"CompoundId":1,"CompoundName":"מתחם תאי תחרות","Stalls":[{"StallId":53,"StallNumber":"605","IsTackStall":false}]}]
                """;

            List<ShavingsDestinationCompound> result = Parse(json);

            result.Should().HaveCount(1);
            result[0].CompoundId.Should().Be(1);
            result[0].CompoundName.Should().Be("מתחם תאי תחרות");
            result[0].Stalls.Should().HaveCount(1);
            result[0].Stalls[0].StallId.Should().Be(53);
            result[0].Stalls[0].StallNumber.Should().Be("605");
            result[0].Stalls[0].IsTackStall.Should().BeFalse();
        }

        [Fact]
        public void A_multi_compound_multi_stall_payload_deserializes_correctly()
        {
            string json = """
                [
                  {"CompoundId":1,"CompoundName":"מתחם תאי תחרות","Stalls":[{"StallId":66,"StallNumber":"706","IsTackStall":false},{"StallId":78,"StallNumber":"806","IsTackStall":false}]},
                  {"CompoundId":3,"CompoundName":"מתחם B2W","Stalls":[{"StallId":1,"StallNumber":"10","IsTackStall":false}]}
                ]
                """;

            List<ShavingsDestinationCompound> result = Parse(json);

            result.Should().HaveCount(2);
            result[0].Stalls.Should().HaveCount(2);
            result[1].Stalls.Should().HaveCount(1);
        }

        [Fact]
        public void A_tack_stall_flag_round_trips_true()
        {
            string json = """
                [{"CompoundId":2,"CompoundName":"מתחם חנית קרונות","Stalls":[{"StallId":18,"StallNumber":"1018","IsTackStall":true}]}]
                """;

            Parse(json)[0].Stalls[0].IsTackStall.Should().BeTrue();
        }

        [Fact]
        public void A_null_StallNumber_inside_a_well_formed_payload_deserializes_as_null_not_an_exception()
        {
            // The stall column itself can legitimately be null if a future caller ever surfaces
            // an unresolved stall inside an otherwise-resolved compound entry - the DTO property
            // is nullable for exactly this reason, even though today's SQL never emits it (an
            // unresolved booking is excluded from destination_compounds entirely, not nulled).
            string json = """
                [{"CompoundId":1,"CompoundName":"מתחם תאי תחרות","Stalls":[{"StallId":1,"StallNumber":null,"IsTackStall":false}]}]
                """;

            Parse(json)[0].Stalls[0].StallNumber.Should().BeNull();
        }

        [Fact]
        public void Malformed_json_throws_rather_than_silently_degrading_to_an_empty_list()
        {
            Action act = () => Parse("{not valid json");

            act.Should().Throw<System.Text.Json.JsonException>(
                "a genuinely malformed payload must surface as a loud, catchable failure " +
                "(handled by the existing controller-level generic catch), not be mistaken for " +
                "the legitimate 'no destination assigned yet' empty-list case");
        }

        [Fact]
        public void Json_of_the_wrong_shape_throws_rather_than_silently_degrading()
        {
            // A JSON object instead of an array is syntactically valid JSON but not assignable
            // to List<ShavingsDestinationCompound> - System.Text.Json throws for this too, and
            // that must not be swallowed either.
            Action act = () => Parse("""{"CompoundId":1}""");

            act.Should().Throw<System.Text.Json.JsonException>();
        }
    }
}
