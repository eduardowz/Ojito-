const mongoose = require("mongoose");

const categoriaSchema = new mongoose.Schema({

    nombre: {
        type: String,
        required: true
    },

    clave: {
        type: String,
        required: true,
        unique: true
    },

    color: {
        type: String,
        required: true,
        default: "#5b5870"
    },

    icono: {
        type: String,
        required: true,
        default: "generico"
    },

    institucion: {
        type: String,
        required: true
    },

    estado: {
        type: String,
        enum: ["activa", "suspendida"],
        default: "activa"
    }

}, { timestamps: true });

module.exports = mongoose.model("Categoria", categoriaSchema);
