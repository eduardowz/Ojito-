const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
})
.catch((err) => {
    console.error("❌ Error al conectar:", err);
});

// 👇 Importar las rutas
const usuarioRoutes = require("./routes/usuarioRoutes");
const institucionRoutes = require("./routes/institucionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reporteRoutes = require("./routes/reporteRoutes");
const categoriaRoutes = require("./routes/categoriaRoutes");
const parametrosRoutes = require("./routes/Parametrosroutes"); 

// 👇 Usar las rutas
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/instituciones", institucionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/parametros", parametrosRoutes); 

// Ruta principal
app.get("/", (req, res) => {
    res.send("Servidor funcionando");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});