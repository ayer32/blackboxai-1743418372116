const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'User account is deactivated'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error in authentication'
    });
  }
};

// Middleware for role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Middleware to check if user is a team manager and has access to specific team
const isTeamManager = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Team ID is required'
      });
    }

    // Admin has access to all teams
    if (req.user.role === 'Admin') {
      return next();
    }

    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if user is the team manager
    if (team.manager.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to manage this team'
      });
    }

    req.team = team;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error checking team manager authorization'
    });
  }
};

// Middleware to validate tournament access
const validateTournamentAccess = async (req, res, next) => {
  try {
    const tournamentId = req.params.tournamentId || req.body.tournamentId;
    
    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    // Admin has access to all tournaments
    if (req.user.role === 'Admin') {
      return next();
    }

    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // For team managers, check if their team is part of the tournament
    if (req.user.role === 'TeamManager') {
      const hasAccess = tournament.teams.some(team => 
        team.team.toString() === req.team._id.toString() && 
        team.status === 'Approved'
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this tournament'
        });
      }
    }

    req.tournament = tournament;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error checking tournament access'
    });
  }
};

module.exports = {
  protect,
  authorize,
  isTeamManager,
  validateTournamentAccess
};