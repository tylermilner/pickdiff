// Mock simple-git before importing the app
jest.mock('simple-git');
const simpleGit = require('simple-git');
const request = require('supertest');
const { createApp } = require('../../server');


describe('PickDiff Server API', () => {
  let app;
  let mockGit;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mock git instance
    mockGit = {
      raw: jest.fn(),
      diff: jest.fn(),
      show: jest.fn()
    };
    
    // Mock simple-git to return our mock instance
    simpleGit.mockReturnValue(mockGit);

    // Recreate the app for each test to ensure clean state
    app = createApp(mockGit, '/test/repo');
  });

  describe('GET /api/repo-path', () => {
    it('should return the repository path', async () => {
      const response = await request(app)
        .get('/api/repo-path')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('path');
      expect(typeof response.body.path).toBe('string');
      expect(response.body.path).toBe('/test/repo');
    });
  });

  describe('GET /api/files', () => {
    it('should return list of files when git command succeeds', async () => {
      const mockFiles = 'file1.js\nfile2.js\nfile3.js\n';
      mockGit.raw.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/api/files')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(['file1.js', 'file2.js', 'file3.js']);
      expect(mockGit.raw).toHaveBeenCalledWith(['ls-files']);
    });

    it('should return 500 error when git command fails', async () => {
      mockGit.raw.mockRejectedValue(new Error('Git error'));

      const response = await request(app)
        .get('/api/files')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Git error');
    });

    it('should filter out empty strings from file list', async () => {
      const mockFiles = 'file1.js\n\nfile2.js\n\n';
      mockGit.raw.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/api/files')
        .expect(200);

      expect(response.body).toEqual(['file1.js', 'file2.js']);
    });
  });

  describe('POST /api/diff', () => {
    const validRequestBody = {
      startCommit: 'abc123',
      endCommit: 'def456',
      files: ['file1.js', 'file2.js']
    };

    it('should return diffs for specified files', async () => {
      mockGit.diff.mockImplementation((args) => {
        if (args.includes('file1.js')) {
          return Promise.resolve('-old line\n+new line');
        }
        if (args.includes('file2.js')) {
          return Promise.resolve('+added line');
        }
        return Promise.resolve('');
      });

      const response = await request(app)
        .post('/api/diff')
        .send(validRequestBody)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body['file1.js']).toBe('-old line\n+new line');
      expect(response.body['file2.js']).toBe('+added line');
      expect(mockGit.diff).toHaveBeenCalledTimes(2);
    });

    it('should handle new files with empty diff', async () => {
      mockGit.diff.mockResolvedValue(''); // Empty diff indicates new file
      mockGit.show.mockResolvedValue('line1\nline2\nline3');

      const response = await request(app)
        .post('/api/diff')
        .send({
          startCommit: 'abc123',
          endCommit: 'def456',
          files: ['newfile.js']
        })
        .expect(200);

      expect(response.body['newfile.js']).toBe('+line1\n+line2\n+line3');
      expect(mockGit.show).toHaveBeenCalledWith(['def456:newfile.js']);
    });

    it('should return 400 for missing startCommit', async () => {
      const response = await request(app)
        .post('/api/diff')
        .send({
          endCommit: 'def456',
          files: ['file1.js']
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required parameters.');
    });

    it('should return 400 for missing endCommit', async () => {
      const response = await request(app)
        .post('/api/diff')
        .send({
          startCommit: 'abc123',
          files: ['file1.js']
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required parameters.');
    });

    it('should return 400 for missing files', async () => {
      const response = await request(app)
        .post('/api/diff')
        .send({
          startCommit: 'abc123',
          endCommit: 'def456'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required parameters.');
    });

    it('should return 400 for invalid files parameter (not array)', async () => {
      const response = await request(app)
        .post('/api/diff')
        .send({
          startCommit: 'abc123',
          endCommit: 'def456',
          files: 'not-an-array'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required parameters.');
    });

    it('should return 500 error when git diff fails', async () => {
      mockGit.diff.mockRejectedValue(new Error('Git diff error'));

      const response = await request(app)
        .post('/api/diff')
        .send(validRequestBody)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Git diff error');
    });

    it('should return 500 error when git show fails for new file', async () => {
      mockGit.diff.mockResolvedValue(''); // Empty diff
      mockGit.show.mockRejectedValue(new Error('Git show error'));

      const response = await request(app)
        .post('/api/diff')
        .send({
          startCommit: 'abc123',
          endCommit: 'def456',
          files: ['newfile.js']
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Git show error');
    });
  });
});