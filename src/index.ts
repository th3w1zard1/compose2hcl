/**
 * Compose2HCL - Docker Compose to Nomad HCL Converter
 * 
 * A comprehensive Node.js library for converting Docker Compose files
 * to Nomad job specifications with full feature support.
 */

export { Compose2HCLConverter, ConversionOptions, ConversionResult } from './converter';
export { generateHCL, HCLGeneratorOptions } from './generators/hcl-generator';
export { validateComposeFile, validateComposeVersion, ValidationResult } from './validation/compose-validator';

// Type exports - avoid conflicts by being explicit
export type {
  DockerComposeFile,
  Service as ComposeService,
  Build,
  Environment,
  Port as ComposePort,
  Networks,
  NetworkConfig,
  Volume as ComposeVolume,
  BindOptions,
  VolumeOptions,
  TmpfsOptions,
  Device as ComposeDevice,
  HealthCheck,
  DependsOn,
  DependsOnConfig,
  RestartPolicy,
  Logging,
  Labels,
  Deploy,
  UpdateConfig,
  RollbackConfig,
  Resources as ComposeResources,
  ResourceLimit,
  ResourceReservation,
  DeviceRequest,
  GenericResource,
  RestartPolicyConfig,
  Placement,
  PlacementPreference,
  ConfigRef,
  SecretRef,
  Ulimits,
  UlimitConfig,
  Extends,
  Network as ComposeNetwork,
  ExternalNetwork,
  IPAM,
  IPAMConfig,
  Volume as ComposeVolumeDef,
  ExternalVolume,
  Config as ComposeConfig,
  ExternalConfig,
  Secret as ComposeSecret,
  ExternalSecret,
  Include
} from './types/compose';

export type {
  NomadJob,
  JobSpec,
  TaskGroup,
  Task,
  Constraint,
  ConstraintOperator,
  Affinity,
  Spread,
  SpreadTarget,
  Network as NomadNetwork,
  NetworkMode,
  Port as NomadPort,
  DNS,
  Volume as NomadVolume,
  VolumeType,
  AccessMode,
  AttachmentMode,
  MountOptions,
  VolumeMount,
  PropagationMode,
  Service as NomadService,
  AddressMode,
  ServiceProvider,
  OnUpdate,
  Check,
  CheckType,
  CheckProtocol,
  CheckStatus,
  CheckRestart,
  Connect,
  Gateway,
  SidecarService,
  SidecarTask,
  Resources as NomadResources,
  Device as NomadDevice,
  Artifact,
  ArtifactMode,
  Template,
  ChangeMode,
  Vault,
  Logs,
  Restart,
  RestartMode,
  Migrate,
  MigrateHealthCheck,
  Reschedule,
  DelayFunction,
  Update,
  UpdateHealthCheck,
  Lifecycle,
  LifecycleHook,
  Scaling,
  Consul,
  CSIPlugin,
  CSIPluginType
} from './types/nomad';

// Import all required functions
import { Compose2HCLConverter, ConversionOptions, ConversionResult } from './converter';
import { generateHCL, HCLGeneratorOptions } from './generators/hcl-generator';
import { validateComposeFile, validateComposeVersion, ValidationResult } from './validation/compose-validator';

/**
 * Convert Docker Compose YAML to Nomad HCL
 * 
 * @param composeContent - Docker Compose YAML content as string
 * @param options - Conversion options
 * @returns Promise resolving to conversion result
 */
export async function convertCompose(
  composeContent: string, 
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const converter = new Compose2HCLConverter(options);
  return await converter.convert(composeContent);
}

/**
 * Convert Docker Compose file to Nomad HCL (synchronous)
 * 
 * @param composeContent - Docker Compose YAML content as string
 * @param options - Conversion options
 * @returns Conversion result
 */
export function convertComposeSync(
  composeContent: string,
  options: ConversionOptions = {}
): ConversionResult {
  const converter = new Compose2HCLConverter(options);
  
  // Since the async version doesn't actually do async work currently,
  // we can safely call it synchronously
  let result: ConversionResult;
  converter.convert(composeContent).then(r => result = r);
  return result!;
}

// Default export for CommonJS compatibility
export default {
  Compose2HCLConverter,
  convertCompose,
  convertComposeSync,
  generateHCL,
  validateComposeFile,
  validateComposeVersion,
};

// Version info
export const VERSION = '1.0.0';
export const SUPPORTED_COMPOSE_VERSIONS = ['3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9'];
export const SUPPORTED_NOMAD_VERSIONS = ['1.4+', '1.5+', '1.6+'];

/**
 * Library information
 */
export const INFO = {
  name: 'compose2hcl',
  version: VERSION,
  description: 'Complete Docker Compose to Nomad HCL converter with full spec compliance',
  supportedComposeVersions: SUPPORTED_COMPOSE_VERSIONS,
  supportedNomadVersions: SUPPORTED_NOMAD_VERSIONS,
  features: [
    'Complete Docker Compose specification support',
    'Full Nomad HCL generation',
    'Comprehensive validation',
    'TypeScript support',
    'CLI and programmatic usage',
    'Web interface support',
  ],
};
