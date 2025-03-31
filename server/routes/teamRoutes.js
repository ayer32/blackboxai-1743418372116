const express = require('express');
const router = express.Router();
const {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamStats,
  addPlayer,
  removePlayer
} = require('../controllers/teamController');
const { protect, authorize, isTeamManager } = require('../middleware/auth');
const { teamValidation, validate, queryValidation } = require('../utils/validator');

// Public routes
router.get('/', queryValidation.pagination, validate, getTeams);
router.get('/:id', getTeam);
router.get('/:id/stats', getTeamStats);

// Protected routes
router.use(protect); // All routes below this will be protected

// Routes for Admin and Team Manager
router.post(
  '/',
  authorize('Admin', 'TeamManager'),
  teamValidation.create,
  validate,
  createTeam
);

// Team-specific routes that require team manager authorization
router.put(
  '/:id',
  isTeamManager,
  teamValidation.update,
  validate,
  updateTeam
);

// Player management routes
router.post(
  '/:id/players',
  isTeamManager,
  addPlayer
);

router.delete(
  '/:id/players/:playerId',
  isTeamManager,
  removePlayer
);

// Admin-only routes
router.delete(
  '/:id',
  authorize('Admin'),
  deleteTeam
);

module.exports = router;