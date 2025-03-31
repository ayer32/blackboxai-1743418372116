const Player = require('../models/Player');
const Team = require('../models/Team');
const ErrorResponse = require('../utils/errorResponse');
const emailService = require('../utils/emailService');

// @desc    Get all players
// @route   GET /api/players
// @access  Public
exports.getPlayers = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(field => delete queryObj[field]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    let query = Player.find(JSON.parse(queryStr)).populate('team', 'name shortName');

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-stats.batting.runs');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Player.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const players = await query;

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
      count: players.length,
      pagination,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single player
// @route   GET /api/players/:id
// @access  Public
exports.getPlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'name shortName');

    if (!player) {
      return next(new ErrorResponse(`Player not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create player
// @route   POST /api/players
// @access  Private (Admin & Team Manager)
exports.createPlayer = async (req, res, next) => {
  try {
    // Check if team exists
    const team = await Team.findById(req.body.team);
    if (!team) {
      return next(new ErrorResponse(`Team not found with id of ${req.body.team}`, 404));
    }

    // Check if user is authorized to add player to this team
    if (req.user.role !== 'Admin' && 
        team.manager.userId.toString() !== req.user.id.toString()) {
      return next(new ErrorResponse('Not authorized to add players to this team', 403));
    }

    const player = await Player.create(req.body);

    // Add player to team
    team.players.push(player._id);
    await team.save();

    // Send notification
    try {
      await emailService.sendTeamUpdateNotification(
        team,
        'New Player Added',
        `${player.name} has been added to your team.`
      );
    } catch (error) {
      console.error('Player creation notification email could not be sent', error);
    }

    res.status(201).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update player
// @route   PUT /api/players/:id
// @access  Private (Admin & Team Manager)
exports.updatePlayer = async (req, res, next) => {
  try {
    let player = await Player.findById(req.params.id);

    if (!player) {
      return next(new ErrorResponse(`Player not found with id of ${req.params.id}`, 404));
    }

    // Check if user is authorized to update this player
    const team = await Team.findById(player.team);
    if (req.user.role !== 'Admin' && 
        team.manager.userId.toString() !== req.user.id.toString()) {
      return next(new ErrorResponse('Not authorized to update this player', 403));
    }

    player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Send notification
    try {
      await emailService.sendTeamUpdateNotification(
        team,
        'Player Update',
        `${player.name}'s details have been updated.`
      );
    } catch (error) {
      console.error('Player update notification email could not be sent', error);
    }

    res.status(200).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete player
// @route   DELETE /api/players/:id
// @access  Private (Admin & Team Manager)
exports.deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return next(new ErrorResponse(`Player not found with id of ${req.params.id}`, 404));
    }

    // Check if user is authorized to delete this player
    const team = await Team.findById(player.team);
    if (req.user.role !== 'Admin' && 
        team.manager.userId.toString() !== req.user.id.toString()) {
      return next(new ErrorResponse('Not authorized to delete this player', 403));
    }

    // Remove player from team
    team.players = team.players.filter(p => p.toString() !== req.params.id.toString());
    await team.save();

    await player.remove();

    // Send notification
    try {
      await emailService.sendTeamUpdateNotification(
        team,
        'Player Removed',
        `${player.name} has been removed from your team.`
      );
    } catch (error) {
      console.error('Player deletion notification email could not be sent', error);
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get player statistics
// @route   GET /api/players/:id/stats
// @access  Public
exports.getPlayerStats = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return next(new ErrorResponse(`Player not found with id of ${req.params.id}`, 404));
    }

    const stats = {
      batting: player.stats.batting,
      bowling: player.stats.bowling,
      fielding: player.stats.fielding,
      matches: player.stats.batting.matches,
      age: player.age
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update player statistics
// @route   PUT /api/players/:id/stats
// @access  Private (Admin & Team Manager)
exports.updatePlayerStats = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return next(new ErrorResponse(`Player not found with id of ${req.params.id}`, 404));
    }

    // Check if user is authorized to update this player's stats
    const team = await Team.findById(player.team);
    if (req.user.role !== 'Admin' && 
        team.manager.userId.toString() !== req.user.id.toString()) {
      return next(new ErrorResponse('Not authorized to update this player\'s statistics', 403));
    }

    // Update batting stats if provided
    if (req.body.batting) {
      player.updateBattingStats(req.body.batting);
    }

    // Update bowling stats if provided
    if (req.body.bowling) {
      player.updateBowlingStats(req.body.bowling);
    }

    // Update fielding stats if provided
    if (req.body.fielding) {
      Object.assign(player.stats.fielding, req.body.fielding);
    }

    await player.save();

    res.status(200).json({
      success: true,
      data: player.stats
    });
  } catch (error) {
    next(error);
  }
};