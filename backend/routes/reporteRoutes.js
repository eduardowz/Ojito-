const express = require("express");
const router = express.Router();

const reporteController = require("../controllers/reporteController");
const authInstitucion = require("../middleware/authInstitucion");
const authCiudadano = require("../middleware/authCiudadano");

router.post("/", reporteController.crearReporte);
router.get("/", reporteController.obtenerReportes);
router.get("/:id", reporteController.obtenerReportePorId);

router.put("/:id", authCiudadano, reporteController.actualizarReporte);
router.put("/:id/estado", authInstitucion, reporteController.actualizarEstadoInstitucion);
router.post("/:id/bitacora", authInstitucion, reporteController.agregarBitacora);

router.delete("/:id", authCiudadano, reporteController.eliminarReporte);

module.exports = router;