const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");
const Reporte = require("../models/Reporte");
const authAdmin = require("../middleware/authAdmin");

const Usuario = require("../models/Usuario");
const Institucion = require("../models/Institucion");

const Categoria = require("../models/Categoria");
const Parametros = require("../models/parametros");

router.get("/", (req, res) => {
    res.json({ mensaje: "Ruta de administradores funcionando" });
});

// Login administrador
router.post("/login", async (req, res) => {

    try {

        const { correo, passwordHash } = req.body;

        const admin = await Admin.findOne({ correo: correo.toLowerCase() });

        if (!admin) {
            return res.status(404).json({ mensaje: "Administrador no encontrado." });
        }

        if (admin.passwordHash !== passwordHash) {
            return res.status(401).json({ mensaje: "Contraseña incorrecta." });
        }

        const token = jwt.sign(
            {
                id: admin._id,
                correo: admin.correo,
                rol: "administrador"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            mensaje: "Inicio de sesión correcto.",
            token,
            admin: {
                nombre: admin.nombre,
                correo: admin.correo,
                rol: admin.rol
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error del servidor." });
    }

});

// ══════════════════════════════════════════════════════════════
// GESTIÓN DE REPORTES (admin) — sin restricción de institución,
// a diferencia de las rutas equivalentes en reporteRoutes.js
// ══════════════════════════════════════════════════════════════

// Obtener TODOS los reportes, sin filtrar por institución
router.get("/reportes", authAdmin, async (req, res) => {

    try {
        const reportes = await Reporte.find()
            .populate("ciudadano", "nombre correo")
            .sort({ createdAt: -1 });

        res.json(reportes);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener los reportes." });
    }

});

// Cambiar estado de cualquier reporte (sin validar dueño, el admin puede todo)
router.put("/reportes/:id/estado", authAdmin, async (req, res) => {

    try {

        const { id } = req.params;
        const { estado, progreso } = req.body;

        const ESTADOS_VALIDOS = ["pendiente", "revision", "resuelto"];
        if (!ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({ mensaje: "Estado no válido." });
        }

        const reporte = await Reporte.findById(id);
        if (!reporte) {
            return res.status(404).json({ mensaje: "Reporte no encontrado." });
        }

        reporte.estado = estado;
        if (progreso !== undefined) reporte.progreso = progreso;

        if (estado === "resuelto" && !reporte.fechaResolucion) {
            reporte.fechaResolucion = new Date();
        }

        await reporte.save();

        res.json({ mensaje: "Estado actualizado correctamente.", reporte });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar el estado." });
    }

});

// Reasignar institución de un reporte
router.put("/reportes/:id/institucion", authAdmin, async (req, res) => {

    try {

        const { id } = req.params;
        const { institucion } = req.body;

        const reporte = await Reporte.findById(id);
        if (!reporte) {
            return res.status(404).json({ mensaje: "Reporte no encontrado." });
        }

        reporte.institucion = institucion || "";
        await reporte.save();

        res.json({ mensaje: "Institución reasignada correctamente.", reporte });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al reasignar la institución." });
    }

});

// Eliminar cualquier reporte, sin restricción de estado (el admin sí puede aunque no esté "pendiente")
router.delete("/reportes/:id", authAdmin, async (req, res) => {

    try {

        const { id } = req.params;

        const reporte = await Reporte.findByIdAndDelete(id);
        if (!reporte) {
            return res.status(404).json({ mensaje: "Reporte no encontrado." });
        }

        res.json({ mensaje: "Reporte eliminado correctamente." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al eliminar el reporte." });
    }

});

// ══════════════════════════════════════════════════════════════
// GESTIÓN DE USUARIOS (ciudadanos) — solo administrador
// ══════════════════════════════════════════════════════════════

router.get("/usuarios", authAdmin, async (req, res) => {
    try {
        const usuarios = await Usuario.find().sort({ createdAt: -1 });
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener usuarios." });
    }
});

router.put("/usuarios/:id", authAdmin, async (req, res) => {
    try {
        const { nombre, correo, telefono } = req.body;

        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado." });
        }

        if (correo && correo.toLowerCase() !== usuario.correo) {
            const existe = await Usuario.findOne({ correo: correo.toLowerCase() });
            if (existe) {
                return res.status(400).json({ mensaje: "Ese correo ya está en uso por otra cuenta." });
            }
            usuario.correo = correo.toLowerCase();
        }

        if (nombre) usuario.nombre = nombre;
        if (telefono) usuario.telefono = telefono;

        await usuario.save();
        res.json({ mensaje: "Usuario actualizado correctamente.", usuario });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar el usuario." });
    }
});

router.put("/usuarios/:id/estado", authAdmin, async (req, res) => {
    try {
        const { estado } = req.body;
        if (!["Activo", "Suspendido"].includes(estado)) {
            return res.status(400).json({ mensaje: "Estado no válido." });
        }

        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado." });
        }

        usuario.estado = estado;
        await usuario.save();

        res.json({ mensaje: "Estado actualizado correctamente.", usuario });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar el estado." });
    }
});

router.delete("/usuarios/:id", authAdmin, async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndDelete(req.params.id);
        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado." });
        }
        res.json({ mensaje: "Usuario eliminado correctamente." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al eliminar el usuario." });
    }
});

router.post("/usuarios", authAdmin, async (req, res) => {
    try {
        const { nombre, correo, telefono, passwordHash } = req.body;

        const existe = await Usuario.findOne({ correo: correo.toLowerCase() });
        if (existe) {
            return res.status(400).json({ mensaje: "Ya existe una cuenta con ese correo." });
        }

        const nuevoUsuario = new Usuario({
            nombre,
            correo: correo.toLowerCase(),
            telefono,
            passwordHash
        });

        await nuevoUsuario.save();
        res.status(201).json({ mensaje: "Usuario creado correctamente.", usuario: nuevoUsuario });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al crear el usuario." });
    }
});

// ══════════════════════════════════════════════════════════════
// GESTIÓN DE INSTITUCIONES — solo administrador
// ══════════════════════════════════════════════════════════════

router.get("/instituciones", authAdmin, async (req, res) => {
    try {
        const instituciones = await Institucion.find().sort({ createdAt: -1 });
        res.json(instituciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener instituciones." });
    }
});

router.put("/instituciones/:id", authAdmin, async (req, res) => {
    try {
        const { nombre, correo, tipo, rfc } = req.body;

        const institucion = await Institucion.findById(req.params.id);
        if (!institucion) {
            return res.status(404).json({ mensaje: "Institución no encontrada." });
        }

        if (correo && correo.toLowerCase() !== institucion.correo) {
            const existe = await Institucion.findOne({ correo: correo.toLowerCase() });
            if (existe) {
                return res.status(400).json({ mensaje: "Ese correo ya está en uso por otra institución." });
            }
            institucion.correo = correo.toLowerCase();
        }

        if (nombre) institucion.nombre = nombre;
        if (tipo) institucion.tipo = tipo;
        if (rfc) institucion.rfc = rfc;

        await institucion.save();
        res.json({ mensaje: "Institución actualizada correctamente.", institucion });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar la institución." });
    }
});

router.put("/instituciones/:id/estado", authAdmin, async (req, res) => {
    try {
        const { estado } = req.body;
        if (!["Activa", "Suspendida"].includes(estado)) {
            return res.status(400).json({ mensaje: "Estado no válido." });
        }

        const institucion = await Institucion.findById(req.params.id);
        if (!institucion) {
            return res.status(404).json({ mensaje: "Institución no encontrada." });
        }

        institucion.estado = estado;
        await institucion.save();

        res.json({ mensaje: "Estado actualizado correctamente.", institucion });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar el estado." });
    }
});

router.delete("/instituciones/:id", authAdmin, async (req, res) => {
    try {
        const institucion = await Institucion.findByIdAndDelete(req.params.id);
        if (!institucion) {
            return res.status(404).json({ mensaje: "Institución no encontrada." });
        }
        res.json({ mensaje: "Institución eliminada correctamente." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al eliminar la institución." });
    }
});

router.post("/instituciones", authAdmin, async (req, res) => {
    try {
        const { nombre, correo, tipo, rfc, passwordHash } = req.body;

        const existe = await Institucion.findOne({ correo: correo.toLowerCase() });
        if (existe) {
            return res.status(400).json({ mensaje: "Ya existe una institución con ese correo." });
        }

        const nuevaInstitucion = new Institucion({
            nombre, tipo, rfc,
            correo: correo.toLowerCase(),
            passwordHash
        });

        await nuevaInstitucion.save();
        res.status(201).json({ mensaje: "Institución creada correctamente.", institucion: nuevaInstitucion });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al crear la institución." });
    }
});

// ══════════════════════════════════════════════════════════════
// GESTIÓN DE CATEGORÍAS — solo administrador
// ══════════════════════════════════════════════════════════════

function generarClave(nombre) {
    return nombre
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

router.post("/categorias", authAdmin, async (req, res) => {
    try {
        const { nombre, color, icono, institucion } = req.body;

        if (!nombre || !institucion) {
            return res.status(400).json({ mensaje: "Nombre e institución son obligatorios." });
        }

        const clave = generarClave(nombre);

        const existe = await Categoria.findOne({ clave });
        if (existe) {
            return res.status(400).json({ mensaje: "Ya existe una categoría con un nombre muy similar." });
        }

        const nuevaCategoria = new Categoria({
            nombre, clave, color: color || "#5b5870",
            icono: icono || "generico", institucion
        });

        await nuevaCategoria.save();
        res.status(201).json({ mensaje: "Categoría creada correctamente.", categoria: nuevaCategoria });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al crear la categoría." });
    }
});

// Nota: la "clave" NUNCA se edita aquí a propósito — es lo que mantiene
// la relación con los reportes ya existentes.
router.put("/categorias/:id", authAdmin, async (req, res) => {
    try {
        const { nombre, color, icono, institucion } = req.body;

        const categoria = await Categoria.findById(req.params.id);
        if (!categoria) {
            return res.status(404).json({ mensaje: "Categoría no encontrada." });
        }

        if (nombre) categoria.nombre = nombre;
        if (color) categoria.color = color;
        if (icono) categoria.icono = icono;
        if (institucion) categoria.institucion = institucion;

        await categoria.save();
        res.json({ mensaje: "Categoría actualizada correctamente.", categoria });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar la categoría." });
    }
});

router.delete("/categorias/:id", authAdmin, async (req, res) => {
    try {
        const categoria = await Categoria.findByIdAndDelete(req.params.id);
        if (!categoria) {
            return res.status(404).json({ mensaje: "Categoría no encontrada." });
        }
        res.json({ mensaje: "Categoría eliminada correctamente." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al eliminar la categoría." });
    }
});

// ══════════════════════════════════════════════════════════════
// PARÁMETROS DEL SISTEMA
// ══════════════════════════════════════════════════════════════

// GET pública — login.html y registro.html la necesitan SIN estar
// autenticados como admin (por eso no lleva authAdmin aquí).
router.get("/parametros", async (req, res) => {
    try {
        let parametros = await Parametros.findOne();
        if (!parametros) {
            parametros = await Parametros.create({});
        }
        res.json(parametros);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener los parámetros." });
    }
});

router.put("/parametros", authAdmin, async (req, res) => {
    try {
        let parametros = await Parametros.findOne();
        if (!parametros) parametros = new Parametros({});

        const campos = ["nombrePlataforma","correoSoporte","tiempoLimiteHoras","intentosCaptcha","mantenimiento","registroAbierto","notifCorreo"];
        campos.forEach(c => {
            if (req.body[c] !== undefined) parametros[c] = req.body[c];
        });

        await parametros.save();
        res.json({ mensaje: "Parámetros actualizados correctamente.", parametros });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar los parámetros." });
    }
});


module.exports = router;