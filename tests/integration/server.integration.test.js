const request = require('supertest');
const path = require('path');
const simpleGit = require('simple-git');
const { createApp } = require('../../server');

describe('PickDiff Integration Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Use the real simpleGit and repoPath for integration
    const repoPath = path.join(__dirname, '../..');
    const git = simpleGit(repoPath);
    app = createApp(git, repoPath);
    server = app.listen(); // Let the OS pick an available port
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Real API Integration', () => {
    it('should serve the main HTML page', async () => {
      const response = await request(server)
        .get('/')
        .expect(200);
      
      expect(response.text).toContain('<title>PickDiff</title>');
      expect(response.text).toContain('<h1 class="text-center">PickDiff</h1>');
    });

    it('should return repository path from real git repo', async () => {
      const response = await request(server)
        .get('/api/repo-path')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('path');
      expect(response.body.path).toContain('pickdiff');
    });

    it('should return actual files from the repository', async () => {
      const response = await request(server)
        .get('/api/files')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Should contain some of our known files
      expect(response.body).toContain('package.json');
      expect(response.body).toContain('server.js');
      expect(response.body).toContain('README.md');
    });

    it('should serve static files correctly', async () => {
      const response = await request(server)
        .get('/script.js')
        .expect(200);
      
      expect(response.text).toContain('document.addEventListener');
    });

    it('should handle diff request with real commits', async () => {
      // First get the actual commit history
      const { execSync } = require('child_process');
      const commits = execSync('git log --oneline -2 --format="%H"', {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf8'
      }).trim().split('\n');
      
      if (commits.length >= 2) {
        const [endCommit, startCommit] = commits;
        
        const response = await request(server)
          .post('/api/diff')
          .send({
            startCommit: startCommit,
            endCommit: endCommit,
            files: ['package.json']
          })
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body['package.json']).toBeDefined();
      }
    });

    it('should return 400 for invalid diff request', async () => {
      const response = await request(server)
        .post('/api/diff')
        .send({
          startCommit: 'invalid',
          // Missing endCommit and files to trigger validation error
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required parameters.');
    });
  });
});