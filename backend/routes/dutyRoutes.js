const router = require('express').Router();
const { getDutyRoster, assignDuty, generateRotation, updateDutyStatus, deleteDuty } = require('../controllers/dutyController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getDutyRoster);
router.post('/', authorize('admin'), assignDuty);
router.post('/generate', authorize('admin'), generateRotation);
router.patch('/:id/status', updateDutyStatus);
router.delete('/:id', authorize('admin'), deleteDuty);

module.exports = router;
