const router = require('express').Router();
const ctrl = require('../controllers/financeController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Transactions
router.get('/transactions', ctrl.getTransactions);
router.post('/transactions', authorize('admin','accountant'), ctrl.addTransaction);
router.delete('/transactions/:id', authorize('admin','accountant'), ctrl.deleteTransaction);
router.get('/receipt/:id', ctrl.getReceipt);

// Balances
router.get('/balances', ctrl.getAllMembersBalances);
router.get('/balance/:userId', ctrl.getMemberBalance);

// Treasury
router.get('/treasury', ctrl.getTreasuryBalance);
router.post('/transfer', authorize('admin'), ctrl.treasuryTransfer);

// Daily + Export
router.get('/daily', ctrl.getDailyExpenses);
router.get('/export', authorize('admin','accountant'), ctrl.exportFinance);

// Approvals
router.get('/approvals', authorize('admin','accountant'), ctrl.getApprovals);
router.post('/approvals/:id', authorize('admin','accountant'), ctrl.processApproval);

// Planned expenses
router.get('/planned', ctrl.getPlannedExpenses);
router.post('/planned', authorize('admin','accountant'), ctrl.addPlannedExpense);
router.patch('/planned/:id', authorize('admin','accountant'), ctrl.updatePlannedExpense);

// Settings
router.get('/settings', ctrl.getSettings);
router.put('/settings', authorize('admin'), ctrl.updateSettings);

module.exports = router;
