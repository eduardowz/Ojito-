require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const Admin = require("../models/Admin");

// Mismo algoritmo que hashPassword() en el navegador (SHA-256 sobre UTF-8),
// para que el hash generado aquí coincida con el que produciría el login real.
function hashPasswordServidor(password) {
    return crypto.createHash("sha256").update(password, "utf8").digest("hex");
}

async function main() {
    const [, , nombre, correo, password] = process.argv;

    if (!nombre || !correo || !password) {
        console.log("Uso: node scripts/seedAdmin.js \"Nombre Admin\" correo@ejemplo.com MiClaveSegura123");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    const existe = await Admin.findOne({ correo: correo.toLowerCase() });
    if (existe) {
        console.log("❌ Ya existe un administrador con ese correo.");
        await mongoose.disconnect();
        process.exit(1);
    }

    const passwordHash = hashPasswordServidor(password);

    const admin = new Admin({
        nombre,
        correo: correo.toLowerCase(),
        passwordHash
    });

    await admin.save();

    console.log("✅ Administrador creado correctamente:", admin.correo);
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});