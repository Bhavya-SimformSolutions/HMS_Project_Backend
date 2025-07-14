import express  from 'express';
import { addService, getServices } from '../../controllers/services.controller';
import { verifyJWT } from '../../middlewares/jwt.middleware';
import { checkAccess } from '../../middlewares/authentication.middleware';

const router = express.Router();

router.post('/', verifyJWT, checkAccess('ADMIN'), addService);
router.get('/', verifyJWT, checkAccess('ADMIN'), getServices);

export default router; 