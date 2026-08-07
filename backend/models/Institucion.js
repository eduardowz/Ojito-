const mongoose = require("mongoose");

const institucionSchema = new mongoose.Schema({

    nombre: {
        type: String,
        required: true
    },

    correo: {
        type: String,
        required: true,
        unique: true
    },

    rfc: {
    type: String,
    required: true,
    unique: true
    },

    tipo: {
        type: String,
        required: true
    },

    estado: {
        type: String,
        enum: ["Activa", "Suspendida"],
        default: "Activa"
    },

    passwordHash: {
        type: String,
        required: true
    }

}, { timestamps: true });


module.exports = mongoose.model(
    "Institucion",
    institucionSchema
);