const express = require("express");
const router = express.Router();

const Institucion = require("../models/Institucion");
const Usuario = require("../models/Usuario");

// Ruta de prueba
router.get("/", (req, res) => {
    res.json({
        mensaje: "Ruta de instituciones funcionando"
    });
});



// Registrar institución
router.post("/registro", async (req, res) => {

    try {

        const {
            nombreInstitucion,
            tipo,
            rfc,
            correo,
            passwordHash
        } = req.body;

        // Verificar correo
        const correoExiste = await Institucion.findOne({
            correo: correo.toLowerCase()
        });

        if (correoExiste) {
            return res.status(400).json({
                mensaje: "Ya existe una institución con ese correo."
            });
        }

        const usuarioExiste = await Usuario.findOne({
            correo: correo.toLowerCase()
        });

        if (usuarioExiste) {
            return res.status(400).json({
                mensaje: "Ese correo ya está registrado como cuenta ciudadana."
            });
        }

        // Verificar RFC
        const rfcExiste = await Institucion.findOne({
            rfc
        });

        if (rfcExiste) {
            return res.status(400).json({
                mensaje: "Ya existe una institución con ese RFC."
            });
        }

        const nuevaInstitucion = new Institucion({
            nombre: nombreInstitucion,
            tipo,
            rfc,
            correo: correo.toLowerCase(),
            passwordHash
        });

        await nuevaInstitucion.save();

        res.status(201).json({
            mensaje: "Institución registrada correctamente."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

// Login institución
router.post("/login", async (req, res) => {

    try {

        const { correo, passwordHash } = req.body;

        const institucion = await Institucion.findOne({
            correo: correo.toLowerCase()
        });

        if (!institucion) {
            return res.status(404).json({
                mensaje: "Institución no encontrada."
            });
        }

        if (institucion.passwordHash !== passwordHash) {
            return res.status(401).json({
                mensaje: "Contraseña incorrecta."
            });
        }

        res.json({
            mensaje: "Inicio de sesión correcto.",
            institucion: {
                nombreInstitucion: institucion.nombre,
                tipo: institucion.tipo,
                rfc: institucion.rfc,
                correo: institucion.correo
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

module.exports = router;