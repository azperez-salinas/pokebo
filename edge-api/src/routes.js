//responsabilidades de 

const express = require("express");

const router = express.Router();

const v1Router = require("./routes/v1");
const appConfigRouter = require("./routes/appConfig.routes");

// Rutas versionadas
router.use("/api/v1", v1Router);

// Ruta global, independiente de la versión
router.use("/api/app-config", appConfigRouter);

module.exports = router;
