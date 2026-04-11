using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace RideOnServer.BL
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public void SendOtpEmail(string toEmail, string otpCode)
        {
            string subject = "קוד אימות - RideOn";
            string body = $"קוד האימות שלך הוא: {otpCode}\n\nהקוד תקף ל-10 דקות.";
            Send(toEmail, subject, body);
        }

        public void SendPasswordResetEmail(string toEmail, string resetLink)
        {
            string subject = "איפוס סיסמה - RideOn";
            string body = $"לאיפוס הסיסמה שלך לחץ על הקישור הבא:\n\n{resetLink}\n\nהקישור תקף ל-30 דקות.";
            Send(toEmail, subject, body);
        }

        private void Send(string toEmail, string subject, string body)
        {
            string smtpHost = _configuration["Email:SmtpHost"]!;
            int smtpPort = int.Parse(_configuration["Email:SmtpPort"]!);
            string smtpUsername = _configuration["Email:SmtpUsername"]!;
            string smtpPassword = _configuration["Email:SmtpPassword"]!;
            string fromAddress = _configuration["Email:FromAddress"]!;
            string fromName = _configuration["Email:FromName"]!;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromAddress));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = body };

            using var client = new SmtpClient();
            client.Connect(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            client.Authenticate(smtpUsername, smtpPassword);
            client.Send(message);
            client.Disconnect(true);
        }
    }
}
