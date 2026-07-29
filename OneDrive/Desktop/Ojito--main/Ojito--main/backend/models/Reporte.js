const mongoose = require("mongoose");

const reporteSchema = new mongoose.Schema({

    ciudadano: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },

    tipo: {
        type: String,
        required: true
    },

    descripcion: {
        type: String,
        required: true
    },

    direccion: {
        type: String,
        default: ""
    },

    latitud: {
        type: Number,
        required: true
    },

    longitud: {
        type: Number,
        required: true
    },

    urgencia: {
        type: String,
        enum: ["alta", "media", "baja"],
        default: "media"
    },

    foto: {
        type: String,
        default: ""
    },

    estado: {
        type: String,
        enum: ["pendiente", "revision", "resuelto"],
        default: "pendiente"
    },

    institucion: {
        type: String,
        default: ""
    },

    progreso: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Reporte", reporteSchema);