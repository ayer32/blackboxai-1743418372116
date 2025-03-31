const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');
const ErrorResponse = require('../utils/errorResponse');
const emailService = require('../utils/emailService');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
exports.getTournaments = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(field => delete queryObj[field]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    let query = Tournament.find(JSON.parse(queryStr))
      .populate('teams.team', 'name shortName');

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-startDate');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Tournament.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const tournaments = await query;

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
      count: tournaments.length,
      pagination,
      data: tournaments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tournament
// @route   GET /api/tournaments/:id
// @access  Public
exports.getTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('teams.team', 'name shortName manager');

    if (!tournament) {
      return next(new ErrorResponse(`Tournament not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create tournament
// @route   POST /api/tournaments
// @access  Private (Admin)
exports.createTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.create(req.body);

    res.status(201).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tournament
// @route   PUT /api/tournaments/:id
// @access  Private (Admin)
exports.updateTournament = async (req, res, next) => {
  try {
    let tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return next(new ErrorResponse(`Tournament not found with id of ${req.params.id}`, 404));
    }

    tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete tournament
// @route   DELETE /api/tournaments/:id
// @access  Private (Admin)
exports.deleteTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return next(new ErrorResponse(`Tournament not found with id of ${req.params.id}`, 404));
    }

    // Delete all matches associated with this tournament
    await Match.deleteMany({ tournament: req.params.id });

    await tournament.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register team for tournament
// @route   POST /api/tournaments/:id/teams
// @access  Private (Admin & Team Manager)
exports.registerTeam = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    const team = await Team.findById(req.body.teamId);

    if (!tournament) {
      return next(new ErrorResponse(`Tournament not found with id of ${req.params.id}`, 404));
    }

    if (!team) {
      return next(new ErrorResponse(`Team not found with id of ${req.body.teamId}`, 404));
    }

    // Check if registration is open
    if (!tournament.isRegistrationOpen) {
      return next(new ErrorResponse('Tournament registration is closed', 400));
    }

    // Check if team can be added
    if (!tournament.canAddTeam(team._id)) {
      return next(new ErrorResponse('Team is already registered for this tournament', 400));
    }

    // Add team to tournament
    tournament.teams.push({
      team: team._id,
      status: req.user.role === 'Admin' ? 'Approved' : 'Pending'
    });

    await tournament.save();

    // Send notification
    try {
      await emailService.sendTournamentRegistrationEmail(team, tournament);
    } catch (error) {
      console.error('Tournament registration notification email could not be sent', error);
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team registration status
// @route   PUT /api/tournaments/:id/teams/:teamId
// @access  Private (Admin)
exports.updateTeamStatus = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return next(new ErrorResponse(`Tournament not found with id of ${req.params.id}`, 404));
    }

    const teamRegistration = tournament.teams.find(
      t => t.team.toString() === req.params.teamId
    );

    if (!teamRegistration) {
      return next(new ErrorResponse('Team not registered for this tournament', 404));
    }

    teamRegistration.status = req.body.status;
    await tournament.save();

    // Send notification
    try {
      const team = await Team.findById(req.params.teamId);
      await emailService.sendTeamUpdateNotification(
        team,
        'Tournament Registration Update',
        `Your registration status for ${tournament.name} has been updated to ${req.body.status}`
      );
    } catch (error) {
      console.error('Team status update notification email could not be sent', error);
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tournament statistics
// @route   GET /api/tournaments/:id/stats
// @access  Public
exports.getTournamentStats = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('teams.team', 'name shortName stats');

    if (!tournament) {
      return next(new ErrorResponse(`Tournament not found with id of ${req.params.id}`, 404));
    }

    // Get all matches in the tournament
    const matches = await Match.find({ tournament: req.params.id })
      .populate('innings.battingScores.player', 'name')
      .populate('innings.bowlingFigures.player', 'name');

    // Calculate tournament statistics
    const stats = {
      totalTeams: tournament.totalTeams,
      matchesPlayed: matches.filter(m => m.status === 'Completed').length,
      matchesRemaining: matches.filter(m => m.status !== 'Completed').length,
      topScorers: [],
      topWicketTakers: [],
      teamStats: tournament.teams
        .filter(t => t.status === 'Approved')
        .map(t => ({
          team: t.team.name,
          matches: t.team.stats.matchesPlayed,
          won: t.team.stats.matchesWon,
          lost: t.team.stats.matchesLost,
          points: t.team.stats.points,
          netRunRate: t.team.stats.netRunRate
        }))
        .sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate)
    };

    // Calculate individual statistics
    const playerStats = new Map();

    matches.forEach(match => {
      match.innings.forEach(innings => {
        // Batting stats
        innings.battingScores.forEach(score => {
          const playerId = score.player._id.toString();
          if (!playerStats.has(playerId)) {
            playerStats.set(playerId, {
              id: playerId,
              name: score.player.name,
              runs: 0,
              wickets: 0
            });
          }
          const stats = playerStats.get(playerId);
          stats.runs += score.runs;
        });

        // Bowling stats
        innings.bowlingFigures.forEach(figure => {
          const playerId = figure.player._id.toString();
          if (!playerStats.has(playerId)) {
            playerStats.set(playerId, {
              id: playerId,
              name: figure.player.name,
              runs: 0,
              wickets: 0
            });
          }
          const stats = playerStats.get(playerId);
          stats.wickets += figure.wickets;
        });
      });
    });

    // Sort and get top performers
    const players = Array.from(playerStats.values());
    stats.topScorers = players
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5);
    stats.topWicketTakers = players
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};