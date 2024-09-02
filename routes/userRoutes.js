const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Ruta para obtener las hojas de ruta asignadas al usuario
router.get('/', userController.getUserRouteSheets);

// Ruta para ver los detalles de una hoja de ruta específica
router.get('/view-route/:id', userController.viewRouteSheet);

// Ruta para marcar una hoja de ruta como recibida
router.post('/mark-received/:id', userController.markAsReceived);

module.exports = router;
