// routes/inventoryRoutes.js — Module 8: Inventory & Stock Management
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

// F-8.2: Low-Stock Warning Alert — dentist/receptionist can view, so put before the CRUD guard
router.get('/items/low-stock', inventoryController.getLowStockItems);

// F-8.1/F-8.3: any authenticated staff can view stock; only admin manages it
router.get('/items', inventoryController.getItems);
router.get('/items/:id', inventoryController.getItemById);

router.post('/items', authorizeRoles('admin'), inventoryController.createItem);
router.put('/items/:id', authorizeRoles('admin'), inventoryController.updateItem);
router.delete('/items/:id', authorizeRoles('admin'), inventoryController.deleteItem);
router.patch('/items/:id/restock', authorizeRoles('admin', 'receptionist'), inventoryController.restockItem);

module.exports = router;
