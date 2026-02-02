// netlify/functions/send-email.js
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, customerName, address, pdfBase64 } = JSON.parse(event.body);

    const data = await resend.emails.send({
      from: "Sharp Lawn Mowing <onboarding@resend.dev>", // Update this later with your domain
      to: [email],
      subject: `Estimate for Lawn Services at ${address}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Hello ${customerName},</h2>
          <p>Thank you for requesting an estimate from <strong>Sharp Lawn Mowing</strong>.</p>
          <p>We have attached the estimate for your property at <strong>${address}</strong>.</p>
          <p>If you have any questions or would like to get on our schedule, simply reply to this email or give us a call.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>The Sharp Lawn Mowing Team</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: `Lawn_Estimate_${customerName.replace(/\s+/g, "_")}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
