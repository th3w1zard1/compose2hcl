import { NomadClient } from '../src/nomad-client';
import { NomadClientConfig } from '../src/types/nomad-client';

describe('NomadClient', () => {
  let nomadClient: NomadClient;
  const mockConfig: NomadClientConfig = {
    address: 'http://localhost:4646',
    token: 'test-token',
    region: 'test-region',
    namespace: 'test-namespace',
    timeout: 5000,
  };

  beforeEach(() => {
    nomadClient = new NomadClient(mockConfig);
  });

  describe('constructor', () => {
    it('should create a client with default values', () => {
      const client = new NomadClient({ address: 'http://test:4646' });
      expect(client).toBeInstanceOf(NomadClient);
    });

    it('should merge provided config with defaults', () => {
      const client = new NomadClient({
        address: 'http://custom:4646',
        region: 'custom-region',
      });
      expect(client).toBeInstanceOf(NomadClient);
    });
  });

  describe('healthCheck', () => {
    it('should return true when Nomad is accessible', async () => {
      // Mock the axios client to return success
      const mockGet = jest.fn().mockResolvedValue({ data: 'test-leader' });
      (nomadClient as any).client = { get: mockGet };

      const result = await nomadClient.healthCheck();
      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('/v1/status/leader');
    });

    it('should return false when Nomad is not accessible', async () => {
      // Mock the axios client to throw an error
      const mockGet = jest.fn().mockRejectedValue(new Error('Connection failed'));
      (nomadClient as any).client = { get: mockGet };

      const result = await nomadClient.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return cluster status information', async () => {
      const mockLeaderResponse = { data: 'leader-123' };
      const mockPeersResponse = { data: ['peer1', 'peer2'] };
      
      const mockGet = jest.fn()
        .mockResolvedValueOnce(mockLeaderResponse)
        .mockResolvedValueOnce(mockPeersResponse);
      
      (nomadClient as any).client = { get: mockGet };

      const result = await nomadClient.getStatus();
      
      expect(result).toEqual({
        leader: 'leader-123',
        servers: ['peer1', 'peer2'],
      });
      
      expect(mockGet).toHaveBeenCalledWith('/v1/status/leader');
      expect(mockGet).toHaveBeenCalledWith('/v1/status/peers');
    });
  });

  describe('submitJob', () => {
    it('should submit a job successfully', async () => {
      const mockJobResponse = {
        ID: 'job-123',
        Name: 'test-job',
        Status: 'pending',
      };
      
      const mockPost = jest.fn().mockResolvedValue({ data: mockJobResponse });
      (nomadClient as any).client = { post: mockPost };

      const result = await nomadClient.submitJob('job hcl content');
      
      expect(result).toEqual(mockJobResponse);
      expect(mockPost).toHaveBeenCalledWith('/v1/jobs', {
        Job: 'job hcl content',
        Region: 'test-region',
        Namespace: 'test-namespace',
      });
    });
  });

  describe('getJob', () => {
    it('should get job information', async () => {
      const mockJobResponse = {
        ID: 'job-123',
        Name: 'test-job',
        Status: 'running',
      };
      
      const mockGet = jest.fn().mockResolvedValue({ data: mockJobResponse });
      (nomadClient as any).client = { get: mockGet };

      const result = await nomadClient.getJob('job-123');
      
      expect(result).toEqual(mockJobResponse);
      expect(mockGet).toHaveBeenCalledWith('/v1/job/job-123?region=test-region&namespace=test-namespace');
    });
  });

  describe('stopJob', () => {
    it('should stop a job successfully', async () => {
      const mockDelete = jest.fn().mockResolvedValue({});
      (nomadClient as any).client = { delete: mockDelete };

      await nomadClient.stopJob('job-123');
      
      expect(mockDelete).toHaveBeenCalledWith('/v1/job/job-123?region=test-region&namespace=test-namespace');
    });

    it('should stop and purge a job', async () => {
      const mockDelete = jest.fn().mockResolvedValue({});
      (nomadClient as any).client = { delete: mockDelete };

      await nomadClient.stopJob('job-123', { purge: true });
      
      expect(mockDelete).toHaveBeenCalledWith('/v1/job/job-123?region=test-region&namespace=test-namespace&purge=true');
    });
  });
});
