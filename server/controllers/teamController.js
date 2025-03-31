const Team = require('../models/Team');
const Player = require('../models/Player');
const ErrorResponse = require('../utils/errorResponse');
const emailService = require('../utils/emailService');

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
exports.getTeams = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(field => delete queryObj[field]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    let query = Team.find(JSON.parse(queryStr));

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Team.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const teams = await query.populate('players');

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: teams.length,
      pagination,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Public
exports.getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).populate('players');

    if (!team) {
      return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new team
// @route   POST /api/teams
// @access  Private (Admin & TeamManager)
exports.createTeam = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.manager.userId = req.user.id;

    // Check for existing team
    const existingTeam = await Team.findOne({ name: req.body.name });

    if (existingTeam) {
      return next(new ErrorResponse(`Team already exists with name ${req.body.name}`, 400));
    }

    const team = await Team.create(req.body);

    // Send notification email to team manager
    try {
      await emailService.sendTeamUpdateNotification(
        team,
        'Team Creation',
        'Your team has been successfully created.'
      );
    } catch (error) {
      console.error('Team creation notification email could not be sent', error);
    }

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private (Admin & Team Manager)
exports.updateTeam = async (req, res, next) => {
  try {
    let team = await Team.findById(req.params.id);

    if (!team) {
      return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is team manager or admin
    if (req.user.role !== 'Admin' && 
        team.manager.userId.toString() !== req.user.id.toString()) {
      return next(new ErrorResponse('Not authorized to update this team', 403));
    }

    team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Send notification email
    try {
      await emailService.sendTeamUpdateNotification(
        team,
        'Team Update',
        'Your team details have been updated.'
      );
    } catch (error) {
      console.error('Team update notification email could not be sent', error);
    }

    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private (Admin only)
exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
    }

    // Delete associated players
    await Player.deleteMany({ team: req.params.id });

    await team.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team statistics
// @route   GET /api/teams/:id/stats
// @access  Public
exports.getTeamStats = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).populate('players');

    if (!team) {
      return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
    }

    const stats = {
      totalPlayers: team.players.length,
      matchStats: team.stats,
      winPercentage: team.winPercentage,
      playerCategories: {
        batsmen: team.players.filter(p => p.playerType === 'Batsman').length,
        bowlers: team.players.filter(p => p.playerType === 'Bowler').length,
        allRounders: team.players.filter(p => p.playerType === 'All-Rounder').length,
        wicketKeepers: team.players.filter(p => p.playerType === 'Wicket-Keeper').length
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add player to team
// @route   POST /api/teams/:id/players
// @access  Private (Admin & Team Manager)
exports.addPlayer = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is team manager or admin
    if (req.user.role !== 'Admin' && 
        team.manager.userId.toString() !== req.user.id.toString()) {
      return next(new ErrorResponse('Not authorized to add players to this team', 403));
    }

    // Create player
    req.body.team = req.params.id;
    const player = await Player.create(req.body);

    // Add player to team
    team.players.push(player._id);
    await team.save();

    // Send notification
    try {
      await emailService.sendTeamUpdateNotification(
        team,
        'Player Addition',
        `New player ${player.name} has been added to your team.`
      );
    } catch (error) {
      console.error('Player addition notification email could not be sent', error);
    }

    res.status(201).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove player from team
// @route   DELETE /api/teams/:id/players/:playerId
// @access  Private (Admin & Team Manager)
exports.removePlayer = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    const player = await Player.findById(req.params.playerId);

    if (!team) {
      return next(new ErrorResponse(`Team not found with id of ${req.params.id}`, 404));
    }

    if (!player) {
      return next(new ErrorResponse(`Player not found with id of ${req.params.playerId}`, 404));
    }

    // Make sure user is team manager or admin
    if (req.user.role !== 'Admin' && 
        team.manager.userId.toString() !== req.user.id.toString()) {
      return next(new ErrorResponse('Not authorized to remove players from this team', 403));
    }

    // Remove player from team
    team.players = team.players.filter(
      p => p.toString() !== req.params.playerId.toString()
    );
    await team.save();

    // Delete player
    await player.remove();

    // Send notification
    try {
      await emailService.sendTeamUpdateNotification(
        team,
        'Player Removal',
        `Player ${player.name} has been removed from your team.`
      );
    } catch (error) {
      console.error('Player removal notification email could not be sent', error);
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};