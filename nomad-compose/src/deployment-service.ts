import { readFile, writeFile, ensureDir, pathExists } from 'fs-extra';
import { join, dirname, basename } from 'path';
import { NomadClient } from './nomad-client';
import { DeployOptions, DeployResult } from './types/nomad-client';
import { convertCompose, validateComposeFile } from 'compose2hcl';

export class DeploymentService {
  private nomadClient: NomadClient;

  constructor(nomadClient: NomadClient) {
    this.nomadClient = nomadClient;
  }

  /**
   * Deploy a Docker Compose file to Nomad
   */
  async deployComposeFile(
    composeFilePath: string,
    options: DeployOptions = {}
  ): Promise<DeployResult> {
    const result: DeployResult = {
      success: false,
      message: '',
      warnings: [],
      errors: [],
    };

    try {
      // Read and validate the Docker Compose file
      const composeContent = await readFile(composeFilePath, 'utf-8');
      
      // Validate the compose file
      const validation = validateComposeFile(composeContent);
      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        result.message = 'Docker Compose file validation failed';
        return result;
      }

      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }

      // Convert to Nomad HCL
      const conversion = convertCompose(composeContent);
      if (!conversion.success) {
        result.errors.push(...conversion.errors);
        result.message = 'Failed to convert Docker Compose to Nomad HCL';
        return result;
      }

      if (conversion.warnings.length > 0) {
        result.warnings.push(...conversion.warnings);
      }

      const nomadHcl = conversion.hcl;

      // If dry run, just return the HCL
      if (options.dryRun) {
        result.success = true;
        result.message = 'Dry run completed successfully';
        return result;
      }

      // Submit the job to Nomad
      const jobResponse = await this.nomadClient.submitJob(nomadHcl);
      result.jobId = jobResponse.ID;
      result.jobUrl = `${this.nomadClient['config'].address}/ui/jobs/${jobResponse.ID}`;

      // Wait for deployment if requested
      if (options.waitForDeployment) {
        await this.waitForJobDeployment(jobResponse.ID, options.timeout || 300000);
      }

      result.success = true;
      result.message = `Job deployed successfully with ID: ${jobResponse.ID}`;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.message = 'Deployment failed';
    }

    return result;
  }

  /**
   * Deploy from a string content instead of a file
   */
  async deployComposeContent(
    composeContent: string,
    options: DeployOptions = {}
  ): Promise<DeployResult> {
    const result: DeployResult = {
      success: false,
      message: '',
      warnings: [],
      errors: [],
    };

    try {
      // Validate the compose content
      const validation = validateComposeFile(composeContent);
      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        result.message = 'Docker Compose content validation failed';
        return result;
      }

      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }

      // Convert to Nomad HCL
      const conversion = convertCompose(composeContent);
      if (!conversion.success) {
        result.errors.push(...conversion.errors);
        result.message = 'Failed to convert Docker Compose to Nomad HCL';
        return result;
      }

      if (conversion.warnings.length > 0) {
        result.warnings.push(...conversion.warnings);
      }

      const nomadHcl = conversion.hcl;

      // If dry run, just return the HCL
      if (options.dryRun) {
        result.success = true;
        result.message = 'Dry run completed successfully';
        return result;
      }

      // Submit the job to Nomad
      const jobResponse = await this.nomadClient.submitJob(nomadHcl);
      result.jobId = jobResponse.ID;
      result.jobUrl = `${this.nomadClient['config'].address}/ui/jobs/${jobResponse.ID}`;

      // Wait for deployment if requested
      if (options.waitForDeployment) {
        await this.waitForJobDeployment(jobResponse.ID, options.timeout || 300000);
      }

      result.success = true;
      result.message = `Job deployed successfully with ID: ${jobResponse.ID}`;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.message = 'Deployment failed';
    }

    return result;
  }

  /**
   * Convert a Docker Compose file to Nomad HCL without deploying
   */
  async convertComposeFile(composeFilePath: string): Promise<{ success: boolean; hcl?: string; errors: string[]; warnings: string[] }> {
    try {
      const composeContent = await readFile(composeFilePath, 'utf-8');
      const validation = validateComposeFile(composeContent);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      const conversion = convertCompose(composeContent);
      return {
        success: conversion.success,
        hcl: conversion.hcl,
        errors: conversion.errors,
        warnings: conversion.warnings,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      };
    }
  }

  /**
   * Save the converted HCL to a file
   */
  async saveHclToFile(hcl: string, outputPath: string): Promise<void> {
    await ensureDir(dirname(outputPath));
    await writeFile(outputPath, hcl, 'utf-8');
  }

  /**
   * Wait for a job to be fully deployed
   */
  private async waitForJobDeployment(jobId: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const job = await this.nomadClient.getJob(jobId);
        
        if (job.Status === 'running') {
          return; // Job is running
        }
        
        if (job.Status === 'dead' || job.Status === 'failed') {
          throw new Error(`Job deployment failed with status: ${job.Status}`);
        }
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        // Continue waiting unless it's a fatal error
        if (error instanceof Error && error.message.includes('deployment failed')) {
          throw error;
        }
      }
    }
    
    throw new Error(`Deployment timeout after ${timeout}ms`);
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(jobId: string): Promise<{
    job: any;
    allocations: any[];
    evaluations: any[];
  }> {
    const [job, allocations, evaluations] = await Promise.all([
      this.nomadClient.getJob(jobId),
      this.nomadClient.getJobAllocations(jobId),
      this.nomadClient.getJobEvaluations(jobId),
    ]);

    return { job, allocations, evaluations };
  }

  /**
   * Stop a deployed job
   */
  async stopJob(jobId: string, purge: boolean = false): Promise<void> {
    await this.nomadClient.stopJob(jobId, { purge });
  }
}
