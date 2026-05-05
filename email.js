/* ═══════════════════════════════════════════
   OpenClaw — Email Tool (Nodemailer)
   ═══════════════════════════════════════════ */

const nodemailer = require('nodemailer');

// Set up transporter using App Passwords (100% free)
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Gmail credentials missing in .env");
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

// Delay function to avoid Gmail rate limits
const delay = ms => new Promise(res => setTimeout(res, ms));

async function sendBulkEmails(leads, subjectTemplate, bodyTemplate) {
  const transporter = getTransporter();
  const results = [];

  // Verify connection — throws a readable error if credentials are wrong
  try {
    await transporter.verify();
  } catch (verifyErr) {
    throw new Error(`Gmail connection failed: ${verifyErr.message}. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env`);
  }

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (!lead.email || lead.email === 'N/A') continue;

    // Personalize template
    const subject = subjectTemplate.replace(/{{name}}/g, lead.name || 'there');
    const body = bodyTemplate.replace(/{{name}}/g, lead.name || 'there');

    try {
      console.log(`[Email] Sending to ${lead.email}...`);
      
      const info = await transporter.sendMail({
        from: `"OpenClaw AI" <${process.env.GMAIL_USER}>`,
        to: lead.email,
        subject: subject,
        text: body
      });

      results.push({ email: lead.email, success: true, id: info.messageId });
      
      // Rate limiting (1 second between emails to prevent spam blocks)
      if (i < leads.length - 1) await delay(1000);
      
    } catch (error) {
      console.error(`[Email Error] Failed to send to ${lead.email}:`, error.message);
      results.push({ email: lead.email, success: false, error: error.message });
    }
  }

  return results;
}

module.exports = { sendBulkEmails };
