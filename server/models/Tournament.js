const mongoose = require('mongoose');

const pointRuleSchema = new mongoose.Schema({
  win: {
    type: Number,
    required: true,
    default: 2
  },
  loss: {
    type: Number,
    required: true,
    default: 0
  },
  tie: {
    type: Number,
    required: true,
    default: 1
  },
  noResult: {
    type: Number,
    required: true,
    default: 1
  },
  bonus: {
    type: Number,
    default: 0
  }
});

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    unique: true,
    trim: true
  },
  shortName: {
    type: String,
    required: [true, 'Tournament short name is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  season: {
    type: String,
    required: [true, 'Season is required']
  },
  format: {
    type: String,
    enum: ['T20', 'ODI', 'Test', 'Custom'],
    required: true
  },
  overs: {
    type: Number,
    required: function() {
      return this.format !== 'Test';
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  venues: [{
    ground: {
      type: String,
      required: true
    },
    city: String,
    country: String,
    capacity: Number
  }],
  teams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    }
  }],
  stages: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['League', 'Group', 'Knockout', 'Final'],
      required: true
    },
    startDate: Date,
    endDate: Date,
    groups: [{
      name: String,
      teams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
      }]
    }]
  }],
  pointsSystem: {
    type: pointRuleSchema,
    required: true
  },
  qualificationRules: {
    teamsPerGroup: {
      type: Number,
      default: 2
    },
    criteria: [{
      type: String,
      enum: ['Points', 'NetRunRate', 'HeadToHead', 'BowlingStrikeRate', 'BattingAverage'],
      default: ['Points', 'NetRunRate']
    }]
  },
  status: {
    type: String,
    enum: ['Draft', 'Registration', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  organizer: {
    name: {
      type: String,
      required: true
    },
    contact: {
      email: String,
      phone: String
    }
  },
  sponsors: [{
    name: String,
    logo: String,
    website: String,
    sponsorshipType: {
      type: String,
      enum: ['Title', 'Principal', 'Associate', 'Other']
    }
  }],
  prizeMoney: {
    currency: {
      type: String,
      default: 'USD'
    },
    winner: Number,
    runnerUp: Number,
    thirdPlace: Number,
    other: [{
      category: String,
      amount: Number
    }]
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

// Virtual for tournament duration in days
tournamentSchema.virtual('duration').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for registration status
tournamentSchema.virtual('isRegistrationOpen').get(function() {
  const now = new Date();
  return now <= this.registrationDeadline;
});

// Virtual for total teams count
tournamentSchema.virtual('totalTeams').get(function() {
  return this.teams.filter(team => team.status === 'Approved').length;
});

// Method to check if a team can be added
tournamentSchema.methods.canAddTeam = function(teamId) {
  const existingTeam = this.teams.find(t => t.team.toString() === teamId.toString());
  if (existingTeam) return false;
  
  const now = new Date();
  return now <= this.registrationDeadline;
};

// Method to update tournament status based on dates
tournamentSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (now < this.registrationDeadline) {
    this.status = 'Registration';
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = 'Ongoing';
  } else if (now > this.endDate) {
    this.status = 'Completed';
  }
};

// Middleware to ensure shortName is uppercase
tournamentSchema.pre('save', function(next) {
  if (this.isModified('shortName')) {
    this.shortName = this.shortName.toUpperCase();
  }
  next();
});

// Indexes for efficient queries
tournamentSchema.index({ name: 1 });
tournamentSchema.index({ shortName: 1 });
tournamentSchema.index({ startDate: 1, endDate: 1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ 'teams.team': 1 });

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;