import nodemailer from "nodemailer";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const TEST_RECIPIENT = "delivered@resend.dev";

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendEmail(
  subject: string,
  body: string,
  realRecipientEmail: string,
  headers?: Record<string, string>
): Promise<SendResult> {
  const isRealSending = process.env.ENABLE_REAL_EMAIL_SENDING === "true";
  const recipient = isRealSending && realRecipientEmail ? realRecipientEmail : TEST_RECIPIENT;

  const senderEmail = process.env.SENDER_EMAIL || process.env.GMAIL_USER || "outreach@lead-intelligence.example";
  const senderName = process.env.SENDER_NAME || "Lead Intelligence Platform";
  const formattedSender = `"${senderName}" <${senderEmail}>`;

  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  // Priority 1: If Gmail SMTP is explicitly configured
  if (senderEmail.includes("@gmail.com") || gmailPassword) {
    if (!gmailPassword) {
      return {
        success: false,
        error: `Gmail sending requires a Google App Password. Configure GMAIL_APP_PASSWORD to send from ${senderEmail}.`,
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: senderEmail,
          pass: gmailPassword,
        },
      });

      const info = await transporter.sendMail({
        from: formattedSender,
        to: recipient,
        subject,
        text: body,
        headers,
      });

      return { success: true, providerMessageId: info.messageId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? `Gmail send failed: ${err.message}` : "Unknown Gmail error",
      };
    }
  }

  // Priority 2: Resend for verified custom domains or Resend sandbox sink
  try {
    const result = await resend.emails.send({
      from: formattedSender,
      to: recipient,
      subject,
      text: body,
      headers,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, providerMessageId: result.data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
