const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');

describe('PickDiff Integration Tests', () => {
  let server;
  let serverUrl = 'http://localhost:3001'; // Use different port to avoid conflicts
  
  beforeAll(async () => {
    // Start the actual server for integration testing
    server = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, PORT: '3001' },
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise((resolve) => {
      server.stdout.on('data', (data) => {
        if (data.toString().includes('Server is running')) {
          resolve();
        }
      });
    });
  });
  
  afterAll(async () => {
    if (server) {
      server.kill();
      // Wait for server to shut down
      await new Promise((resolve) => {
        server.on('close', resolve);
      });
    }
  });

  describe('Real API Integration', () => {
    it('should serve the main HTML page', async () => {
      const response = await request(serverUrl)
        .get('/')
        .expect(200);
      
      expect(response.text).toContain('<title>PickDiff</title>');
      expect(response.text).toContain('<h1 class="text-center">PickDiff</h1>');
    });

    it('should return repository path from real git repo', async () => {
      const response = await request(serverUrl)
        .get('/api/repo-path')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('path');
      expect(response.body.path).toContain('pickdiff');
    });

    it('should return actual files from the repository', async () => {
      const response = await request(serverUrl)
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
      const response = await request(serverUrl)
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
        
        const response = await request(serverUrl)
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
      const response = await request(serverUrl)
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