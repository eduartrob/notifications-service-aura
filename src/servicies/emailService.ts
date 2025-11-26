import nodemailer from "nodemailer";
import xss from "xss";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailTemplate {
  subject: string;
  html: string;
}

// 📧 Plantillas de emails dinámicas
function getEmailTemplate(type: string, body: string, metadata?: any): EmailTemplate {
  const cleanBody = xss(body);

  switch (type) {
    case 'PASSWORD_RECOVERY':
      const cleanLink = xss(body); // En este caso, body es el link
      return {
        subject: "🔑 Link de recuperación de contraseña - Aura",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4A5568;">🔑 Restablecer tu contraseña</h2>
            <p>Hola,</p>
            <p>Has solicitado restablecer tu contraseña en <strong>Aura - Plataforma de Bienestar Mental Juvenil</strong>.</p>
            <p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${cleanLink}" style="background-color: #4299E1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Restablecer Contraseña
              </a>
            </div>
            <p style="color: #E53E3E;"><strong>⚠️ Este enlace expirará en 10 minutos.</strong></p>
            <p style="color: #718096; font-size: 12px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
          </div>
        `,
      };

    case 'USER_LOGGED_IN':
      return {
        subject: "🔒 Inicio de sesión detectado en tu cuenta - Aura",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4A5568;">🔒 Inicio de Sesión Detectado</h2>
            <p>Hola,</p>
            <p>${cleanBody}</p>
            <p>Si fuiste tú, puedes ignorar este mensaje. Si no reconoces esta actividad, te recomendamos cambiar tu contraseña inmediatamente.</p>
            <div style="background-color: #EDF2F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Información adicional:</strong></p>
              ${metadata?.device ? `<p style="margin: 5px 0;">📱 Dispositivo: ${xss(metadata.device)}</p>` : ''}
              ${metadata?.ipAddress ? `<p style="margin: 5px 0;">🌐 Dirección IP: ${xss(metadata.ipAddress)}</p>` : ''}
              ${metadata?.timestamp ? `<p style="margin: 5px 0;">🕐 Fecha y hora: ${xss(metadata.timestamp)}</p>` : ''}
            </div>
            <p style="color: #718096; font-size: 12px;">Este es un correo automático de seguridad de Aura - Plataforma de Bienestar Mental Juvenil.</p>
          </div>
        `,
      };

    case 'USER_REGISTERED':
      return {
        subject: "🚨 Nuevo registro de usuario - Aura Admin",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4A5568;">🚨 Nuevo Registro de Usuario</h2>
            <p>${cleanBody}</p>
            <div style="background-color: #F7FAFC; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4299E1;">
              ${metadata?.username ? `<p style="margin: 5px 0;"><strong>Usuario:</strong> ${xss(metadata.username)}</p>` : ''}
              ${metadata?.email ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${xss(metadata.email)}</p>` : ''}
              ${metadata?.registeredAt ? `<p style="margin: 5px 0;"><strong>Fecha de registro:</strong> ${xss(metadata.registeredAt)}</p>` : ''}
            </div>
          </div>
        `,
      };

    case 'WELCOME_USER':
      return {
        subject: "🎉 ¡Bienvenido a Aura - Plataforma de Bienestar Mental Juvenil!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ¡Bienvenido a Aura!</h1>
            </div>
            <div style="padding: 30px 20px;">
              <p style="font-size: 16px; color: #4A5568;">Hola <strong>${metadata?.username ? xss(metadata.username) : ''}</strong>,</p>
              <p style="font-size: 16px; color: #4A5568;">${cleanBody}</p>
              <div style="background-color: #EBF8FF; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4299E1;">
                <h3 style="color: #2C5282; margin-top: 0;">✨ ¿Qué puedes hacer en Aura?</h3>
                <ul style="color: #2D3748; line-height: 1.8;">
                  <li>📝 Compartir tus pensamientos y experiencias</li>
                  <li>🤝 Conectar con una comunidad de apoyo</li>
                  <li>💬 Participar en conversaciones significativas</li>
                  <li>🌱 Crecer en tu bienestar mental</li>
                </ul>
              </div>
              <p style="font-size: 16px; color: #4A5568;">Estamos emocionados de tenerte con nosotros en este viaje hacia el bienestar mental.</p>
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #718096; font-style: italic;">"Tu bienestar mental es nuestra prioridad"</p>
              </div>
            </div>
            <div style="background-color: #F7FAFC; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Aura - Plataforma de Bienestar Mental Juvenil</p>
            </div>
          </div>
        `,
      };

    default:
      // Plantilla genérica para cualquier otro tipo de email
      return {
        subject: metadata?.subject || "Notificación de Aura",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4A5568;">${metadata?.title || 'Notificación'}</h2>
            <p>${cleanBody}</p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
            <p style="color: #718096; font-size: 12px;">Aura - Plataforma de Bienestar Mental Juvenil</p>
          </div>
        `,
      };
  }
}

// 📨 Función principal para enviar emails de forma dinámica
export async function sendEmail(
  to: string,
  type: string,
  body: string,
  metadata?: any
): Promise<void> {
  try {
    const template = getEmailTemplate(type, body, metadata);

    const mailOptions = {
      from: `"Aura - Plataforma de Bienestar Mental Juvenil" <${process.env.SMTP_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Service] Email tipo "${type}" enviado exitosamente a ${to}`);
  } catch (error) {
    console.error(`❌ [Email Service] Error enviando email tipo "${type}" a ${to}:`, error);
    throw error;
  }
}

// Mantener función legacy para compatibilidad (deprecated)
export async function sendResetCodeEmail(to: string, link: string): Promise<void> {
  await sendEmail(to, 'PASSWORD_RECOVERY', link);
}
