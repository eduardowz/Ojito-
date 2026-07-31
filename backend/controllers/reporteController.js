const Reporte = require("../models/Reporte");
const Usuario = require("../models/Usuario");

const TIPO_A_INSTITUCION = {
    bache: "Obras Públicas",
    alumbrado: "Alumbrado Público",
    basura: "Servicios de Limpia",
    seguridad: "Policía Municipal",
    incendio: "Bomberos",
    vandalismo: "Policía Municipal",
};

// Registrar un nuevo reporte
exports.crearReporte = async (req, res) => {

    try {

        const {
            correo,
            tipo,
            descripcion,
            direccion,
            latitud,
            longitud,
            urgencia,
            foto
        } = req.body;

        // Buscar al ciudadano por su correo
        const usuario = await Usuario.findOne({
            correo: correo.toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "El ciudadano no existe."
            });
        }

        const nuevoReporte = new Reporte({

            ciudadano: usuario._id,

            tipo,
            descripcion,
            direccion,

            latitud,
            longitud,

            urgencia,

            foto: foto || "",

            // NUEVO: se asigna la institución automáticamente según el tipo
            institucion: TIPO_A_INSTITUCION[tipo] || ""

        });

        await nuevoReporte.save();

        res.status(201).json({
            mensaje: "Reporte registrado correctamente.",
            reporte: nuevoReporte
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al registrar el reporte."
        });

    }

};

// Obtener todos los reportes
exports.obtenerReportes = async (req, res) => {

    try {

        const reportes = await Reporte.find()
            .populate("ciudadano", "nombre correo")
            .sort({ createdAt: -1 });

        res.json(reportes);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al obtener los reportes."
        });

    }

};

// Actualizar reporte (uso del CIUDADANO, solo mientras está pendiente)
exports.actualizarReporte = async (req, res) => {

    try {

        const { id } = req.params;

        const reporte = await Reporte.findById(id);

        if (!reporte) {
            return res.status(404).json({
                mensaje: "Reporte no encontrado."
            });
        }


        // Solo permitir modificar si está pendiente
        if (reporte.estado !== "pendiente") {

            return res.status(400).json({
                mensaje: "El reporte ya está siendo atendido y no puede modificarse."
            });

        }


        const {
            tipo,
            descripcion,
            direccion,
            latitud,
            longitud,
            urgencia
        } = req.body;

        if (tipo !== undefined) reporte.tipo = tipo;
        if (descripcion !== undefined) reporte.descripcion = descripcion;
        if (direccion !== undefined) reporte.direccion = direccion;
        if (latitud !== undefined) reporte.latitud = latitud;
        if (longitud !== undefined) reporte.longitud = longitud;
        if (urgencia !== undefined) reporte.urgencia = urgencia;

        // Si el ciudadano cambia el tipo, se recalcula la institución
        if (tipo !== undefined) {
            reporte.institucion = TIPO_A_INSTITUCION[tipo] || reporte.institucion;
        }


        await reporte.save();


        res.json({
            mensaje: "Reporte actualizado correctamente.",
            reporte
        });


    } catch(error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al actualizar reporte."
        });

    }

};


// ══════════════════════════════════════════════════════════════
// NUEVO: Actualizar estado y progreso (uso de INSTITUCIÓN)
// Separado de actualizarReporte porque ese está bloqueado a
// reportes "pendiente" y no acepta estado/progreso en absoluto.
// ══════════════════════════════════════════════════════════════
exports.actualizarEstadoInstitucion = async (req, res) => {

    try {

        const { id } = req.params;
        const { estado, progreso } = req.body;

        const ESTADOS_VALIDOS = ["pendiente", "revision", "resuelto"];

        if (!ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({
                mensaje: "Estado no válido."
            });
        }

        const reporte = await Reporte.findById(id);

        if (!reporte) {
            return res.status(404).json({
                mensaje: "Reporte no encontrado."
            });
        }

        reporte.estado = estado;

        if (progreso !== undefined) {
            reporte.progreso = progreso;
        }

        await reporte.save();

        res.json({
            mensaje: "Estado del reporte actualizado correctamente.",
            reporte
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al actualizar el estado del reporte."
        });

    }

};


// ══════════════════════════════════════════════════════════════
// NUEVO: Agregar avance a la bitácora (texto y/o foto de evidencia)
// Uso de INSTITUCIÓN, para dar transparencia al ciudadano de que
// su reporte sí se está atendiendo.
// ══════════════════════════════════════════════════════════════
exports.agregarBitacora = async (req, res) => {

    try {

        const { id } = req.params;
        const { texto, foto, autor } = req.body;

        if (!texto && !foto) {
            return res.status(400).json({
                mensaje: "Agrega un texto o una foto de evidencia."
            });
        }

        const reporte = await Reporte.findByIdAndUpdate(
            id,
            {
                $push: {
                    bitacora: {
                        texto: texto || "",
                        foto: foto || "",
                        autor: autor || "Institución",
                        fecha: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!reporte) {
            return res.status(404).json({
                mensaje: "Reporte no encontrado."
            });
        }

        res.json({
            mensaje: "Avance registrado correctamente.",
            reporte
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al agregar el avance."
        });

    }

};


// Eliminar reporte
exports.eliminarReporte = async (req, res) => {

    try {

        const { id } = req.params;


        const reporte = await Reporte.findById(id);


        if (!reporte) {

            return res.status(404).json({
                mensaje: "Reporte no encontrado."
            });

        }


        if (reporte.estado !== "pendiente") {

            return res.status(400).json({
                mensaje: "No puedes cancelar un reporte que ya está en proceso."
            });

        }


        await Reporte.findByIdAndDelete(id);


        res.json({
            mensaje: "Reporte eliminado correctamente."
        });


    } catch(error) {

        console.error(error);


        res.status(500).json({
            mensaje: "Error al eliminar reporte."
        });

    }

};