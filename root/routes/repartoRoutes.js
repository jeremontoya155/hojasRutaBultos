const express = require('express');
const router = express.Router();
const repartoController = require('../controllers/repartoController');
const roleMiddleware = require('../middlewares/authMiddleware');


// Solo los usuarios con el rol "reparto" pueden acceder a estas rutas
router.get('/view-all-routes', roleMiddleware(['reparto']), repartoController.viewAllRouteSheets);
router.post('/update-situacion-sucursal', roleMiddleware(['reparto']), repartoController.updateSituacionSucursal);
router.post('/confirmar-entrega', roleMiddleware(['reparto']), repartoController.confirmarEntrega);
router.post('/marcar-en-camino/:routeSheetId', roleMiddleware(['reparto']), repartoController.marcarHojaEnCamino);

module.exports = router;
