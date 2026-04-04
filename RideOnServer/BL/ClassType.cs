using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class ClassType
    {
        public short ClassTypeId { get; set; }
        public byte FieldId { get; set; }
        public string FieldName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string JudgingSheetFormat { get; set; } = string.Empty;
        public string QualificationDescription { get; set; } = string.Empty;

        internal static List<ClassType> GetAllClassTypes(byte? fieldId = null)
        {
            ClassTypeDAL dal = new ClassTypeDAL();
            return dal.GetAllClassTypes(fieldId);
        }

        internal static int CreateClassType(
            byte fieldId,
            string className,
            string judgingSheetFormat,
            string qualificationDescription)
        {
            ValidateClassType(fieldId, className);

            ClassTypeDAL dal = new ClassTypeDAL();
            return dal.InsertClassType(
                fieldId,
                className.Trim(),
                judgingSheetFormat?.Trim() ?? string.Empty,
                qualificationDescription?.Trim() ?? string.Empty
            );
        }

        internal static void UpdateClassType(
            short classTypeId,
            byte fieldId,
            string className,
            string judgingSheetFormat,
            string qualificationDescription)
        {
            ValidateClassType(fieldId, className);

            ClassTypeDAL dal = new ClassTypeDAL();
            dal.UpdateClassType(
                classTypeId,
                fieldId,
                className.Trim(),
                judgingSheetFormat?.Trim() ?? string.Empty,
                qualificationDescription?.Trim() ?? string.Empty
            );
        }

        internal static void DeleteClassType(short classTypeId)
        {
            ClassTypeDAL dal = new ClassTypeDAL();
            dal.DeleteClassType(classTypeId);
        }

        private static void ValidateClassType(byte fieldId, string className)
        {
            if (fieldId <= 0)
                throw new Exception("Field is required");

            if (string.IsNullOrWhiteSpace(className))
                throw new Exception("Class name is required");
        }
    }
}