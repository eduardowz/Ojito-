const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Institucion = require("../models/Institucion");
const Usuario = require("../models/Usuario");
const { enviarCodigoRecuperacion } = require("../utils/mailer");

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

router.post("/solicitar-recuperacion", async (req, res) => {

    try {

        const { correo } = req.body;

        const institucion = await Institucion.findOne({
            correo: (correo || "").toLowerCase()
        });

        if (!institucion) {
            return res.status(200).json({
                mensaje: "Si el correo existe, se envió un código de verificación."
            });
        }

        const codigo = String(Math.floor(100000 + Math.random() * 900000));

        institucion.codigoRecuperacion = codigo;
        institucion.codigoExpira = new Date(Date.now() + 10 * 60 * 1000);
        await institucion.save();

        enviarCodigoRecuperacion(institucion.correo, codigo).catch((error) => {
            console.log("Error al enviar correo de recuperación (institución):", error);
        });

        res.status(200).json({
            mensaje: "Código de verificación enviado a tu correo."
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error del servidor." });
    }

});

router.post("/verificar-codigo", async (req, res) => {

    try {

        const { correo, codigo } = req.body;

        const institucion = await Institucion.findOne({
            correo: (correo || "").toLowerCase()
        });

        if (!institucion || !institucion.codigoRecuperacion) {
            return res.status(400).json({
                mensaje: "Solicita un nuevo código de verificación."
            });
        }

        if (institucion.codigoExpira < new Date()) {
            return res.status(400).json({
                mensaje: "El código expiró. Solicita uno nuevo."
            });
        }

        if (institucion.codigoRecuperacion !== codigo) {
            return res.status(400).json({
                mensaje: "El código no es correcto."
            });
        }

        res.status(200).json({
            mensaje: "Código verificado correctamente."
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error del servidor." });
    }

});

router.post("/restablecer-password", async (req, res) => {

    try {

        const { correo, codigo, passwordHash } = req.body;

        const institucion = await Institucion.findOne({
            correo: (correo || "").toLowerCase()
        });

        if (!institucion || !institucion.codigoRecuperacion) {
            return res.status(400).json({
                mensaje: "Solicita un nuevo código de verificación."
            });
        }

        if (institucion.codigoExpira < new Date()) {
            return res.status(400).json({
                mensaje: "El código expiró. Solicita uno nuevo."
            });
        }

        if (institucion.codigoRecuperacion !== codigo) {
            return res.status(400).json({
                mensaje: "El código no es correcto."
            });
        }

        institucion.passwordHash = passwordHash;
        institucion.codigoRecuperacion = null;
        institucion.codigoExpira = null;
        await institucion.save();

        res.status(200).json({
            mensaje: "Contraseña actualizada correctamente."
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error del servidor." });
    }

});

module.exports = router;
