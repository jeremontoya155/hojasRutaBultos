const express = require('express');
const router = express.Router();
const repartoController = require('../controllers/repartoController');

// Ruta para ver todas las hojas de ruta
router.get('/view-all-routes', repartoController.viewAllRouteSheets);

// Ruta para actualizar la situación de una sucursal
router.post('/update-situacion-sucursal', repartoController.updateSituacionSucursal);

// Ruta para confirmar entrega de una sucursal
router.post('/confirmar-entrega', repartoController.confirmarEntrega);

// Ruta para marcar una hoja de ruta como "En camino"
router.post('/marcar-en-camino/:routeSheetId', repartoController.marcarHojaEnCamino);

module.exports = router;
