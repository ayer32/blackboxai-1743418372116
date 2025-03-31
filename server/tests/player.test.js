const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Team = require('../models/Team');
const Player = require('../models/Player');

let mongoServer;
let adminToken;
let teamManagerToken;
let viewerToken;
let team;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test users with different roles
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

  // Create a team
  team = await Team.create({
    name: 'Test Team',
    shortName: 'TTM',
    manager: {
      name: 'John Doe',
      contact: 'manager@example.com',
      userId: teamManager._id
    },
    homeGround: 'Test Stadium'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Player.deleteMany({});
});

describe('Player Controller', () => {
  const validPlayer = {
    name: 'Test Player',
    dateOfBirth: '1995-01-01',
    playerType: 'Batsman',
    battingStyle: 'Right Handed',
    bowlingStyle: 'Right Arm Medium',
    team: null, // Will be set in beforeEach
    jerseyNumber: 45,
    contactInfo: {
      email: 'player@example.com',
      phone: '1234567890'
    }
  };

  beforeEach(() => {
    validPlayer.team = team._id;
  });

  describe('GET /api/players', () => {
    beforeEach(async () => {
      await Player.create([
        validPlayer,
        {
          ...validPlayer,
          name: 'Another Player',
          jerseyNumber: 77
        }
      ]);
    });

    it('should get all players', async () => {
      const res = await request(app).get('/api/players');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/players')
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toHaveProperty('next');
    });

    it('should filter players by team', async () => {
      const res = await request(app)
        .get(`/api/players/search/team/${team._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(player => player.team._id === team._id.toString())).toBe(true);
    });

    it('should filter players by role', async () => {
      const res = await request(app)
        .get('/api/players/search/role/Batsman');

      expect(res.status).toBe(200);
      expect(res.body.data.every(player => player.playerType === 'Batsman')).toBe(true);
    });
  });

  describe('GET /api/players/:id', () => {
    let player;

    beforeEach(async () => {
      player = await Player.create(validPlayer);
    });

    it('should get single player', async () => {
      const res = await request(app).get(`/api/players/${player._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', player.name);
    });

    it('should return 404 for non-existent player', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/players/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/players', () => {
    it('should create player when admin', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPlayer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', validPlayer.name);
    });

    it('should create player when team manager of the team', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${teamManagerToken}`)
        .send(validPlayer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should not create player when viewer', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(validPlayer);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Player'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/players/:id', () => {
    let player;

    beforeEach(async () => {
      player = await Player.create(validPlayer);
    });

    it('should update player when admin', async () => {
      const update = { name: 'Updated Player Name' };
      const res = await request(app)
        .put(`/api/players/${player._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(update.name);
    });

    it('should update player when team manager of the team', async () => {
      const update = { name: 'Updated Player Name' };
      const res = await request(app)
        .put(`/api/players/${player._id}`)
        .set('Authorization', `Bearer ${teamManagerToken}`)
        .send(update);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(update.name);
    });

    it('should not update player without authentication', async () => {
      const update = { name: 'Updated Player Name' };
      const res = await request(app)
        .put(`/api/players/${player._id}`)
        .send(update);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/players/:id/stats', () => {
    let player;

    beforeEach(async () => {
      player = await Player.create({
        ...validPlayer,
        stats: {
          batting: {
            matches: 10,
            innings: 15,
            runs: 500,
            highestScore: 85,
            average: 45.5,
            strikeRate: 125.5
          },
          bowling: {
            matches: 10,
            innings: 8,
            wickets: 12,
            economy: 7.5,
            average: 25.5
          }
        }
      });
    });

    it('should get player statistics', async () => {
      const res = await request(app).get(`/api/players/${player._id}/stats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('batting');
      expect(res.body.data).toHaveProperty('bowling');
      expect(res.body.data.batting).toHaveProperty('average', 45.5);
      expect(res.body.data.bowling).toHaveProperty('wickets', 12);
    });

    it('should return 404 for non-existent player stats', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/players/${fakeId}/stats`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/players/:id/stats', () => {
    let player;

    beforeEach(async () => {
      player = await Player.create(validPlayer);
    });

    it('should update player stats when authorized', async () => {
      const statsUpdate = {
        batting: {
          runs: 50,
          ballsFaced: 40,
          isOut: true
        }
      };

      const res = await request(app)
        .put(`/api/players/${player._id}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(statsUpdate);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batting.runs).toBe(50);
    });

    it('should not update stats without authentication', async () => {
      const statsUpdate = {
        batting: {
          runs: 50,
          ballsFaced: 40
        }
      };

      const res = await request(app)
        .put(`/api/players/${player._id}/stats`)
        .send(statsUpdate);

      expect(res.status).toBe(401);
    });
  });
});