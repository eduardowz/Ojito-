const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Usuario = require("../models/Usuario");
const Parametros = require("../models/Parametros"); // ⚠️ ajusta el nombre/ruta si es distinto en tu proyecto
const { enviarCodigoRecuperacion, enviarCodigoVerificacion } = require("../utils/mailer");
const authCiudadano = require("../middleware/authCiudadano");

// Ruta de prueba
router.get("/", (req, res) => {
    res.json({
        mensaje: "Ruta de usuarios funcionando"
    });
});

// Registrar usuario
router.post("/registro", async (req, res) => {

    try {

        // Bloquear si el registro está cerrado
        const parametros = await Parametros.findOne();
        if (parametros && parametros.registroAbierto === false) {
            return res.status(403).json({
                mensaje: "El registro de nuevas cuentas está cerrado temporalmente."
            });
        }

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

        const codigo = String(Math.floor(100000 + Math.random() * 900000));

        const nuevoUsuario = new Usuario({
            nombre,
            correo: correo.toLowerCase(),
            telefono,
            passwordHash,
            verificado: false,
            codigoVerificacion: codigo,
            codigoVerificacionExpira: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
        });

        await nuevoUsuario.save();

        const enviado = await enviarCodigoVerificacion(nuevoUsuario.correo, codigo);

        if (!enviado) {
            return res.status(201).json({
                mensaje: "Cuenta creada, pero no se pudo enviar el correo de verificación. Intenta reenviarlo más tarde."
            });
        }

        res.status(201).json({
            mensaje: "Cuenta creada. Revisa tu correo para verificar tu cuenta."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

// Verificar código de registro y activar la cuenta
router.post("/verificar-registro", async (req, res) => {

    try {

        const { correo, codigo } = req.body;

        const usuario = await Usuario.findOne({
            correo: (correo || "").toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        if (usuario.verificado) {
            return res.status(200).json({
                mensaje: "Esta cuenta ya estaba verificada."
            });
        }

        if (!usuario.codigoVerificacion || !usuario.codigoVerificacionExpira) {
            return res.status(400).json({
                mensaje: "Solicita un nuevo código de verificación."
            });
        }

        if (usuario.codigoVerificacionExpira < new Date()) {
            return res.status(400).json({
                mensaje: "El código expiró. Solicita uno nuevo."
            });
        }

        if (usuario.codigoVerificacion !== codigo) {
            return res.status(400).json({
                mensaje: "El código no es correcto."
            });
        }

        usuario.verificado = true;
        usuario.codigoVerificacion = null;
        usuario.codigoVerificacionExpira = null;
        await usuario.save();

        res.status(200).json({
            mensaje: "Cuenta verificada correctamente. Ya puedes iniciar sesión."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

// Reenviar código de verificación
router.post("/reenviar-verificacion", async (req, res) => {

    try {

        const { correo } = req.body;

        const usuario = await Usuario.findOne({
            correo: (correo || "").toLowerCase()
        });

        if (!usuario) {
            return res.status(200).json({
                mensaje: "Si la cuenta existe y no ha sido verificada, se envió un nuevo código."
            });
        }

        if (usuario.verificado) {
            return res.status(200).json({
                mensaje: "Esta cuenta ya está verificada."
            });
        }

        const codigo = String(Math.floor(100000 + Math.random() * 900000));

        usuario.codigoVerificacion = codigo;
        usuario.codigoVerificacionExpira = new Date(Date.now() + 10 * 60 * 1000);
        await usuario.save();

        await enviarCodigoVerificacion(usuario.correo, codigo);

        res.status(200).json({
            mensaje: "Se envió un nuevo código de verificación a tu correo."
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

        if (usuario.estado === "Suspendido") {
            return res.status(403).json({
                mensaje: "Tu cuenta ha sido suspendida. Contacta al soporte."
            });
        }

        if (!usuario.verificado) {
            return res.status(403).json({
                mensaje: "Debes verificar tu correo antes de iniciar sesión.",
                requiereVerificacion: true
            });
        }

        if (usuario.passwordHash !== passwordHash) {
            return res.status(401).json({
                mensaje: "Contraseña incorrecta."
            });
        }

        // Emitir JWT para que el backend pueda validar quién hace
        // las peticiones posteriores (editar perfil, historial, reportes propios)
        const token = jwt.sign(
            {
                correo: usuario.correo,
                nombre: usuario.nombre,
                rol: "ciudadano"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            mensaje: "Inicio de sesión correcto.",
            token,
            usuario: {
                nombre: usuario.nombre,
                correo: usuario.correo,
                telefono: usuario.telefono
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

// Paso 1 — solicitar código de recuperación
router.post("/solicitar-recuperacion", async (req, res) => {

    try {

        const { correo } = req.body;

        const usuario = await Usuario.findOne({
            correo: (correo || "").toLowerCase()
        });

        if (!usuario) {
            return res.status(200).json({
                mensaje: "Si el correo existe, se envió un código de verificación."
            });
        }

        const codigo = String(Math.floor(100000 + Math.random() * 900000));

        usuario.codigoRecuperacion = codigo;
        usuario.codigoExpira = new Date(Date.now() + 10 * 60 * 1000);
        await usuario.save();

        const enviado = await enviarCodigoRecuperacion(usuario.correo, codigo);

        if (!enviado) {
            return res.status(500).json({
                mensaje: "No se pudo enviar el correo. Intenta de nuevo más tarde."
            });
        }

        res.status(200).json({
            mensaje: "Código de verificación enviado a tu correo."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

// Paso 2 — verificar código
router.post("/verificar-codigo", async (req, res) => {

    try {

        const { correo, codigo } = req.body;

        const usuario = await Usuario.findOne({
            correo: (correo || "").toLowerCase()
        });

        if (!usuario || !usuario.codigoRecuperacion) {
            return res.status(400).json({
                mensaje: "Solicita un nuevo código de verificación."
            });
        }

        if (usuario.codigoExpira < new Date()) {
            return res.status(400).json({
                mensaje: "El código expiró. Solicita uno nuevo."
            });
        }

        if (usuario.codigoRecuperacion !== codigo) {
            return res.status(400).json({
                mensaje: "El código no es correcto."
            });
        }

        res.status(200).json({
            mensaje: "Código verificado correctamente."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

// Paso 3 — restablecer contraseña
router.post("/restablecer-password", async (req, res) => {

    try {

        const { correo, codigo, passwordHash } = req.body;

        const usuario = await Usuario.findOne({
            correo: (correo || "").toLowerCase()
        });

        if (!usuario || !usuario.codigoRecuperacion) {
            return res.status(400).json({
                mensaje: "Solicita un nuevo código de verificación."
            });
        }

        if (usuario.codigoExpira < new Date()) {
            return res.status(400).json({
                mensaje: "El código expiró. Solicita uno nuevo."
            });
        }

        if (usuario.codigoRecuperacion !== codigo) {
            return res.status(400).json({
                mensaje: "El código no es correcto."
            });
        }

        usuario.passwordHash = passwordHash;
        usuario.codigoRecuperacion = null;
        usuario.codigoExpira = null;
        await usuario.save();

        res.status(200).json({
            mensaje: "Contraseña actualizada correctamente."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor."
        });

    }

});

// Actualizar perfil del usuario
router.put("/:correo", authCiudadano, async (req, res) => {

    try {

        if (req.usuario.correo !== req.params.correo.toLowerCase()) {
            return res.status(403).json({
                mensaje: "No puedes modificar una cuenta que no es tuya."
            });
        }

        const { nombre, correo, telefono, passwordHash } = req.body;

        const usuario = await Usuario.findOne({
            correo: req.params.correo.toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        // Evitar correo duplicado
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

// Obtener el historial de actividad del usuario
router.get("/:correo/historial", authCiudadano, async (req, res) => {

    try {

        if (req.usuario.correo !== req.params.correo.toLowerCase()) {
            return res.status(403).json({
                mensaje: "No puedes ver el historial de otra cuenta."
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

// Agregar un evento al historial de actividad del usuario
router.post("/:correo/historial", authCiudadano, async (req, res) => {

    try {

        if (req.usuario.correo !== req.params.correo.toLowerCase()) {
            return res.status(403).json({
                mensaje: "No puedes escribir en el historial de otra cuenta."
            });
        }

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