const mongoose = require('mongoose');

const playerScoreSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  runs: { type: Number, default: 0 },
  ballsFaced: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  dismissalType: {
    type: String,
    enum: ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket', 'Not Out', ''],
    default: ''
  },
  bowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }
});

const bowlingFigureSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  overs: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  wides: { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 }
});

const inningsSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  totalRuns: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 }
  },
  battingScores: [playerScoreSchema],
  bowlingFigures: [bowlingFigureSchema]
});

const matchSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  matchNumber: {
    type: Number,
    required: true
  },
  matchType: {
    type: String,
    enum: ['League', 'Quarter Final', 'Semi Final', 'Final'],
    required: true
  },
  teams: {
    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    }
  },
  venue: {
    ground: {
      type: String,
      required: true
    },
    city: String,
    country: String
  },
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date
  },
  toss: {
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    decision: {
      type: String,
      enum: ['Bat', 'Bowl']
    }
  },
  overs: {
    type: Number,
    required: true,
    default: 20
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Abandoned', 'Cancelled'],
    default: 'Scheduled'
  },
  innings: [inningsSchema],
  result: {
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    winningMargin: Number,
    winningType: {
      type: String,
      enum: ['Runs', 'Wickets', 'Super Over', 'DLS', ''],
      default: ''
    },
    description: String
  },
  umpires: [{
    name: String,
    role: {
      type: String,
      enum: ['Main', 'TV', 'Third', 'Reserve']
    }
  }],
  weather: {
    condition: String,
    temperature: Number,
    humidity: Number
  },
  highlights: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for match duration
matchSchema.virtual('duration').get(function() {
  if (!this.schedule.endDate) return null;
  return Math.round((this.schedule.endDate - this.schedule.startDate) / (1000 * 60)); // Duration in minutes
});

// Virtual for total extras in an innings
inningsSchema.virtual('totalExtras').get(function() {
  const extras = this.extras;
  return extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalty;
});

// Method to update match status
matchSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'Completed') {
    this.schedule.endDate = new Date();
  }
};

// Method to calculate run rate
inningsSchema.methods.getRunRate = function() {
  if (this.overs === 0) return 0;
  return (this.totalRuns / this.overs).toFixed(2);
};

// Indexes for efficient queries
matchSchema.index({ 'schedule.startDate': 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ 'teams.team1': 1, 'teams.team2': 1 });
matchSchema.index({ tournament: 1, matchNumber: 1 });

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;