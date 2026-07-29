const express = require("express");
const router = express.Router();

const Usuario = require("../models/Usuario");

// Ruta de prueba
router.get("/", (req, res) => {
    res.json({
        mensaje: "Ruta de usuarios funcionando"
    });
});

// Registrar usuario
router.post("/registro", async (req, res) => {

    try {

        const { nombre, correo, telefono, passwordHash } = req.body;

        // Verificar si ya existe
        const existe = await Usuario.findOne({
            correo: correo.toLowerCase()
        });

        if (existe) {
            return res.status(400).json({
                mensaje: "Ya existe una cuenta con ese correo."
            });
        }

        const nuevoUsuario = new Usuario({
            nombre,
            correo: correo.toLowerCase(),
            telefono,
            passwordHash
        });

        await nuevoUsuario.save();

        res.status(201).json({
            mensaje: "Usuario registrado correctamente."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

// Login de usuario
router.post("/login", async (req, res) => {

    try {

        const { correo, passwordHash } = req.body;

        const usuario = await Usuario.findOne({
            correo: correo.toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        if (usuario.passwordHash !== passwordHash) {
            return res.status(401).json({
                mensaje: "Contraseña incorrecta."
            });
        }

        res.json({
            mensaje: "Inicio de sesión correcto.",
            usuario: {
                nombre: usuario.nombre,
                correo: usuario.correo,
                telefono: usuario.telefono
            }
        });


    } catch(error){

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});



module.exports = router;