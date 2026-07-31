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

    // 👇 Historial de actividad del usuario (eventos que no vienen
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

module.exports = mongoose.model("Usuario", usuarioSchema)