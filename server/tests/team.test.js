const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Team = require('../models/Team');

let mongoServer;
let adminToken;
let teamManagerToken;
let viewerToken;

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
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Team.deleteMany({});
});

describe('Team Controller', () => {
  const validTeam = {
    name: 'Test Team',
    shortName: 'TTM',
    manager: {
      name: 'John Doe',
      contact: 'manager@example.com'
    },
    coach: {
      name: 'Mike Smith',
      specialization: 'Batting'
    },
    homeGround: 'Test Stadium'
  };

  describe('GET /api/teams', () => {
    beforeEach(async () => {
      await Team.create([
        validTeam,
        {
          ...validTeam,
          name: 'Another Team',
          shortName: 'ATM'
        }
      ]);
    });

    it('should get all teams', async () => {
      const res = await request(app).get('/api/teams');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/teams')
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toHaveProperty('next');
    });
  });

  describe('GET /api/teams/:id', () => {
    let team;

    beforeEach(async () => {
      team = await Team.create(validTeam);
    });

    it('should get single team', async () => {
      const res = await request(app).get(`/api/teams/${team._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', team.name);
    });

    it('should return 404 for non-existent team', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/teams/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/teams', () => {
    it('should create team when admin', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validTeam);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', validTeam.name);
    });

    it('should create team when team manager', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${teamManagerToken}`)
        .send(validTeam);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should not create team when viewer', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(validTeam);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not create team without required fields', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Team'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/teams/:id', () => {
    let team;

    beforeEach(async () => {
      team = await Team.create({
        ...validTeam,
        manager: {
          ...validTeam.manager,
          userId: mongoose.Types.ObjectId()
        }
      });
    });

    it('should update team when admin', async () => {
      const update = { name: 'Updated Team Name' };
      const res = await request(app)
        .put(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(update.name);
    });

    it('should not update team without authentication', async () => {
      const update = { name: 'Updated Team Name' };
      const res = await request(app)
        .put(`/api/teams/${team._id}`)
        .send(update);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/teams/:id', () => {
    let team;

    beforeEach(async () => {
      team = await Team.create(validTeam);
    });

    it('should delete team when admin', async () => {
      const res = await request(app)
        .delete(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deletedTeam = await Team.findById(team._id);
      expect(deletedTeam).toBeNull();
    });

    it('should not delete team when team manager', async () => {
      const res = await request(app)
        .delete(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${teamManagerToken}`);

      expect(res.status).toBe(403);
    });

    it('should not delete team when viewer', async () => {
      const res = await request(app)
        .delete(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/teams/:id/stats', () => {
    let team;

    beforeEach(async () => {
      team = await Team.create({
        ...validTeam,
        stats: {
          matchesPlayed: 10,
          matchesWon: 6,
          matchesLost: 3,
          matchesDrawn: 1,
          points: 13,
          netRunRate: 0.5
        }
      });
    });

    it('should get team statistics', async () => {
      const res = await request(app).get(`/api/teams/${team._id}/stats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('matchStats');
      expect(res.body.data.matchStats).toHaveProperty('matchesPlayed', 10);
      expect(res.body.data.matchStats).toHaveProperty('matchesWon', 6);
      expect(res.body.data).toHaveProperty('winPercentage', '60.00');
    });

    it('should return 404 for non-existent team stats', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/teams/${fakeId}/stats`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});