const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');

let mongoServer;
let adminToken;
let teamManagerToken;
let viewerToken;
let team1;
let team2;

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
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Tournament.deleteMany({});
  await Match.deleteMany({});
});

describe('Tournament Controller', () => {
  const validTournament = {
    name: 'Test Tournament 2023',
    shortName: 'TT23',
    season: '2023',
    format: 'T20',
    overs: 20,
    startDate: new Date('2023-09-01'),
    endDate: new Date('2023-10-15'),
    registrationDeadline: new Date('2023-08-15'),
    venues: [{
      ground: 'Test Stadium',
      city: 'Test City',
      country: 'Test Country',
      capacity: 40000
    }],
    pointsSystem: {
      win: 2,
      loss: 0,
      tie: 1,
      noResult: 1
    },
    organizer: {
      name: 'Test Cricket Board',
      contact: {
        email: 'organizer@example.com',
        phone: '1234567890'
      }
    }
  };

  describe('GET /api/tournaments', () => {
    beforeEach(async () => {
      await Tournament.create([
        validTournament,
        {
          ...validTournament,
          name: 'Another Tournament',
          shortName: 'AT23'
        }
      ]);
    });

    it('should get all tournaments', async () => {
      const res = await request(app).get('/api/tournaments');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
    });

    it('should filter tournaments by status', async () => {
      const res = await request(app)
        .get('/api/tournaments/status/Registration');

      expect(res.status).toBe(200);
      expect(res.body.data.every(tournament => 
        tournament.status === 'Registration'
      )).toBe(true);
    });

    it('should get active tournaments', async () => {
      const res = await request(app).get('/api/tournaments/active');

      expect(res.status).toBe(200);
      expect(res.body.data.every(tournament => 
        tournament.status === 'Ongoing'
      )).toBe(true);
    });
  });

  describe('GET /api/tournaments/:id', () => {
    let tournament;

    beforeEach(async () => {
      tournament = await Tournament.create(validTournament);
    });

    it('should get single tournament', async () => {
      const res = await request(app).get(`/api/tournaments/${tournament._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', tournament.name);
    });

    it('should return 404 for non-existent tournament', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/tournaments/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/tournaments', () => {
    it('should create tournament when admin', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validTournament);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', validTournament.name);
    });

    it('should not create tournament when team manager', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${teamManagerToken}`)
        .send(validTournament);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Tournament'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/tournaments/:id/teams', () => {
    let tournament;

    beforeEach(async () => {
      tournament = await Tournament.create(validTournament);
    });

    it('should register team when admin', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournament._id}/teams`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamId: team1._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teams).toHaveLength(1);
      expect(res.body.data.teams[0].team.toString()).toBe(team1._id.toString());
    });

    it('should register team when team manager of the team', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${tournament._id}/teams`)
        .set('Authorization', `Bearer ${teamManagerToken}`)
        .send({ teamId: team1._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not register team after registration deadline', async () => {
      const closedTournament = await Tournament.create({
        ...validTournament,
        registrationDeadline: new Date('2023-01-01')
      });

      const res = await request(app)
        .post(`/api/tournaments/${closedTournament._id}/teams`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamId: team1._id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/tournaments/:id/stats', () => {
    let tournament;

    beforeEach(async () => {
      tournament = await Tournament.create({
        ...validTournament,
        teams: [
          { team: team1._id, status: 'Approved' },
          { team: team2._id, status: 'Approved' }
        ]
      });

      // Create some matches
      await Match.create([
        {
          tournament: tournament._id,
          matchNumber: 1,
          teams: { team1: team1._id, team2: team2._id },
          status: 'Completed',
          result: { winner: team1._id }
        },
        {
          tournament: tournament._id,
          matchNumber: 2,
          teams: { team1: team2._id, team2: team1._id },
          status: 'Completed',
          result: { winner: team2._id }
        }
      ]);
    });

    it('should get tournament statistics', async () => {
      const res = await request(app).get(`/api/tournaments/${tournament._id}/stats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalTeams');
      expect(res.body.data).toHaveProperty('matchesPlayed');
      expect(res.body.data).toHaveProperty('teamStats');
    });

    it('should return points table in correct order', async () => {
      const res = await request(app).get(`/api/tournaments/${tournament._id}/stats`);

      expect(res.status).toBe(200);
      expect(res.body.data.teamStats).toHaveLength(2);
      // Teams should have equal points as they won one match each
      expect(res.body.data.teamStats[0].won).toBe(1);
      expect(res.body.data.teamStats[1].won).toBe(1);
    });
  });
});