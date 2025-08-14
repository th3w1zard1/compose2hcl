// Main exports for the nomad-compose package
export { NomadClient } from './nomad-client';
export { DeploymentService } from './deployment-service';
export type {
  NomadClientConfig,
  NomadJobSubmission,
  NomadJobResponse,
  NomadAllocation,
  NomadEvaluation,
  NomadNode,
  DeployOptions,
  DeployResult,
} from './types/nomad-client';

// Re-export compose2hcl types for convenience
export type {
  DockerComposeFile,
  Service as ComposeService,
  Network,
  Volume,
  Config,
  Secret,
  ComposeValidationResult,
  ComposeConversionResult,
} from 'compose2hcl';

// Main function for programmatic usage
export async function deployComposeToNomad(
  composeContent: string,
  nomadConfig: {
    address: string;
    token?: string;
    region?: string;
    namespace?: string;
    timeout?: number;
  },
  options: {
    dryRun?: boolean;
    waitForDeployment?: boolean;
    timeout?: number;
    force?: boolean;
    checkHealth?: boolean;
  } = {}
) {
  const nomadClient = new NomadClient(nomadConfig);
  const deploymentService = new DeploymentService(nomadClient);
  
  return deploymentService.deployComposeContent(composeContent, options);
}

// Utility function for converting compose to HCL
export async function convertComposeToHCL(composeContent: string) {
  const { convertCompose, validateComposeFile } = await import('compose2hcl');
  
  const validation = validateComposeFile(composeContent);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  const conversion = convertCompose(composeContent);
  if (!conversion.success) {
    throw new Error(`Conversion failed: ${conversion.errors.join(', ')}`);
  }
  
  return {
    hcl: conversion.hcl,
    warnings: conversion.warnings,
  };
}
