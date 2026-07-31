const express = require("express");
const router = express.Router();

const reporteController = require("../controllers/reporteController");

router.post("/", reporteController.crearReporte);

router.get("/", reporteController.obtenerReportes);

// Actualizar reporte (ciudadano, solo mientras está pendiente)
router.put("/:id", reporteController.actualizarReporte);

// NUEVO — Actualizar estado/progreso (institución)
router.put("/:id/estado", reporteController.actualizarEstadoInstitucion);

// NUEVO — Agregar avance a la bitácora: texto y/o foto de evidencia (institución)
router.post("/:id/bitacora", reporteController.agregarBitacora);

// Eliminar reporte
router.delete("/:id", reporteController.eliminarReporte);

module.exports = router;