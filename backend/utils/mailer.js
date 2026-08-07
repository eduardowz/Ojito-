const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function enviarCorreo(destinatario, asunto, html) {
    try {
        const respuesta = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "api-key": process.env.BREVO_API_KEY
            },
            body: JSON.stringify({
                sender: {
                    name: "Juárez Observa",
                    email: process.env.BREVO_SENDER_EMAIL
                },
                to: [{ email: destinatario }],
                subject: asunto,
                htmlContent: html
            })
        });

        if (!respuesta.ok) {
            const error = await respuesta.text();
            throw new Error(`Brevo respondió ${respuesta.status}: ${error}`);
        }

        return true;
    } catch (error) {
        console.log("Error al enviar correo:", error);
        return false;
    }
}

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
