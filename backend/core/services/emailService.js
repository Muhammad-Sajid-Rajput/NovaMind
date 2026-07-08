import { Resend } from "resend";
import { logger } from "../utils/logger.js";

const apiKey = process.env.RESEND_API_KEY;
const isDummyKey = !apiKey || apiKey.includes("your_resend_api_key");

// Prevent constructor crash by using a dummy string when key is not provided
const resend = new Resend(isDummyKey ? "re_1234567890" : apiKey);

const FROM_ADDRESS = process.env.RESEND_FROM || "NovaMind <onboarding@resend.dev>";

/**
 * Sends an email verification OTP to the user's email address.
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name (for personalisation)
 * @param {string} otp - 6-digit OTP code
 */
export async function sendVerificationEmail(to, name, otp) {
  const displayName = name || "there";

  if (isDummyKey) {
    logger.info("--------------------------------------------------");
    logger.info(`📧  [DEV FALLBACK] Verification OTP for ${to}: ${otp}`);
    logger.info("To send real emails, set a valid RESEND_API_KEY in your backend/.env");
    logger.info("--------------------------------------------------");
    return { id: "dev-fallback-id" };
  }

  // Always log OTP in console for local development ease
  if (process.env.NODE_ENV !== "production") {
    logger.info("--------------------------------------------------");
    logger.info(`📧  [DEV PREVIEW] Verification OTP for ${to}: ${otp}`);
    logger.info("--------------------------------------------------");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Verify your NovaMind account",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your NovaMind account</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,9,38,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#000926 0%,#0F52BA 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">NovaMind</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">AI Chatbot Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:15px;color:#000926;font-weight:600;">Hi ${displayName},</p>
              <p style="margin:0 0 28px;font-size:14px;color:#5B6775;line-height:1.6;">
                Thanks for signing up! Please use the code below to verify your email address.
                This code expires in <strong>15 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#f0f4ff;border:2px dashed #0F52BA;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0F52BA;">Your verification code</p>
                <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:10px;color:#000926;font-family:monospace;">${otp}</p>
              </div>

              <p style="margin:0;font-size:13px;color:#5B6775;line-height:1.6;">
                If you didn't create a NovaMind account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fc;padding:20px 40px;border-top:1px solid #e8ecf4;text-align:center;">
              <p style="margin:0;font-size:11px;color:#aab4c4;">
                © ${new Date().getFullYear()} NovaMind · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    });

    if (error) {
      logger.error("[Email] Resend error:", { error });
      throw new Error(error.message || "Failed to send verification email");
    }

    logger.info(`[Email] Verification email sent to ${to} (id: ${data?.id})`);
    return data;
  } catch (err) {
    logger.error("[Email] sendVerificationEmail failed:", { error: err.message });
    throw err;
  }
}

/**
 * Sends a password reset OTP to the user's email address.
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} otp - 6-digit reset OTP code
 */
export async function sendPasswordResetEmail(to, name, otp) {
  const displayName = name || "there";

  if (isDummyKey) {
    logger.info("--------------------------------------------------");
    logger.info(`📧  [DEV FALLBACK] Password Reset OTP for ${to}: ${otp}`);
    logger.info("To send real emails, set a valid RESEND_API_KEY in your backend/.env");
    logger.info("--------------------------------------------------");
    return { id: "dev-fallback-id" };
  }

  // Always log OTP in console for local development ease
  if (process.env.NODE_ENV !== "production") {
    logger.info("--------------------------------------------------");
    logger.info(`📧  [DEV PREVIEW] Password Reset OTP for ${to}: ${otp}`);
    logger.info("--------------------------------------------------");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Reset your NovaMind account password",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your NovaMind password</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,9,38,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#090216 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">NovaMind</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Security & Authentication</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:15px;color:#090216;font-weight:600;">Hi ${displayName},</p>
              <p style="margin:0 0 28px;font-size:14px;color:#5B6775;line-height:1.6;">
                We received a request to reset your password. Please use the 6-digit code below to set up a new password.
                This code is valid for <strong>15 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#f5f3ff;border:2px dashed #7c3aed;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7c3aed;">Your password reset code</p>
                <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:10px;color:#090216;font-family:monospace;">${otp}</p>
              </div>

              <p style="margin:0;font-size:13px;color:#5B6775;line-height:1.6;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fc;padding:20px 40px;border-top:1px solid #e8ecf4;text-align:center;">
              <p style="margin:0;font-size:11px;color:#aab4c4;">
                © ${new Date().getFullYear()} NovaMind · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    });

    if (error) {
      logger.error("[Email] Resend error:", { error });
      throw new Error(error.message || "Failed to send password reset email");
    }

    logger.info(`[Email] Password reset email sent to ${to} (id: ${data?.id})`);
    return data;
  } catch (err) {
    logger.error("[Email] sendPasswordResetEmail failed:", { error: err.message });
    throw err;
  }
}
