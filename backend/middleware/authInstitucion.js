const jwt = require("jsonwebtoken");

function authInstitucion(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ mensaje: "No autorizado. Falta token." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (payload.rol !== "institucion") {
            return res.status(403).json({ mensaje: "No tienes permisos de institución." });
        }

        req.institucion = payload;
        next();

    } catch (error) {
        return res.status(401).json({ mensaje: "Token inválido o expirado." });
    }

}

module.exports = authInstitucion;