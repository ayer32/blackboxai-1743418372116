const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Team name must be at least 2 characters long']
  },
  shortName: {
    type: String,
    required: [true, 'Team short name is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [2, 'Short name must be at least 2 characters long'],
    maxlength: [4, 'Short name cannot exceed 4 characters']
  },
  logo: {
    type: String,
    default: null
  },
  manager: {
    name: {
      type: String,
      required: [true, 'Manager name is required']
    },
    contact: {
      type: String,
      required: [true, 'Manager contact is required']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  coach: {
    name: {
      type: String,
      required: [true, 'Coach name is required']
    },
    specialization: String
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  homeGround: {
    type: String,
    required: [true, 'Home ground is required']
  },
  stats: {
    matchesPlayed: {
      type: Number,
      default: 0
    },
    matchesWon: {
      type: Number,
      default: 0
    },
    matchesLost: {
      type: Number,
      default: 0
    },
    matchesDrawn: {
      type: Number,
      default: 0
    },
    points: {
      type: Number,
      default: 0
    },
    netRunRate: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating win percentage
teamSchema.virtual('winPercentage').get(function() {
  if (this.stats.matchesPlayed === 0) return 0;
  return ((this.stats.matchesWon / this.stats.matchesPlayed) * 100).toFixed(2);
});

// Middleware to ensure shortName is uppercase
teamSchema.pre('save', function(next) {
  if (this.isModified('shortName')) {
    this.shortName = this.shortName.toUpperCase();
  }
  next();
});

// Index for efficient queries
teamSchema.index({ name: 1 });
teamSchema.index({ shortName: 1 });
teamSchema.index({ 'stats.points': -1, 'stats.netRunRate': -1 });

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;