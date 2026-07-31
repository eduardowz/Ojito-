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

// Actualizar perfil del usuario
router.put("/:correo", async (req, res) => {

    try {

        const { nombre, correo, telefono, passwordHash } = req.body;

        const usuario = await Usuario.findOne({
            correo: req.params.correo.toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        // 👇 Nueva validación: evitar correo duplicado
        if (correo.toLowerCase() !== usuario.correo) {
            const correoExiste = await Usuario.findOne({
                correo: correo.toLowerCase()
            });

            if (correoExiste) {
                return res.status(400).json({
                    mensaje: "Ese correo ya está en uso por otra cuenta."
                });
            }
        }

        usuario.nombre = nombre;
        usuario.correo = correo.toLowerCase();
        usuario.telefono = telefono;

        if (passwordHash) {
            usuario.passwordHash = passwordHash;
        }

        await usuario.save();

        res.json({
            mensaje: "Perfil actualizado correctamente.",
            usuario: {
                nombre: usuario.nombre,
                correo: usuario.correo,
                telefono: usuario.telefono
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error al actualizar el perfil."
        });

    }

});

// 👇 Obtener el historial de actividad del usuario
router.get("/:correo/historial", async (req, res) => {

    try {

        const usuario = await Usuario.findOne({
            correo: req.params.correo.toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        res.json({
            historial: usuario.historial
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error al obtener el historial."
        });

    }

});

// 👇 Agregar un evento al historial de actividad del usuario
router.post("/:correo/historial", async (req, res) => {

    try {

        const { mensaje } = req.body;

        if (!mensaje || !mensaje.trim()) {
            return res.status(400).json({
                mensaje: "El evento debe incluir un mensaje."
            });
        }

        const usuario = await Usuario.findOne({
            correo: req.params.correo.toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        usuario.historial.unshift({
            mensaje: mensaje.trim(),
            fecha: new Date()
        });

        // Solo conservamos los últimos 30 eventos para no crecer sin límite
        usuario.historial = usuario.historial.slice(0, 30);

        await usuario.save();

        res.status(201).json({
            mensaje: "Evento agregado al historial.",
            historial: usuario.historial
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error al guardar el evento del historial."
        });

    }

});



module.exports = router;