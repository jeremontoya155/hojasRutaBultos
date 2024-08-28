const express = require('express');
const router = express.Router();
const repartoController = require('../controllers/repartoController');

router.get('/view-all-routes', repartoController.viewAllRouteSheets);

module.exports = router;
