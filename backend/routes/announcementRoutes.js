const router = require('express').Router();
const { getAnnouncements, addAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getAnnouncements);
router.post('/', authorize('admin'), addAnnouncement);
router.delete('/:id', authorize('admin'), deleteAnnouncement);

module.exports = router;
