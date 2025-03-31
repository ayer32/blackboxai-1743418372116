const express = require('express');
const router = express.Router();
const {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  updateScore,
  getMatchStats
} = require('../controllers/matchController');
const { protect, authorize, validateTournamentAccess } = require('../middleware/auth');
const { matchValidation, validate, queryValidation } = require('../utils/validator');

// Public routes
router.get('/', queryValidation.pagination, validate, getMatches);
router.get('/:id', getMatch);
router.get('/:id/stats', getMatchStats);

// Protected routes
router.use(protect); // All routes below this will be protected

// Admin only routes
router.post(
  '/',
  authorize('Admin'),
  matchValidation.create,
  validate,
  createMatch
);

router.put(
  '/:id',
  authorize('Admin'),
  matchValidation.update,
  validate,
  updateMatch
);

router.delete(
  '/:id',
  authorize('Admin'),
  deleteMatch
);

// Score update routes (Admin only)
router.put(
  '/:id/score',
  authorize('Admin'),
  matchValidation.updateScore,
  validate,
  updateScore
);

// Tournament specific match routes
router.get(
  '/tournament/:tournamentId',
  validateTournamentAccess,
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.tournament = req.params.tournamentId;
    next();
  },
  getMatches
);

// Team specific match routes
router.get(
  '/team/:teamId',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.teams = { $in: [req.params.teamId] };
    next();
  },
  getMatches
);

// Date range match routes
router.get(
  '/schedule',
  queryValidation.dateRange,
  validate,
  (req, res, next) => {
    if (req.query.startDate) {
      req.query['schedule.startDate'] = { $gte: req.query.startDate };
      delete req.query.startDate;
    }
    if (req.query.endDate) {
      req.query['schedule.startDate'] = { 
        ...req.query['schedule.startDate'],
        $lte: req.query.endDate 
      };
      delete req.query.endDate;
    }
    next();
  },
  getMatches
);

// Status based routes
router.get(
  '/status/:status',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.status = req.params.status;
    next();
  },
  getMatches
);

// Live matches route
router.get(
  '/live',
  (req, res, next) => {
    req.query.status = 'In Progress';
    next();
  },
  getMatches
);

// Recent matches route
router.get(
  '/recent',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.status = 'Completed';
    req.query.sort = '-schedule.startDate';
    next();
  },
  getMatches
);

// Upcoming matches route
router.get(
  '/upcoming',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.status = 'Scheduled';
    req.query.sort = 'schedule.startDate';
    req.query['schedule.startDate'] = { $gte: new Date() };
    next();
  },
  getMatches
);

// Match type based routes
router.get(
  '/type/:matchType',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query.matchType = req.params.matchType;
    next();
  },
  getMatches
);

// Venue based routes
router.get(
  '/venue/:venue',
  queryValidation.pagination,
  validate,
  (req, res, next) => {
    req.query['venue.ground'] = req.params.venue;
    next();
  },
  getMatches
);

module.exports = router;