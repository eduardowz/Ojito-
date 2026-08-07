const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Institucion = require("../models/Institucion");
const Usuario = require("../models/Usuario");

router.get("/", (req, res) => {
    res.json({ mensaje: "Ruta de instituciones funcionando" });
});

router.post("/registro", async (req, res) => {

    try {

        const { nombreInstitucion, tipo, rfc, correo, passwordHash } = req.body;

        const correoExiste = await Institucion.findOne({ correo: correo.toLowerCase() });
        if (correoExiste) {
            return res.status(400).json({ mensaje: "Ya existe una institución con ese correo." });
        }

        const usuarioExiste = await Usuario.findOne({ correo: correo.toLowerCase() });
        if (usuarioExiste) {
            return res.status(400).json({ mensaje: "Ese correo ya está registrado como cuenta ciudadana." });
        }

        const rfcExiste = await Institucion.findOne({ rfc });
        if (rfcExiste) {
            return res.status(400).json({ mensaje: "Ya existe una institución con ese RFC." });
        }

        const nuevaInstitucion = new Institucion({
            nombre: nombreInstitucion,
            tipo,
            rfc,
            correo: correo.toLowerCase(),
            passwordHash
        });

        await nuevaInstitucion.save();

        res.status(201).json({ mensaje: "Institución registrada correctamente." });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error del servidor." });
    }

});

router.post("/login", async (req, res) => {

    try {

        const { correo, passwordHash } = req.body;

        const institucion = await Institucion.findOne({ correo: correo.toLowerCase() });

        if (!institucion) {
            return res.status(404).json({ mensaje: "Institución no encontrada." });
        }

        if (institucion.estado === "Suspendida") {
            return res.status(403).json({
                mensaje: "Esta cuenta institucional ha sido suspendida. Contacta al administrador."
            });
        }

        if (institucion.passwordHash !== passwordHash) {
            return res.status(401).json({ mensaje: "Contraseña incorrecta." });
        }

        const token = jwt.sign(
            {
                id: institucion._id,
                tipo: institucion.tipo,
                correo: institucion.correo,
                rol: "institucion"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            mensaje: "Inicio de sesión correcto.",
            token,
            institucion: {
                nombreInstitucion: institucion.nombre,
                tipo: institucion.tipo,
                rfc: institucion.rfc,
                correo: institucion.correo
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error del servidor." });
    }

});

module.exports = router;