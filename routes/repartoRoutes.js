const express = require('express');
const router = express.Router();
const repartoController = require('../controllers/repartoController');

// Definición de la ruta para ver todas las hojas de ruta
router.get('/view-all-routes', repartoController.viewAllRouteSheets);

module.exports = router;
