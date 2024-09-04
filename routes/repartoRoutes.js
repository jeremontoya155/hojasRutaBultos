const express = require('express');
const router = express.Router();
const repartoController = require('../controllers/repartoController');

// Ruta para ver todas las hojas de ruta
router.get('/view-all-routes', repartoController.viewAllRouteSheets);

// Ruta para actualizar la situación de una sucursal
router.post('/update-situacion-sucursal', repartoController.updateSituacionSucursal); // Ruta correcta

module.exports = router;
