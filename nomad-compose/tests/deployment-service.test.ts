import { DeploymentService } from '../src/deployment-service';
import { NomadClient } from '../src/nomad-client';
import { DeployOptions } from '../src/types/nomad-client';

// Mock the compose2hcl package
jest.mock('compose2hcl', () => ({
  convertCompose: jest.fn(),
  validateComposeFile: jest.fn(),
}));

// Mock fs-extra
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  ensureDir: jest.fn(),
  pathExists: jest.fn(),
}));

describe('DeploymentService', () => {
  let deploymentService: DeploymentService;
  let mockNomadClient: jest.Mocked<NomadClient>;

  beforeEach(() => {
    mockNomadClient = {
      submitJob: jest.fn(),
      getJob: jest.fn(),
      getJobAllocations: jest.fn(),
      getJobEvaluations: jest.fn(),
      stopJob: jest.fn(),
      healthCheck: jest.fn(),
      getStatus: jest.fn(),
      getNode: jest.fn(),
      getNodes: jest.fn(),
    } as any;

    deploymentService = new DeploymentService(mockNomadClient);
  });

  describe('deployComposeFile', () => {
    const mockComposeContent = `
      version: '3.8'
      services:
        web:
          image: nginx:alpine
          ports:
            - "80:80"
    `;

    beforeEach(() => {
      const { readFile } = require('fs-extra');
      readFile.mockResolvedValue(mockComposeContent);
    });

    it('should deploy a compose file successfully', async () => {
      const { validateComposeFile, convertCompose } = require('compose2hcl');
      
      validateComposeFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      convertCompose.mockReturnValue({
        success: true,
        hcl: 'job "web" { ... }',
        errors: [],
        warnings: [],
      });

      mockNomadClient.submitJob.mockResolvedValue({
        ID: 'job-123',
        Name: 'web',
        Status: 'pending',
      } as any);

      const result = await deploymentService.deployComposeFile('docker-compose.yml');

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(result.message).toContain('Job deployed successfully');
      expect(mockNomadClient.submitJob).toHaveBeenCalledWith('job "web" { ... }');
    });

    it('should handle validation errors', async () => {
      const { validateComposeFile } = require('compose2hcl');
      
      validateComposeFile.mockReturnValue({
        isValid: false,
        errors: ['Invalid service definition'],
        warnings: [],
      });

      const result = await deploymentService.deployComposeFile('docker-compose.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid service definition');
      expect(result.message).toBe('Docker Compose file validation failed');
      expect(mockNomadClient.submitJob).not.toHaveBeenCalled();
    });

    it('should handle conversion errors', async () => {
      const { validateComposeFile, convertCompose } = require('compose2hcl');
      
      validateComposeFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      convertCompose.mockReturnValue({
        success: false,
        hcl: '',
        errors: ['Conversion failed'],
        warnings: [],
      });

      const result = await deploymentService.deployComposeFile('docker-compose.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Conversion failed');
      expect(result.message).toBe('Failed to convert Docker Compose to Nomad HCL');
      expect(mockNomadClient.submitJob).not.toHaveBeenCalled();
    });

    it('should perform dry run when requested', async () => {
      const { validateComposeFile, convertCompose } = require('compose2hcl');
      
      validateComposeFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      convertCompose.mockReturnValue({
        success: true,
        hcl: 'job "web" { ... }',
        errors: [],
        warnings: [],
      });

      const options: DeployOptions = { dryRun: true };
      const result = await deploymentService.deployComposeFile('docker-compose.yml', options);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Dry run completed successfully');
      expect(mockNomadClient.submitJob).not.toHaveBeenCalled();
    });

    it('should wait for deployment when requested', async () => {
      const { validateComposeFile, convertCompose } = require('compose2hcl');
      
      validateComposeFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      convertCompose.mockReturnValue({
        success: true,
        hcl: 'job "web" { ... }',
        errors: [],
        warnings: [],
      });

      mockNomadClient.submitJob.mockResolvedValue({
        ID: 'job-123',
        Name: 'web',
        Status: 'pending',
      } as any);

      // Mock the job status to eventually return 'running'
      mockNomadClient.getJob
        .mockResolvedValueOnce({ Status: 'pending' } as any)
        .mockResolvedValueOnce({ Status: 'running' } as any);

      const options: DeployOptions = { waitForDeployment: true, timeout: 10000 };
      const result = await deploymentService.deployComposeFile('docker-compose.yml', options);

      expect(result.success).toBe(true);
      expect(mockNomadClient.getJob).toHaveBeenCalledWith('job-123');
    });
  });

  describe('deployComposeContent', () => {
    const mockComposeContent = `
      version: '3.8'
      services:
        web:
          image: nginx:alpine
    `;

    it('should deploy compose content successfully', async () => {
      const { validateComposeFile, convertCompose } = require('compose2hcl');
      
      validateComposeFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      convertCompose.mockReturnValue({
        success: true,
        hcl: 'job "web" { ... }',
        errors: [],
        warnings: [],
      });

      mockNomadClient.submitJob.mockResolvedValue({
        ID: 'job-123',
        Name: 'web',
        Status: 'pending',
      } as any);

      const result = await deploymentService.deployComposeContent(mockComposeContent);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
    });
  });

  describe('convertComposeFile', () => {
    const mockComposeContent = `
      version: '3.8'
      services:
        web:
          image: nginx:alpine
    `;

    beforeEach(() => {
      const { readFile } = require('fs-extra');
      readFile.mockResolvedValue(mockComposeContent);
    });

    it('should convert compose file successfully', async () => {
      const { validateComposeFile, convertCompose } = require('compose2hcl');
      
      validateComposeFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      convertCompose.mockReturnValue({
        success: true,
        hcl: 'job "web" { ... }',
        errors: [],
        warnings: [],
      });

      const result = await deploymentService.convertComposeFile('docker-compose.yml');

      expect(result.success).toBe(true);
      expect(result.hcl).toBe('job "web" { ... }');
    });

    it('should handle validation errors during conversion', async () => {
      const { validateComposeFile } = require('compose2hcl');
      
      validateComposeFile.mockReturnValue({
        isValid: false,
        errors: ['Invalid service definition'],
        warnings: [],
      });

      const result = await deploymentService.convertComposeFile('docker-compose.yml');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid service definition');
    });
  });

  describe('saveHclToFile', () => {
    it('should save HCL to file successfully', async () => {
      const { ensureDir, writeFile } = require('fs-extra');
      ensureDir.mockResolvedValue(undefined);
      writeFile.mockResolvedValue(undefined);

      await deploymentService.saveHclToFile('job "web" { ... }', '/tmp/output.hcl');

      expect(ensureDir).toHaveBeenCalledWith('/tmp');
      expect(writeFile).toHaveBeenCalledWith('/tmp/output.hcl', 'job "web" { ... }', 'utf-8');
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return deployment status', async () => {
      const mockJob = { ID: 'job-123', Name: 'web', Status: 'running' };
      const mockAllocations = [{ ID: 'alloc-123', ClientStatus: 'running' }];
      const mockEvaluations = [{ ID: 'eval-123', Status: 'complete' }];

      mockNomadClient.getJob.mockResolvedValue(mockJob as any);
      mockNomadClient.getJobAllocations.mockResolvedValue(mockAllocations as any);
      mockNomadClient.getJobEvaluations.mockResolvedValue(mockEvaluations as any);

      const result = await deploymentService.getDeploymentStatus('job-123');

      expect(result.job).toEqual(mockJob);
      expect(result.allocations).toEqual(mockAllocations);
      expect(result.evaluations).toEqual(mockEvaluations);
    });
  });

  describe('stopJob', () => {
    it('should stop a job successfully', async () => {
      mockNomadClient.stopJob.mockResolvedValue(undefined);

      await deploymentService.stopJob('job-123');

      expect(mockNomadClient.stopJob).toHaveBeenCalledWith('job-123', {});
    });

    it('should stop and purge a job', async () => {
      mockNomadClient.stopJob.mockResolvedValue(undefined);

      await deploymentService.stopJob('job-123', true);

      expect(mockNomadClient.stopJob).toHaveBeenCalledWith('job-123', { purge: true });
    });
  });
});
