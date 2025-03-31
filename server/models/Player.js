const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  playerType: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'],
    required: [true, 'Player type is required']
  },
  battingStyle: {
    type: String,
    enum: ['Right Handed', 'Left Handed'],
    required: [true, 'Batting style is required']
  },
  bowlingStyle: {
    type: String,
    enum: ['Right Arm Fast', 'Right Arm Medium', 'Right Arm Off-Spin', 
           'Left Arm Fast', 'Left Arm Medium', 'Left Arm Spin', 'None'],
    default: 'None'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  jerseyNumber: {
    type: Number,
    required: [true, 'Jersey number is required'],
    min: [0, 'Jersey number must be positive']
  },
  stats: {
    batting: {
      matches: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
      hundreds: { type: Number, default: 0 },
      notOuts: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      average: { type: Number, default: 0 }
    },
    bowling: {
      matches: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      runsGiven: { type: Number, default: 0 },
      bestBowling: {
        wickets: { type: Number, default: 0 },
        runs: { type: Number, default: 0 }
      },
      economy: { type: Number, default: 0 },
      average: { type: Number, default: 0 }
    },
    fielding: {
      catches: { type: Number, default: 0 },
      stumpings: { type: Number, default: 0 },
      runOuts: { type: Number, default: 0 }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  contactInfo: {
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: String,
    address: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for player's age
playerSchema.virtual('age').get(function() {
  return Math.floor((new Date() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
});

// Method to update batting statistics
playerSchema.methods.updateBattingStats = function(inningsData) {
  const stats = this.stats.batting;
  stats.matches += 1;
  stats.innings += 1;
  stats.runs += inningsData.runs;
  stats.ballsFaced += inningsData.ballsFaced;
  
  if (!inningsData.isOut) stats.notOuts += 1;
  if (inningsData.runs >= 50 && inningsData.runs < 100) stats.fifties += 1;
  if (inningsData.runs >= 100) stats.hundreds += 1;
  if (inningsData.runs > stats.highestScore) stats.highestScore = inningsData.runs;
  
  // Update strike rate and average
  stats.strikeRate = (stats.ballsFaced > 0) ? 
    ((stats.runs / stats.ballsFaced) * 100).toFixed(2) : 0;
  stats.average = (stats.innings - stats.notOuts > 0) ? 
    (stats.runs / (stats.innings - stats.notOuts)).toFixed(2) : stats.runs;
};

// Method to update bowling statistics
playerSchema.methods.updateBowlingStats = function(inningsData) {
  const stats = this.stats.bowling;
  stats.matches += 1;
  stats.innings += 1;
  stats.overs += inningsData.overs;
  stats.wickets += inningsData.wickets;
  stats.runsGiven += inningsData.runs;
  
  // Update best bowling figures
  if (inningsData.wickets > stats.bestBowling.wickets || 
      (inningsData.wickets === stats.bestBowling.wickets && 
       inningsData.runs < stats.bestBowling.runs)) {
    stats.bestBowling.wickets = inningsData.wickets;
    stats.bestBowling.runs = inningsData.runs;
  }
  
  // Update economy and average
  stats.economy = (stats.overs > 0) ? 
    (stats.runsGiven / stats.overs).toFixed(2) : 0;
  stats.average = (stats.wickets > 0) ? 
    (stats.runsGiven / stats.wickets).toFixed(2) : 0;
};

// Indexes for efficient queries
playerSchema.index({ name: 1 });
playerSchema.index({ team: 1 });
playerSchema.index({ 'stats.batting.runs': -1 });
playerSchema.index({ 'stats.bowling.wickets': -1 });

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;