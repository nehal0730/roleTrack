import { Router } from 'express';
import { getProjectReport, getEmployeeReport, getOverviewReport } from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/overview',         authorize('admin'), getOverviewReport);
router.get('/project/:id',      authorize('admin','project_manager'), getProjectReport);
router.get('/employee/:id',     authorize('admin','project_manager'), getEmployeeReport);

export default router;