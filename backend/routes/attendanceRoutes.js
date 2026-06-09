const router = require('express').Router();
const { getAttendance, markAttendance, getAttendanceSummary } = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getAttendance);
router.post('/', authorize('admin'), markAttendance);
router.get('/summary', authorize('admin'), getAttendanceSummary);

module.exports = router;
