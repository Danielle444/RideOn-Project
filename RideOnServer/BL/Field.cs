using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Field
    {
        public short FieldId { get; set; }
        public string FieldName { get; set; } = string.Empty;

        // GET ALL
        internal static List<Field> GetAllFields()
        {
            FieldDAL dal = new FieldDAL();
            return dal.GetAllFields();
        }

        // CREATE
        internal static int CreateField(string fieldName)
        {
            if (string.IsNullOrWhiteSpace(fieldName))
                throw new Exception("Field name is required");

            FieldDAL dal = new FieldDAL();
            return dal.InsertField(fieldName.Trim());
        }

        // UPDATE
        internal static void UpdateField(short fieldId, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(fieldName))
                throw new Exception("Field name is required");

            FieldDAL dal = new FieldDAL();
            dal.UpdateField(fieldId, fieldName.Trim());
        }

        // DELETE
        internal static void DeleteField(short fieldId)
        {
            FieldDAL dal = new FieldDAL();
            dal.DeleteField(fieldId);
        }
    }
}