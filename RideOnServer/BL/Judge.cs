using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Judge
    {
        public int JudgeId { get; set; }
        public string FirstNameHebrew { get; set; } = string.Empty;
        public string LastNameHebrew { get; set; } = string.Empty;
        public string FirstNameEnglish { get; set; } = string.Empty;
        public string LastNameEnglish { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string QualifiedFields { get; set; } = string.Empty;

        internal static List<Judge> GetAllJudges(byte? fieldId = null)
        {
            JudgeDAL dal = new JudgeDAL();
            return dal.GetAllJudges(fieldId);
        }

        internal static int CreateJudge(
            string firstNameHebrew,
            string lastNameHebrew,
            string firstNameEnglish,
            string lastNameEnglish,
            string country,
            string fieldIdsCsv)
        {
            ValidateJudge(firstNameHebrew, lastNameHebrew, country, fieldIdsCsv);

            JudgeDAL dal = new JudgeDAL();
            return dal.InsertJudge(
                firstNameHebrew.Trim(),
                lastNameHebrew.Trim(),
                firstNameEnglish?.Trim() ?? string.Empty,
                lastNameEnglish?.Trim() ?? string.Empty,
                country.Trim(),
                fieldIdsCsv
            );
        }

        internal static void UpdateJudge(
            int judgeId,
            string firstNameHebrew,
            string lastNameHebrew,
            string firstNameEnglish,
            string lastNameEnglish,
            string country,
            string fieldIdsCsv)
        {
            ValidateJudge(firstNameHebrew, lastNameHebrew, country, fieldIdsCsv);

            JudgeDAL dal = new JudgeDAL();
            dal.UpdateJudge(
                judgeId,
                firstNameHebrew.Trim(),
                lastNameHebrew.Trim(),
                firstNameEnglish?.Trim() ?? string.Empty,
                lastNameEnglish?.Trim() ?? string.Empty,
                country.Trim(),
                fieldIdsCsv
            );
        }

        internal static void DeleteJudge(int judgeId)
        {
            JudgeDAL dal = new JudgeDAL();
            dal.DeleteJudge(judgeId);
        }

        private static void ValidateJudge(
            string firstNameHebrew,
            string lastNameHebrew,
            string country,
            string fieldIdsCsv)
        {
            if (string.IsNullOrWhiteSpace(firstNameHebrew))
                throw new Exception("Hebrew first name is required");

            if (string.IsNullOrWhiteSpace(lastNameHebrew))
                throw new Exception("Hebrew last name is required");

            if (string.IsNullOrWhiteSpace(country))
                throw new Exception("Country is required");

            if (string.IsNullOrWhiteSpace(fieldIdsCsv))
                throw new Exception("At least one field must be selected");
        }
    }
}