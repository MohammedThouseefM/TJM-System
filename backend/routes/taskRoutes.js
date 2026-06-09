const router = require('express').Router();
const { getTasks, addTask, updateTask, updateTaskStatus, deleteTask } = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getTasks);
router.post('/', authorize('admin'), addTask);
router.put('/:id', authorize('admin'), updateTask);
router.patch('/:id/status', updateTaskStatus); // All can update status of assigned tasks
router.delete('/:id', authorize('admin'), deleteTask);

module.exports = router;
