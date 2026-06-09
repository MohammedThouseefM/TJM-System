const router = require('express').Router();
const { getAllMembers, getMemberById, addMember, updateMember, deleteMember } = require('../controllers/memberController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getAllMembers);
router.get('/:id', getMemberById);
router.post('/', authorize('admin'), addMember);
router.put('/:id', authorize('admin'), updateMember);
router.delete('/:id', authorize('admin'), deleteMember);

module.exports = router;
