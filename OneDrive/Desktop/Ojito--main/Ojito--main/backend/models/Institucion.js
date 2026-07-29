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

    passwordHash: {
        type: String,
        required: true
    }

});


module.exports = mongoose.model(
    "Institucion",
    institucionSchema
);