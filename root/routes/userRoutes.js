const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const roleMiddleware = require('../middlewares/authMiddleware');


// Solo los usuarios con el rol "user" pueden acceder a estas rutas
router.get('/', roleMiddleware(['user']), userController.getUserRouteSheets);
router.get('/view-route/:id', roleMiddleware(['user']), userController.viewRouteSheet);
router.post('/mark-received/:id', roleMiddleware(['user']), userController.markAsReceived);
router.post('/scan-code/:id', roleMiddleware(['user']), userController.scanAndMarkReceived);

module.exports = router;