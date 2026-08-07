const express = require("express");
const router = express.Router();

const Categoria = require("../models/Categoria");

// ══════════════════════════════════════════════════════════════
// Estas 6 son las claves que YA usan tus reportes existentes
// (r.tipo === "bache", "alumbrado", etc.). No las cambies aquí:
// si lo haces, tus reportes viejos dejan de encontrar categoría.
// El "nombre" sí lo puede editar el admin después desde el panel.
// ══════════════════════════════════════════════════════════════
const CATEGORIAS_INICIALES = [
  { nombre: "Baches",            clave: "bache",      color: "#993C1D", icono: "bache",      institucion: "Obras Públicas" },
  { nombre: "Alumbrado público", clave: "alumbrado",  color: "#B08900", icono: "alumbrado",  institucion: "Alumbrado Público" },
  { nombre: "Basura acumulada",  clave: "basura",     color: "#185FA5", icono: "basura",     institucion: "Servicios de Limpia" },
  { nombre: "Seguridad",         clave: "seguridad",  color: "#3C3489", icono: "seguridad",  institucion: "Policía Municipal" },
  { nombre: "Incendio",          clave: "incendio",   color: "#a32d2d", icono: "incendio",   institucion: "Bomberos" },
  { nombre: "Vandalismo",        clave: "vandalismo", color: "#444444", icono: "vandalismo", institucion: "Policía Municipal" },
];

// GET /api/categorias — pública, la usa tanto el ciudadano (para el
// formulario de nuevo reporte) como el admin (para listarlas).
router.get("/", async (req, res) => {
  try {
    let categorias = await Categoria.find().sort({ nombre: 1 });

    if (categorias.length === 0) {
      categorias = await Categoria.insertMany(CATEGORIAS_INICIALES);
    }

    res.json(categorias);

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener las categorías." });
  }
});

module.exports = router;