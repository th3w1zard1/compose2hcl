import Joi from 'joi';
import { DockerComposeFile } from '../types/compose';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Docker Compose file structure and content
 */
export function validateComposeFile(compose: DockerComposeFile): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic structure validation
    const { error } = composeSchema.validate(compose, { 
      allowUnknown: true,
      abortEarly: false,
    });

    if (error) {
      error.details.forEach(detail => {
        errors.push(detail.message);
      });
    }

    // Custom validation logic
    validateServices(compose, errors, warnings);
    validateNetworks(compose, errors, warnings);
    validateVolumes(compose, errors, warnings);
    validateConfigs(compose, errors, warnings);
    validateSecrets(compose, errors, warnings);

  } catch (err) {
    errors.push(`Validation error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Joi schema for Docker Compose file validation
 */
const composeSchema = Joi.object({
  version: Joi.string().optional(),
  name: Joi.string().optional(),
  services: Joi.object().pattern(
    Joi.string(),
    Joi.object().unknown(true)
  ).optional(),
  networks: Joi.object().optional(),
  volumes: Joi.object().optional(),
  configs: Joi.object().optional(),
  secrets: Joi.object().optional(),
  include: Joi.array().optional(),
  x: Joi.object().optional(),
}).unknown(true);

/**
 * Service validation schema
 */
const serviceSchema = Joi.object({
  image: Joi.string().optional(),
  build: Joi.alternatives().try(
    Joi.string(),
    Joi.object({
      context: Joi.string().optional(),
      dockerfile: Joi.string().optional(),
      args: Joi.object().optional(),
      target: Joi.string().optional(),
    }).unknown(true)
  ).optional(),
  container_name: Joi.string().optional(),
  hostname: Joi.string().optional(),
  command: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  entrypoint: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  environment: Joi.alternatives().try(
    Joi.object(),
    Joi.array().items(Joi.string())
  ).optional(),
  env_file: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  working_dir: Joi.string().optional(),
  user: Joi.string().optional(),
  ports: Joi.array().items(
    Joi.alternatives().try(
      Joi.string(),
      Joi.object({
        target: Joi.number().optional(),
        published: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
        protocol: Joi.string().valid('tcp', 'udp').optional(),
        mode: Joi.string().valid('host', 'ingress').optional(),
      }).unknown(true)
    )
  ).optional(),
  expose: Joi.array().items(Joi.string()).optional(),
  volumes: Joi.array().optional(),
  networks: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.object()
  ).optional(),
  depends_on: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.object()
  ).optional(),
  restart: Joi.string().valid('no', 'always', 'on-failure', 'unless-stopped').optional(),
  healthcheck: Joi.object({
    test: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ).optional(),
    interval: Joi.string().optional(),
    timeout: Joi.string().optional(),
    retries: Joi.number().optional(),
    start_period: Joi.string().optional(),
    disable: Joi.boolean().optional(),
  }).optional(),
  deploy: Joi.object().optional(),
  labels: Joi.alternatives().try(
    Joi.object(),
    Joi.array().items(Joi.string())
  ).optional(),
  logging: Joi.object({
    driver: Joi.string().optional(),
    options: Joi.object().optional(),
  }).optional(),
}).unknown(true);

/**
 * Validate services section
 */
function validateServices(compose: DockerComposeFile, errors: string[], warnings: string[]) {
  if (!compose.services) {
    errors.push('No services defined');
    return;
  }

  for (const [serviceName, service] of Object.entries(compose.services)) {
    // Validate service has image or build
    if (!service.image && !service.build) {
      errors.push(`Service '${serviceName}' must have either 'image' or 'build' specified`);
    }

    // Validate port formats
    if (service.ports) {
      service.ports.forEach((port, index) => {
        if (typeof port === 'string') {
          if (!/^\d+(?::\d+)?(?:\/(?:tcp|udp))?$/.test(port)) {
            warnings.push(`Service '${serviceName}' port ${index} has unusual format: ${port}`);
          }
        }
      });
    }

    // Validate volume mounts
    if (service.volumes) {
      service.volumes.forEach((volume, index) => {
        if (typeof volume === 'string') {
          const parts = (volume as string).split(':');
          if (parts.length > 3) {
            warnings.push(`Service '${serviceName}' volume ${index} has complex format that may not convert properly: ${volume}`);
          }
        }
      });
    }

    // Validate depends_on references
    if (service.depends_on) {
      const dependencies: string[] = Array.isArray(service.depends_on) 
        ? service.depends_on 
        : Object.keys(service.depends_on);
      
      dependencies.forEach(dep => {
        if (!compose.services![dep]) {
          errors.push(`Service '${serviceName}' depends on undefined service '${dep}'`);
        }
      });
    }

    // Validate network references
    if (service.networks) {
      const networks: string[] = Array.isArray(service.networks) 
        ? service.networks 
        : Object.keys(service.networks);
      
      networks.forEach(network => {
        if (network !== 'default' && !compose.networks?.[network]) {
          warnings.push(`Service '${serviceName}' references undefined network '${network}'`);
        }
      });
    }

    // Validate config references
    if (service.configs) {
      service.configs.forEach(config => {
        const configName = typeof config === 'string' ? config : config.source;
        if (!compose.configs?.[configName]) {
          errors.push(`Service '${serviceName}' references undefined config '${configName}'`);
        }
      });
    }

    // Validate secret references
    if (service.secrets) {
      service.secrets.forEach(secret => {
        const secretName = typeof secret === 'string' ? secret : secret.source;
        if (!compose.secrets?.[secretName]) {
          errors.push(`Service '${serviceName}' references undefined secret '${secretName}'`);
        }
      });
    }

    // Check for potentially problematic configurations
    if (service.privileged) {
      warnings.push(`Service '${serviceName}' uses privileged mode - ensure Nomad client allows this`);
    }

    if (service.pid === 'host') {
      warnings.push(`Service '${serviceName}' uses host PID namespace - may not be supported in Nomad`);
    }

    if (service.network_mode === 'host') {
      warnings.push(`Service '${serviceName}' uses host networking - ensure Nomad configuration supports this`);
    }

    // Validate resource specifications
    if (service.deploy?.resources) {
      validateResources(serviceName, service.deploy.resources, errors, warnings);
    }
  }
}

/**
 * Validate networks section
 */
function validateNetworks(compose: DockerComposeFile, errors: string[], warnings: string[]) {
  if (!compose.networks) return;

  for (const [networkName, network] of Object.entries(compose.networks)) {
    if (network.driver && !['bridge', 'host', 'none', 'overlay'].includes(network.driver)) {
      warnings.push(`Network '${networkName}' uses driver '${network.driver}' which may not be supported`);
    }

    if (network.external) {
      warnings.push(`Network '${networkName}' is external - ensure it exists in the Nomad environment`);
    }
  }
}

/**
 * Validate volumes section
 */
function validateVolumes(compose: DockerComposeFile, errors: string[], warnings: string[]) {
  if (!compose.volumes) return;

  for (const [volumeName, volume] of Object.entries(compose.volumes)) {
    if (volume.driver && volume.driver !== 'local') {
      warnings.push(`Volume '${volumeName}' uses driver '${volume.driver}' - may need CSI plugin in Nomad`);
    }

    if (volume.external) {
      warnings.push(`Volume '${volumeName}' is external - ensure it exists in the Nomad environment`);
    }
  }
}

/**
 * Validate configs section
 */
function validateConfigs(compose: DockerComposeFile, errors: string[], warnings: string[]) {
  if (!compose.configs) return;

  for (const [configName, config] of Object.entries(compose.configs)) {
    if (!config.file && !config.content && !config.external) {
      errors.push(`Config '${configName}' must specify either 'file', 'content', or 'external'`);
    }

    if (config.external) {
      warnings.push(`Config '${configName}' is external - will be converted to Vault template`);
    }
  }
}

/**
 * Validate secrets section
 */
function validateSecrets(compose: DockerComposeFile, errors: string[], warnings: string[]) {
  if (!compose.secrets) return;

  for (const [secretName, secret] of Object.entries(compose.secrets)) {
    if (!secret.file && !secret.external) {
      errors.push(`Secret '${secretName}' must specify either 'file' or 'external'`);
    }

    if (secret.external) {
      warnings.push(`Secret '${secretName}' is external - will be converted to Vault template`);
    }
  }
}

/**
 * Validate resource specifications
 */
function validateResources(serviceName: string, resources: any, errors: string[], warnings: string[]) {
  if (resources.limits) {
    if (resources.limits.cpus) {
      const cpus = parseFloat(resources.limits.cpus);
      if (isNaN(cpus) || cpus <= 0) {
        errors.push(`Service '${serviceName}' has invalid CPU limit: ${resources.limits.cpus}`);
      }
    }

    if (resources.limits.memory) {
      if (!isValidMemorySpec(resources.limits.memory)) {
        errors.push(`Service '${serviceName}' has invalid memory limit: ${resources.limits.memory}`);
      }
    }

    if (resources.limits.devices) {
      warnings.push(`Service '${serviceName}' uses device limits - ensure Nomad supports required devices`);
    }
  }

  if (resources.reservations) {
    if (resources.reservations.devices) {
      warnings.push(`Service '${serviceName}' uses device reservations - ensure Nomad supports required devices`);
    }

    if (resources.reservations.generic_resources) {
      warnings.push(`Service '${serviceName}' uses generic resources - may need custom Nomad configuration`);
    }
  }
}

/**
 * Check if memory specification is valid
 */
function isValidMemorySpec(memory: string): boolean {
  return /^\d+[bkmg]?$/i.test(memory);
}

/**
 * Validate Docker Compose version compatibility
 */
export function validateComposeVersion(version?: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!version) {
    warnings.push('No version specified - assuming latest');
    return { isValid: true, errors, warnings };
  }

  const supportedVersions = ['3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9'];
  
  if (!supportedVersions.includes(version) && !version.startsWith('3.')) {
    errors.push(`Compose version '${version}' is not supported. Supported versions: ${supportedVersions.join(', ')}`);
  }

  if (version.startsWith('2.') || version.startsWith('1.')) {
    errors.push(`Compose version '${version}' is deprecated and not supported`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
