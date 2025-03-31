const express = require('express');
const router = express.Router();
const {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  registerTeam,
  updateTeamStatus,
  getTournamentStats
} = require('../controllers/tournamentController');
const { protect, authorize, validateTournamentAccess } = require('../middleware/auth');
const { tournamentValidation, validate, queryValidation } = require('../utils/validator');

// Public routes
router.get('/', queryValidation.pagination, validate, getTournaments);
router.get('/:id', getTournament);
router.get('/:id/stats', getTournamentStats);

// Protected routes
router.use(protect); // All routes below this will be protected

// Admin only routes
router.post(
  '/',
  authorize('Admin'),
  tournamentValidation.create,
  validate,
  createTournament
);

router.put(
  '/:id',
  authorize('Admin'),
  tournamentValidation.update,
  validate,
  updateTournament
);

router.delete(
  '/:id',
  authorize('Admin'),
  deleteTournament
);

// Team registration routes
router.post(
  '/:id/teams',
  authorize('Admin', 'TeamManager'),
  validateTournamentAccess,
  registerTeam
);

router.put(
  '/:id/teams/:teamId',
  authorize('Admin'),
  validateTournamentAccess,
  updateTeamStatus
);

// Tournament status based routes
router.get(
  '/status/:status',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.status = req.params.status;
    next();
  },
  getTournaments
);

// Active tournaments route
router.get(
  '/active',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.status = 'Ongoing';
    next();
  },
  getTournaments
);

// Upcoming tournaments route
router.get(
  '/upcoming',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    const now = new Date();
    req.query.startDate = { $gt: now };
    req.query.sort = 'startDate';
    next();
  },
  getTournaments
);

// Registration open tournaments route
router.get(
  '/registration-open',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    const now = new Date();
    req.query.registrationDeadline = { $gt: now };
    req.query.status = 'Registration';
    next();
  },
  getTournaments
);

// Format based routes
router.get(
  '/format/:format',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.format = req.params.format;
    next();
  },
  getTournaments
);

// Date range based routes
router.get(
  '/schedule',
  queryValidation.dateRange,
  validate,
  (req, res, next) => {
    if (req.query.startDate) {
      req.query.startDate = { $gte: req.query.startDate };
    }
    if (req.query.endDate) {
      req.query.endDate = { $lte: req.query.endDate };
    }
    next();
  },
  getTournaments
);

// Team specific tournament routes
router.get(
  '/team/:teamId',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query['teams.team'] = req.params.teamId;
    next();
  },
  getTournaments
);

// Season based routes
router.get(
  '/season/:season',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.season = req.params.season;
    next();
  },
  getTournaments
);

// Points table route
router.get(
  '/:id/points-table',
  validateTournamentAccess,
  (req, res, next) => {
    req.query.includePointsTable = true;
    next();
  },
  getTournamentStats
);

// Tournament schedule route
router.get(
  '/:id/schedule',
  validateTournamentAccess,
  (req, res, next) => {
    req.query.includeSchedule = true;
    next();
  },
  getTournament
);

module.exports = router;