const express = require("express");
const router = express.Router();

const Admin = require("../models/Admin");


// Ruta de prueba
router.get("/", (req, res) => {
    res.json({
        mensaje: "Ruta de administradores funcionando"
    });
});


// Login administrador
router.post("/login", async (req, res) => {

    try {

        const { correo, passwordHash } = req.body;


        const admin = await Admin.findOne({
            correo: correo.toLowerCase()
        });


        if (!admin) {
            return res.status(404).json({
                mensaje: "Administrador no encontrado."
            });
        }


        if (admin.passwordHash !== passwordHash) {
            return res.status(401).json({
                mensaje: "Contraseña incorrecta."
            });
        }


        res.json({

            mensaje: "Inicio de sesión correcto.",

            admin: {
                nombre: admin.nombre,
                correo: admin.correo,
                rol: admin.rol
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