const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },

    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    telefono: {
        type: String,
        required: true
    },

    passwordHash: {
        type: String,
        required: true
    },

    rol: {
        type: String,
        default: "ciudadano"
    },

    estado: {
        type: String,
        enum: ["Activo", "Suspendido"],
        default: "Activo"
    },

    // 👇 NUEVO: verificación de correo al registrarse
    verificado: {
        type: Boolean,
        default: false
    },

    codigoVerificacion: {
        type: String,
        default: null
    },

    codigoVerificacionExpira: {
        type: Date,
        default: null
    },

    // Recuperación de contraseña real
    codigoRecuperacion: {
        type: String,
        default: null
    },

    codigoExpira: {
        type: Date,
        default: null
    },

    // Historial de actividad del usuario (eventos que no vienen
    // implícitos de la colección de reportes, como eliminaciones)
    historial: [{
        mensaje: {
            type: String,
            required: true
        },
        fecha: {
            type: Date,
            default: Date.now
        }
    }]

}, {
    timestamps: true
});

module.exports = mongoose.model("Usuario", usuarioSchema);