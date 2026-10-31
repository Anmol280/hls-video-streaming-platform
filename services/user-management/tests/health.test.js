jest.mock('../src/routes/auth', () => jest.requireActual('express').Router());
jest.mock('../src/routes/users', () => jest.requireActual('express').Router());
jest.mock('../src/middleware/errorHandler', () => ({
  errorHandler: (_error, _req, res, _next) => res.status(500).json({ error: 'Internal server error' }),
}));

const request = require('supertest');
const app = require('../src');

describe('user-management health route', () => {
  test('returns the service liveness response', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'healthy',
      service: 'user-management',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});
