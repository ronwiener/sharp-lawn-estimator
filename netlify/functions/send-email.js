import { Resend } from "resend";

export const handler = async (event) => {
  // Pull the API key from the environment
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, customerName, address, pdfBase64 } = JSON.parse(event.body);

    const data = await resend.emails.send({
      // BRAND: Sharp Lawn Mowing | DOMAIN: browardmowing.com
      from: "Sharp Lawn Mowing <estimates@browardmowing.com>",
      reply_to: "sharplawnmowing@gmail.com",
      to: [email],
      subject: `Lawn Service Estimate - ${address}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Hi ${customerName},</h2>
          <p>Thanks for requesting an estimate from <strong>Sharp Lawn Mowing</strong>!</p>
          <p>We've attached the details for your property at <strong>${address}</strong>.</p>
          <p>If you're ready to get on the schedule or have questions, just reply to this email.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>The Sharp Lawn Mowing Team</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: `Estimate_${customerName.replace(/\s+/g, "_")}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
