const jwt = require("jsonwebtoken");

function authAdmin(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ mensaje: "No autorizado. Falta token." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (payload.rol !== "administrador") {
            return res.status(403).json({ mensaje: "No tienes permisos de administrador." });
        }

        req.admin = payload;
        next();

    } catch (error) {
        return res.status(401).json({ mensaje: "Token inválido o expirado." });
    }

}

module.exports = authAdmin;