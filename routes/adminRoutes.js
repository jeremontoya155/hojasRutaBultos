const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/', adminController.getRouteSheets);  // Renderizar la vista de admin con las hojas de ruta

router.post('/create-route', adminController.createRouteSheet);
router.get('/edit-route/:id', adminController.editRouteSheet);
router.post('/update-route/:id', adminController.updateRouteSheet);
router.get('/send-route/:id', adminController.sendRouteSheet);
router.get('/receive-route/:id', adminController.receiveRouteSheet);
router.get('/view-route/:id', adminController.viewRouteSheet); // Vista general de la hoja de ruta
router.get('/load-route', adminController.loadRouteSheet);
router.get('/view-route-general/:id', adminController.viewRouteSheetGeneral); // Resumen general
router.get('/route-detail/:id/:sucursal', adminController.viewRouteSheetDetail); // Detalle por sucursal

module.exports = router;
