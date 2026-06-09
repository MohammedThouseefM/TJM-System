const router = require('express').Router();
const { getAllRoutes, getRouteById, addRoute, updateRoute, deleteRoute } = require('../controllers/routeController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getAllRoutes);
router.get('/:id', getRouteById);
router.post('/', authorize('admin', 'route_planner'), addRoute);
router.put('/:id', authorize('admin', 'route_planner'), updateRoute);
router.delete('/:id', authorize('admin', 'route_planner'), deleteRoute);

module.exports = router;
