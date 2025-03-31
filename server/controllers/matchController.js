const Match = require('../models/Match');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const ErrorResponse = require('../utils/errorResponse');
const emailService = require('../utils/emailService');

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
exports.getMatches = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(field => delete queryObj[field]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    let query = Match.find(JSON.parse(queryStr))
      .populate('teams.team1 teams.team2', 'name shortName')
      .populate('tournament', 'name shortName');

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-schedule.startDate');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Match.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const matches = await query;

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
      count: matches.length,
      pagination,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Public
exports.getMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('teams.team1 teams.team2', 'name shortName')
      .populate('tournament', 'name shortName')
      .populate('innings.battingScores.player', 'name')
      .populate('innings.bowlingFigures.player', 'name');

    if (!match) {
      return next(new ErrorResponse(`Match not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create match
// @route   POST /api/matches
// @access  Private (Admin)
exports.createMatch = async (req, res, next) => {
  try {
    // Check if teams exist
    const team1 = await Team.findById(req.body.teams.team1);
    const team2 = await Team.findById(req.body.teams.team2);

    if (!team1 || !team2) {
      return next(new ErrorResponse('One or both teams not found', 404));
    }

    // Check if tournament exists if provided
    if (req.body.tournament) {
      const tournament = await Tournament.findById(req.body.tournament);
      if (!tournament) {
        return next(new ErrorResponse('Tournament not found', 404));
      }
    }

    const match = await Match.create(req.body);

    // Send notifications to team managers
    try {
      const recipients = [
        { email: team1.manager.contact },
        { email: team2.manager.contact }
      ];
      await emailService.sendMatchScheduleNotification(match, recipients);
    } catch (error) {
      console.error('Match schedule notification email could not be sent', error);
    }

    res.status(201).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update match
// @route   PUT /api/matches/:id
// @access  Private (Admin)
exports.updateMatch = async (req, res, next) => {
  try {
    let match = await Match.findById(req.params.id);

    if (!match) {
      return next(new ErrorResponse(`Match not found with id of ${req.params.id}`, 404));
    }

    match = await Match.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private (Admin)
exports.deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return next(new ErrorResponse(`Match not found with id of ${req.params.id}`, 404));
    }

    await match.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update match score
// @route   PUT /api/matches/:id/score
// @access  Private (Admin)
exports.updateScore = async (req, res, next) => {
  try {
    let match = await Match.findById(req.params.id);

    if (!match) {
      return next(new ErrorResponse(`Match not found with id of ${req.params.id}`, 404));
    }

    // Update innings data
    match.innings = req.body.innings;
    
    // Update match status if provided
    if (req.body.status) {
      match.updateStatus(req.body.status);
    }

    // If match is completed, update result
    if (req.body.status === 'Completed' && req.body.result) {
      match.result = req.body.result;

      // Update team statistics
      const winner = await Team.findById(match.result.winner);
      const loser = await Team.findById(
        match.teams.team1.toString() === winner._id.toString() 
          ? match.teams.team2 
          : match.teams.team1
      );

      winner.stats.matchesPlayed += 1;
      winner.stats.matchesWon += 1;
      loser.stats.matchesPlayed += 1;
      loser.stats.matchesLost += 1;

      await winner.save();
      await loser.save();

      // Send match result notification
      try {
        const recipients = [
          { email: winner.manager.contact },
          { email: loser.manager.contact }
        ];
        await emailService.sendMatchResultNotification(match, recipients);
      } catch (error) {
        console.error('Match result notification email could not be sent', error);
      }
    }

    await match.save();

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get match statistics
// @route   GET /api/matches/:id/stats
// @access  Public
exports.getMatchStats = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('innings.battingScores.player', 'name')
      .populate('innings.bowlingFigures.player', 'name');

    if (!match) {
      return next(new ErrorResponse(`Match not found with id of ${req.params.id}`, 404));
    }

    const stats = {
      matchInfo: {
        teams: match.teams,
        venue: match.venue,
        date: match.schedule.startDate,
        result: match.result
      },
      innings: match.innings.map(innings => ({
        team: innings.team,
        totalScore: innings.totalRuns,
        wickets: innings.wickets,
        overs: innings.overs,
        runRate: innings.getRunRate(),
        extras: innings.totalExtras,
        topScorers: innings.battingScores
          .sort((a, b) => b.runs - a.runs)
          .slice(0, 3),
        topBowlers: innings.bowlingFigures
          .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
          .slice(0, 3)
      }))
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};