const router = require('express').Router();
const { getMeals, addMeal, updateMeal, deleteMeal } = require('../controllers/mealController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getMeals);
router.post('/', authorize('admin'), addMeal);
router.put('/:id', authorize('admin'), updateMeal);
router.delete('/:id', authorize('admin'), deleteMeal);

module.exports = router;
