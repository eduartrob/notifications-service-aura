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

export async function sendResetCodeEmail(to: string, link: string): Promise<void> {
  const mailOptions = {
    from: `"Aura - Plataforma de Bienestar Mental Juvenil" <${process.env.SMTP_USER}>`,
    to,
    subject: "Link de recuperación de contraseña",
    html: `
      <h2>Restablecer tu contraseña</h2>
      <p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
      <a href="${link}">Restablecer Contraseña</a>
      <p>Este enlace expirará en 10 minutos.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
