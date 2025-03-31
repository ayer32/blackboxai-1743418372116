const express = require('express');
const router = express.Router({ mergeParams: true }); // Enable access to params from parent router
const {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerStats,
  updatePlayerStats
} = require('../controllers/playerController');
const { protect, authorize, isTeamManager } = require('../middleware/auth');
const { playerValidation, validate, queryValidation } = require('../utils/validator');

// Public routes
router.get('/', queryValidation.pagination, validate, getPlayers);
router.get('/:id', getPlayer);
router.get('/:id/stats', getPlayerStats);

// Protected routes
router.use(protect); // All routes below this will be protected

// Routes for Admin and Team Manager
router.post(
  '/',
  authorize('Admin', 'TeamManager'),
  playerValidation.create,
  validate,
  createPlayer
);

// Player-specific routes that require team manager authorization
router.put(
  '/:id',
  isTeamManager,
  playerValidation.update,
  validate,
  updatePlayer
);

router.put(
  '/:id/stats',
  isTeamManager,
  updatePlayerStats
);

// Admin and Team Manager can delete players
router.delete(
  '/:id',
  authorize('Admin', 'TeamManager'),
  isTeamManager,
  deletePlayer
);

// Advanced filtering routes
router.get(
  '/search/role/:role',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.playerType = req.params.role;
    next();
  },
  getPlayers
);

router.get(
  '/search/team/:teamId',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.team = req.params.teamId;
    next();
  },
  getPlayers
);

// Stats based routes
router.get(
  '/stats/top-scorers',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.sort = '-stats.batting.runs';
    next();
  },
  getPlayers
);

router.get(
  '/stats/top-wicket-takers',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.sort = '-stats.bowling.wickets';
    next();
  },
  getPlayers
);

router.get(
  '/stats/all-rounders',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.playerType = 'All-Rounder';
    req.query.sort = '-stats.batting.average,-stats.bowling.average';
    next();
  },
  getPlayers
);

// Performance analysis routes
router.get(
  '/analysis/batting-form',
  protect,
  authorize('Admin', 'TeamManager'),
  queryValidation.dateRange,
  validate,
  (req, res, next) => {
    // This will be handled in the controller to calculate recent form
    req.query.analysis = 'batting-form';
    next();
  },
  getPlayers
);

router.get(
  '/analysis/bowling-form',
  protect,
  authorize('Admin', 'TeamManager'),
  queryValidation.dateRange,
  validate,
  (req, res, next) => {
    // This will be handled in the controller to calculate recent form
    req.query.analysis = 'bowling-form';
    next();
  },
  getPlayers
);

module.exports = router;