const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const roleMiddleware = require('../middlewares/authMiddleware');

// Solo los usuarios con el rol "admin" pueden acceder a estas rutas
router.get('/', roleMiddleware(['admin']), adminController.getRouteSheets);
router.post('/create-route', roleMiddleware(['admin']), adminController.createRouteSheet);
router.get('/edit-route/:id', roleMiddleware(['admin']), adminController.editRouteSheet);
router.post('/update-route/:id', roleMiddleware(['admin']), adminController.updateRouteSheet);
router.get('/send-route/:id', roleMiddleware(['admin']), adminController.sendRouteSheet);
router.get('/receive-route/:id', roleMiddleware(['admin']), adminController.receiveRouteSheet);
router.get('/view-route/:id', roleMiddleware(['admin']), adminController.viewRouteSheet);
router.get('/load-route', roleMiddleware(['admin']), adminController.loadRouteSheet);
router.get('/view-route-general/:id', roleMiddleware(['admin']), adminController.viewRouteSheetGeneral);
router.get('/route-detail/:id/:sucursal', roleMiddleware(['admin']), adminController.viewRouteSheetDetail);
router.get('/edit-route-detail/:id/:sucursal', roleMiddleware(['admin']), adminController.editRouteSheetDetail);
router.post('/update-route-detail/:id/:sucursal', roleMiddleware(['admin']), adminController.updateRouteSheetDetail);
router.get('/edit-route-advanced/:id', roleMiddleware(['admin']), adminController.editRouteSheetAdvanced);
router.post('/update-route-advanced/:id', roleMiddleware(['admin']), adminController.updateRouteSheetAdvanced);

module.exports = router;
