const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/my-routes', userController.getUserRouteSheets);
router.get('/view-route/:id', userController.viewRouteSheet);
router.get('/mark-received/:id', userController.markAsReceived);  // Nueva ruta para marcar como recibido

module.exports = router;
