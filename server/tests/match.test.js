const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

let mongoServer;
let adminToken;
let teamManagerToken;
let viewerToken;
let team1;
let team2;
let tournament;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test users
  const admin = await User.create({
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin@123',
    role: 'Admin'
  });
  adminToken = admin.getSignedJwtToken();

  const teamManager = await User.create({
    username: 'manager',
    email: 'manager@example.com',
    password: 'Manager@123',
    role: 'TeamManager'
  });
  teamManagerToken = teamManager.getSignedJwtToken();

  const viewer = await User.create({
    username: 'viewer',
    email: 'viewer@example.com',
    password: 'Viewer@123',
    role: 'Viewer'
  });
  viewerToken = viewer.getSignedJwtToken();

  // Create teams
  team1 = await Team.create({
    name: 'Team One',
    shortName: 'TO1',
    manager: {
      name: 'John Doe',
      contact: 'manager1@example.com',
      userId: teamManager._id
    },
    homeGround: 'Stadium One'
  });

  team2 = await Team.create({
    name: 'Team Two',
    shortName: 'TO2',
    manager: {
      name: 'Jane Smith',
      contact: 'manager2@example.com'
    },
    homeGround: 'Stadium Two'
  });

  // Create tournament
  tournament = await Tournament.create({
    name: 'Test Tournament',
    shortName: 'TT23',
    season: '2023',
    format: 'T20',
    overs: 20,
    startDate: new Date('2023-09-01'),
    endDate: new Date('2023-10-15'),
    teams: [
      { team: team1._id, status: 'Approved' },
      { team: team2._id, status: 'Approved' }
    ]
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Match.deleteMany({});
});

describe('Match Controller', () => {
  const validMatch = {
    tournament: null, // Will be set in beforeEach
    matchNumber: 1,
    matchType: 'League',
    teams: {
      team1: null, // Will be set in beforeEach
      team2: null  // Will be set in beforeEach
    },
    venue: {
      ground: 'Test Stadium',
      city: 'Test City',
      country: 'Test Country'
    },
    schedule: {
      startDate: new Date('2023-09-10T14:00:00Z')
    },
    overs: 20,
    status: 'Scheduled'
  };

  beforeEach(() => {
    validMatch.tournament = tournament._id;
    validMatch.teams.team1 = team1._id;
    validMatch.teams.team2 = team2._id;
  });

  describe('GET /api/matches', () => {
    beforeEach(async () => {
      await Match.create([
        validMatch,
        {
          ...validMatch,
          matchNumber: 2,
          schedule: {
            startDate: new Date('2023-09-11T14:00:00Z')
          }
        }
      ]);
    });

    it('should get all matches', async () => {
      const res = await request(app).get('/api/matches');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
    });

    it('should filter matches by tournament', async () => {
      const res = await request(app)
        .get(`/api/matches/tournament/${tournament._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(match => 
        match.tournament._id === tournament._id.toString()
      )).toBe(true);
    });

    it('should filter matches by team', async () => {
      const res = await request(app)
        .get(`/api/matches/team/${team1._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(match => 
        match.teams.team1._id === team1._id.toString() ||
        match.teams.team2._id === team1._id.toString()
      )).toBe(true);
    });
  });

  describe('GET /api/matches/:id', () => {
    let match;

    beforeEach(async () => {
      match = await Match.create(validMatch);
    });

    it('should get single match', async () => {
      const res = await request(app).get(`/api/matches/${match._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('matchNumber', match.matchNumber);
    });

    it('should return 404 for non-existent match', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/matches/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/matches', () => {
    it('should create match when admin', async () => {
      const res = await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validMatch);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('matchNumber', validMatch.matchNumber);
    });

    it('should not create match when team manager', async () => {
      const res = await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${teamManagerToken}`)
        .send(validMatch);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          matchNumber: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/matches/:id/score', () => {
    let match;

    beforeEach(async () => {
      match = await Match.create({
        ...validMatch,
        status: 'In Progress'
      });
    });

    it('should update match score when admin', async () => {
      const scoreUpdate = {
        innings: [{
          team: team1._id,
          totalRuns: 180,
          wickets: 4,
          overs: 20,
          extras: {
            wides: 5,
            noBalls: 2
          }
        }],
        status: 'In Progress'
      };

      const res = await request(app)
        .put(`/api/matches/${match._id}/score`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(scoreUpdate);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.innings[0]).toHaveProperty('totalRuns', 180);
    });

    it('should not update score without authentication', async () => {
      const scoreUpdate = {
        innings: [{
          team: team1._id,
          totalRuns: 180,
          wickets: 4,
          overs: 20
        }]
      };

      const res = await request(app)
        .put(`/api/matches/${match._id}/score`)
        .send(scoreUpdate);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/matches/:id/stats', () => {
    let match;

    beforeEach(async () => {
      match = await Match.create({
        ...validMatch,
        status: 'Completed',
        innings: [{
          team: team1._id,
          totalRuns: 180,
          wickets: 4,
          overs: 20,
          extras: {
            wides: 5,
            noBalls: 2
          }
        }, {
          team: team2._id,
          totalRuns: 160,
          wickets: 8,
          overs: 20,
          extras: {
            wides: 3,
            noBalls: 1
          }
        }],
        result: {
          winner: team1._id,
          winningMargin: 20,
          winningType: 'Runs'
        }
      });
    });

    it('should get match statistics', async () => {
      const res = await request(app).get(`/api/matches/${match._id}/stats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('matchInfo');
      expect(res.body.data).toHaveProperty('innings');
      expect(res.body.data.innings).toHaveLength(2);
      expect(res.body.data.matchInfo.result).toHaveProperty('winner');
    });
  });
});