const express = require("express");
const router = express.Router();

const Parametros = require("../models/parametros");

console.log("Parametros es:", Parametros); 

// Obtener los parámetros (documento único / singleton).
// Si todavía no existe ninguno en la base de datos, se crea
// automáticamente con los valores por defecto del modelo.
router.get("/", async (req, res) => {

    try {

        let parametros = await Parametros.findOne();

        if (!parametros) {
            parametros = await Parametros.create({});
        }

        res.json(parametros);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error al obtener los parámetros."
        });

    }

});

// Actualizar los parámetros (para un futuro panel de administración).
// Acepta cualquier subconjunto de los campos del modelo.
router.put("/", async (req, res) => {

    try {

        let parametros = await Parametros.findOne();

        if (!parametros) {
            parametros = new Parametros({});
        }

        const campos = [
            "nombrePlataforma",
            "correoSoporte",
            "tiempoLimiteHoras",
            "intentosCaptcha",
            "mantenimiento",
            "registroAbierto",
            "notifCorreo"
        ];

        campos.forEach((campo) => {
            if (req.body[campo] !== undefined) {
                parametros[campo] = req.body[campo];
            }
        });

        await parametros.save();

        res.json({
            mensaje: "Parámetros actualizados correctamente.",
            parametros
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error al actualizar los parámetros."
        });

    }

});

module.exports = router;