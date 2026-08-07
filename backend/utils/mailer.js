const nodemailer = require("nodemailer");

// Un solo transportador reutilizable para todo el backend.
//
// 👇 Timeouts explícitos: sin esto, si Gmail no responde (algo común
// en hosts como Render, que a veces limitan o bloquean SMTP saliente
// en el plan gratuito), Nodemailer puede tardar minutos en fallar por
// sí solo — y cualquier ruta que haga `await enviarCorreo(...)` se
// queda colgada todo ese tiempo sin responderle nada al navegador.
const transportador = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    },
    connectionTimeout: 10000, // 10s máximo para establecer la conexión
    greetingTimeout: 10000,   // 10s máximo para el saludo SMTP inicial
    socketTimeout: 15000      // 15s máximo de inactividad en el socket
});

/**
 * Envía un correo genérico.
 * @param {string} destinatario
 * @param {string} asunto
 * @param {string} html
 */
async function enviarCorreo(destinatario, asunto, html) {
    try {
        await transportador.sendMail({
            from: `"Juárez Observa" <${process.env.GMAIL_USER}>`,
            to: destinatario,
            subject: asunto,
            html
        });
        return true;
    } catch (error) {
        console.log("Error al enviar correo:", error);
        return false;
    }
}

// Plantilla específica para el código de recuperación
async function enviarCodigoRecuperacion(destinatario, codigo) {
    const html = `
        <div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto;">
            <h2 style="color:#3C3489;">Juárez Observa</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p>Tu código de verificación es:</p>
            <p style="font-size:28px; font-weight:bold; letter-spacing:4px; color:#0F6E56;">${codigo}</p>
            <p>Este código expira en 10 minutos. Si tú no solicitaste esto, ignora este correo.</p>
        </div>
    `;
    return enviarCorreo(destinatario, "Código de recuperación · Juárez Observa", html);
}

// Plantilla específica para verificar el correo al registrarse
async function enviarCodigoVerificacion(destinatario, codigo) {
    const html = `
        <div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto;">
            <h2 style="color:#3C3489;">Juárez Observa</h2>
            <p>¡Gracias por registrarte! Confirma tu correo para activar tu cuenta.</p>
            <p>Tu código de verificación es:</p>
            <p style="font-size:28px; font-weight:bold; letter-spacing:4px; color:#0F6E56;">${codigo}</p>
            <p>Este código expira en 10 minutos. Si tú no creaste esta cuenta, ignora este correo.</p>
        </div>
    `;
    return enviarCorreo(destinatario, "Verifica tu correo · Juárez Observa", html);
}

// Plantilla específica para cambio de estado de reporte
async function enviarCambioEstadoReporte(destinatario, categoria, nuevoEstado) {
    const html = `
        <div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto;">
            <h2 style="color:#3C3489;">Juárez Observa</h2>
            <p>Tu reporte de <strong>${categoria}</strong> cambió de estado a:</p>
            <p style="font-size:20px; font-weight:bold; color:#0F6E56;">${nuevoEstado}</p>
        </div>
    `;
    return enviarCorreo(destinatario, "Actualización de tu reporte · Juárez Observa", html);
}

module.exports = {
    enviarCorreo,
    enviarCodigoRecuperacion,
    enviarCodigoVerificacion,
    enviarCambioEstadoReporte
};