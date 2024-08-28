const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/', adminController.getRouteSheets);  // Renderizar la vista de admin con las hojas de ruta

router.post('/create-route', adminController.createRouteSheet);
router.get('/edit-route/:id', adminController.editRouteSheet);
router.post('/update-route/:id', adminController.updateRouteSheet);
router.get('/send-route/:id', adminController.sendRouteSheet);
router.get('/receive-route/:id', adminController.receiveRouteSheet);
router.get('/view-route/:id', adminController.viewRouteSheet);
router.get('/load-route', adminController.loadRouteSheet);



module.exports = router;
