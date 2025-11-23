import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendResetCodeEmail(to: string, code: string): Promise<void> {
  const mailOptions = {
    from: `"Tu App Store" <${process.env.SMTP_USER}>`,
    to,
    subject: "Código para restablecer contraseña",
    html: `
      <h2>Restablecer tu contraseña</h2>
      <p>Tu código de verificación es:</p>
      <h1 style="color: #333;">${code}</h1>
      <p>Este código expirará en 10 minutos.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
