const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/', adminController.getRouteSheets);
router.post('/create-route', adminController.createRouteSheet);
router.get('/edit-route/:id', adminController.editRouteSheet);
router.post('/update-route/:id', adminController.updateRouteSheet);
router.get('/send-route/:id', adminController.sendRouteSheet);
router.get('/receive-route/:id', adminController.receiveRouteSheet);
router.get('/view-route/:id', adminController.viewRouteSheet);
router.get('/load-route', adminController.loadRouteSheet);
router.get('/view-route-general/:id', adminController.viewRouteSheetGeneral);
router.get('/route-detail/:id/:sucursal', adminController.viewRouteSheetDetail);
router.get('/edit-route-detail/:id/:sucursal', adminController.editRouteSheetDetail);  // Ruta para editar detalles de una sucursal
router.post('/update-route-detail/:id/:sucursal', adminController.updateRouteSheetDetail); // Ruta para actualizar detalles de una sucursal

module.exports = router;

