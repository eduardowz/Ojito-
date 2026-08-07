const mongoose = require("mongoose");

// Este modelo está pensado como un documento único (singleton):
// siempre se usa Parametros.findOne(), y si no existe se crea con
// los valores por defecto de aquí abajo. No lleva un campo tipo
// "activo" ni índices especiales porque nunca debe haber más de
// un documento de parámetros en la colección.
const parametrosSchema = new mongoose.Schema(
    {
        nombrePlataforma: {
            type: String,
            default: "Juárez Observa",
        },
        correoSoporte: {
            type: String,
            default: "soporte@juarezobserva.mx",
        },
        tiempoLimiteHoras: {
            type: Number,
            default: 72,
        },
        intentosCaptcha: {
            type: Number,
            default: 3,
        },
        mantenimiento: {
            type: Boolean,
            default: false,
        },
        registroAbierto: {
            type: Boolean,
            default: true,
        },
        notifCorreo: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Parametros", parametrosSchema);