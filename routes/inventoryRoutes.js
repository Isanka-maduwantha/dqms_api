const express = require('express');

const router = express.Router();

const {
  authenticateToken,
} = require('../middleware/auth');

const {
  authorizeRole,
} = require('../middleware/authorizeRole');

const inventoryController =
  require('../controllers/inventoryController');


/**
 * ==========================================================
 * INVENTORY ROUTES
 * ==========================================================
 *
 * INVENTORY ACCESS:
 *
 * ADMIN
 * -----
 * - View inventory
 * - Add inventory items
 * - Edit inventory items
 * - Restock inventory
 * - Manually remove stock
 *
 * DENTIST
 * -------
 * - View inventory
 * - Cannot add/edit/restock inventory
 * - Treatment-based material deduction will be handled
 *   through the dentist treatment workflow.
 *
 * RECEPTIONIST
 * ------------
 * - No inventory access for now.
 *
 * ==========================================================
 */


/**
 * ==========================================================
 * CREATE INVENTORY ITEM
 * ==========================================================
 *
 * ADMIN ONLY
 *
 * POST /api/inventory/items
 * ==========================================================
 */
router.post(
  '/items',
  authenticateToken,
  authorizeRole('admin'),
  inventoryController.createInventoryItem
);


/**
 * ==========================================================
 * GET INVENTORY ITEMS
 * ==========================================================
 *
 * ADMIN + DENTIST
 *
 * GET /api/inventory/items
 *
 * Optional query parameters:
 *
 * ?category=ORTHODONTIC
 * ?search=bracket
 * ?lowStock=true
 * ?includeInactive=true
 * ==========================================================
 */
router.get(
  '/items',
  authenticateToken,
  authorizeRole('admin', 'dentist'),
  inventoryController.getInventoryItems
);


/**
 * ==========================================================
 * GET SINGLE INVENTORY ITEM
 * ==========================================================
 *
 * ADMIN + DENTIST
 *
 * GET /api/inventory/items/:itemId
 * ==========================================================
 */
router.get(
  '/items/:itemId',
  authenticateToken,
  authorizeRole('admin', 'dentist'),
  inventoryController.getInventoryItem
);


/**
 * ==========================================================
 * UPDATE INVENTORY ITEM DETAILS
 * ==========================================================
 *
 * ADMIN ONLY
 *
 * PUT /api/inventory/items/:itemId
 * ==========================================================
 */
router.put(
  '/items/:itemId',
  authenticateToken,
  authorizeRole('admin'),
  inventoryController.updateInventoryItem
);


/**
 * ==========================================================
 * UPDATE STOCK
 * ==========================================================
 *
 * ADMIN ONLY
 *
 * PATCH /api/inventory/items/:itemId/stock
 *
 * ADD:
 *
 * {
 *   "quantity": 50,
 *   "operation": "ADD"
 * }
 *
 * REMOVE:
 *
 * {
 *   "quantity": 5,
 *   "operation": "REMOVE"
 * }
 *
 * Dentist treatment deductions will NOT use this endpoint
 * directly. Those will be handled automatically by the
 * treatment workflow.
 * ==========================================================
 */
router.patch(
  '/items/:itemId/stock',
  authenticateToken,
  authorizeRole('admin'),
  inventoryController.updateStock
);


module.exports = router;