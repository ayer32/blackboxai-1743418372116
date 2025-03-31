const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

let mongoServer;

// Connect to the in-memory database before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Clear all test data after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

// Disconnect and stop the in-memory database after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Test utilities
const createTestUser = async (role = 'Viewer') => {
  const user = await User.create({
    username: `test${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.com`,
    password: 'Test@123',
    role
  });
  return {
    user,
    token: user.getSignedJwtToken()
  };
};

const createTestTeam = async (manager) => {
  return await Team.create({
    name: `Test Team ${Date.now()}`,
    shortName: `TT${Date.now()}`.substring(0, 4),
    manager: {
      name: 'Test Manager',
      contact: manager.email,
      userId: manager._id
    },
    homeGround: 'Test Stadium'
  });
};

const createTestPlayer = async (team) => {
  return await Player.create({
    name: `Test Player ${Date.now()}`,
    dateOfBirth: '1995-01-01',
    playerType: 'Batsman',
    battingStyle: 'Right Handed',
    bowlingStyle: 'Right Arm Medium',
    team: team._id,
    jerseyNumber: Math.floor(Math.random() * 100)
  });
};

const createTestTournament = async (teams = []) => {
  return await Tournament.create({
    name: `Test Tournament ${Date.now()}`,
    shortName: `TT${Date.now()}`.substring(0, 4),
    season: new Date().getFullYear().toString(),
    format: 'T20',
    overs: 20,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // 37 days from now
    registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    teams: teams.map(team => ({
      team: team._id,
      status: 'Approved'
    })),
    pointsSystem: {
      win: 2,
      loss: 0,
      tie: 1,
      noResult: 1
    }
  });
};

const createTestMatch = async (tournament, team1, team2) => {
  return await Match.create({
    tournament: tournament._id,
    matchNumber: Math.floor(Math.random() * 1000),
    matchType: 'League',
    teams: {
      team1: team1._id,
      team2: team2._id
    },
    venue: {
      ground: 'Test Stadium',
      city: 'Test City',
      country: 'Test Country'
    },
    schedule: {
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
    },
    overs: 20,
    status: 'Scheduled'
  });
};

// Helper function to generate random match statistics
const generateMatchStats = () => {
  return {
    batting: {
      runs: Math.floor(Math.random() * 100),
      ballsFaced: Math.floor(Math.random() * 60),
      fours: Math.floor(Math.random() * 10),
      sixes: Math.floor(Math.random() * 5)
    },
    bowling: {
      overs: Math.floor(Math.random() * 4),
      maidens: Math.floor(Math.random() * 2),
      runs: Math.floor(Math.random() * 30),
      wickets: Math.floor(Math.random() * 3)
    }
  };
};

// Helper function to validate date formats
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Export test utilities
module.exports = {
  createTestUser,
  createTestTeam,
  createTestPlayer,
  createTestTournament,
  createTestMatch,
  generateMatchStats,
  isValidDate,
  isValidObjectId
};

// Global test timeout
jest.setTimeout(30000); // 30 seconds

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};