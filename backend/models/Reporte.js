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
    },

    // ══════════════════════════════════════════════════════════
    // NUEVO: bitácora de avances de la institución.
    // Cada entrada puede traer texto, foto de evidencia, o ambos.
    // Sirve para que la ciudadanía vea que sí se está trabajando
    // el reporte y no solo un cambio de estado sin sustento.
    // ══════════════════════════════════════════════════════════
    bitacora: [{
        texto: {
            type: String,
            default: ""
        },
        foto: {
            type: String,
            default: ""
        },
        autor: {
            type: String,
            default: "Institución"
        },
        fecha: {
            type: Date,
            default: Date.now
        },
        fechaResolucion: {
            type: Date,
            default: null
        }
    }]

}, {
    timestamps: true
});

module.exports = mongoose.model("Reporte", reporteSchema);