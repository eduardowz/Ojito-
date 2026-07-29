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
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Usuario", usuarioSchema);