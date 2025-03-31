const { body, param, query, validationResult } = require('express-validator');

// Validation result middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// User validation rules
const userValidation = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters long')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers and underscores'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    body('role')
      .optional()
      .isIn(['Admin', 'TeamManager', 'Viewer'])
      .withMessage('Invalid role specified')
  ],
  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ]
};

// Team validation rules
const teamValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Team name must be at least 2 characters long'),
    body('shortName')
      .trim()
      .isLength({ min: 2, max: 4 })
      .withMessage('Short name must be between 2 and 4 characters')
      .matches(/^[A-Za-z]+$/)
      .withMessage('Short name can only contain letters'),
    body('manager.name')
      .trim()
      .notEmpty()
      .withMessage('Manager name is required'),
    body('manager.contact')
      .trim()
      .notEmpty()
      .withMessage('Manager contact is required'),
    body('homeGround')
      .trim()
      .notEmpty()
      .withMessage('Home ground is required')
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid team ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Team name must be at least 2 characters long'),
    body('shortName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 4 })
      .withMessage('Short name must be between 2 and 4 characters')
      .matches(/^[A-Za-z]+$/)
      .withMessage('Short name can only contain letters')
  ]
};

// Player validation rules
const playerValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Player name is required'),
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Invalid date format')
      .custom(value => {
        const age = Math.floor((new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 15) throw new Error('Player must be at least 15 years old');
        return true;
      }),
    body('playerType')
      .isIn(['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'])
      .withMessage('Invalid player type'),
    body('battingStyle')
      .isIn(['Right Handed', 'Left Handed'])
      .withMessage('Invalid batting style'),
    body('bowlingStyle')
      .isIn(['Right Arm Fast', 'Right Arm Medium', 'Right Arm Off-Spin', 
             'Left Arm Fast', 'Left Arm Medium', 'Left Arm Spin', 'None'])
      .withMessage('Invalid bowling style'),
    body('jerseyNumber')
      .isInt({ min: 0 })
      .withMessage('Jersey number must be a positive integer')
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid player ID')
  ]
};

// Match validation rules
const matchValidation = {
  create: [
    body('matchNumber')
      .isInt({ min: 1 })
      .withMessage('Match number must be a positive integer'),
    body('matchType')
      .isIn(['League', 'Quarter Final', 'Semi Final', 'Final'])
      .withMessage('Invalid match type'),
    body('teams.team1')
      .isMongoId()
      .withMessage('Invalid team 1 ID'),
    body('teams.team2')
      .isMongoId()
      .withMessage('Invalid team 2 ID')
      .custom((value, { req }) => {
        if (value === req.body.teams.team1) {
          throw new Error('Team 1 and Team 2 cannot be the same');
        }
        return true;
      }),
    body('venue.ground')
      .trim()
      .notEmpty()
      .withMessage('Venue ground is required'),
    body('schedule.startDate')
      .isISO8601()
      .withMessage('Invalid start date format')
      .custom(value => {
        if (new Date(value) < new Date()) {
          throw new Error('Start date cannot be in the past');
        }
        return true;
      }),
    body('overs')
      .isInt({ min: 1 })
      .withMessage('Overs must be a positive integer')
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid match ID'),
    body('matchType')
      .optional()
      .isIn(['League', 'Quarter Final', 'Semi Final', 'Final'])
      .withMessage('Invalid match type'),
    body('venue.ground')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Venue ground is required'),
    body('schedule.startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format')
      .custom(value => {
        if (new Date(value) < new Date()) {
          throw new Error('Start date cannot be in the past');
        }
        return true;
      }),
    body('overs')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Overs must be a positive integer')
  ],
  updateScore: [
    param('id')
      .isMongoId()
      .withMessage('Invalid match ID'),
    body('innings.*.totalRuns')
      .isInt({ min: 0 })
      .withMessage('Total runs must be a non-negative integer'),
    body('innings.*.wickets')
      .isInt({ min: 0, max: 10 })
      .withMessage('Wickets must be between 0 and 10'),
    body('innings.*.overs')
      .isFloat({ min: 0 })
      .withMessage('Overs must be a non-negative number')
  ]
};

// Tournament validation rules
const tournamentValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Tournament name is required'),
    body('shortName')
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage('Short name must be between 2 and 10 characters'),
    body('format')
      .isIn(['T20', 'ODI', 'Test', 'Custom'])
      .withMessage('Invalid tournament format'),
    body('startDate')
      .isISO8601()
      .withMessage('Invalid start date format')
      .custom(value => {
        if (new Date(value) < new Date()) {
          throw new Error('Start date cannot be in the past');
        }
        return true;
      }),
    body('endDate')
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('registrationDeadline')
      .isISO8601()
      .withMessage('Invalid registration deadline format')
      .custom((value, { req }) => {
        if (new Date(value) >= new Date(req.body.startDate)) {
          throw new Error('Registration deadline must be before start date');
        }
        return true;
      })
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid tournament ID')
  ]
};

// Query validation rules
const queryValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
  ]
};

module.exports = {
  validate,
  userValidation,
  teamValidation,
  playerValidation,
  matchValidation,
  tournamentValidation,
  queryValidation
};