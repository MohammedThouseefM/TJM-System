const router = require('express').Router();
const { getDashboardData } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getDashboardData);

module.exports = router;
