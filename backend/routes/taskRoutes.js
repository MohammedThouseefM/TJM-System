const router = require('express').Router();
const { getTasks, getTaskMatrix, assignTask, addTask, updateTask, updateTaskStatus, deleteTask } = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getTasks);
router.get('/matrix', getTaskMatrix);
router.post('/', authorize('admin'), addTask);
router.post('/assign', authorize('admin'), assignTask);
router.put('/:id', authorize('admin'), updateTask);
router.patch('/:id/status', updateTaskStatus); // All can update status of assigned tasks
router.delete('/:id', authorize('admin'), deleteTask);

module.exports = router;
