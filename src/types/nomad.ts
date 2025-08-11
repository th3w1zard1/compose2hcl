/**
 * Nomad Job Specification Types
 * Based on Nomad v1.6+ job specification
 */

export interface NomadJob {
  job: {
    [jobName: string]: JobSpec;
  };
}

export interface JobSpec {
  // Job metadata
  id?: string;
  name?: string;
  type?: JobType;
  priority?: number;
  region?: string;
  namespace?: string;
  datacenters?: string[];
  
  // Job configuration
  all_at_once?: boolean;
  constraint?: Constraint[];
  affinity?: Affinity[];
  spread?: Spread[];
  
  // Scheduling
  migrate?: Migrate;
  reschedule?: Reschedule;
  update?: Update;
  
  // Groups
  group?: Record<string, TaskGroup>;
  
  // Periodic jobs
  periodic?: Periodic;
  
  // Parameterized jobs
  parameterized?: ParameterizedJob;
  
  // Multiregion
  multiregion?: Multiregion;
  
  // Consul
  consul_token?: string;
  
  // Vault
  vault_token?: string;
  vault?: Vault;
  
  // Meta
  meta?: Record<string, string>;
}

export type JobType = 'service' | 'batch' | 'system' | 'sysbatch';

export interface TaskGroup {
  // Group metadata
  count?: number;
  constraint?: Constraint[];
  affinity?: Affinity[];
  spread?: Spread[];
  
  // Networking
  network?: Network;
  
  // Scheduling
  migrate?: Migrate;
  reschedule?: Reschedule;
  restart?: Restart;
  
  // Storage
  volume?: Record<string, Volume>;
  
  // Services
  service?: Service[];
  
  // Tasks
  task?: Record<string, Task>;
  
  // Scaling
  scaling?: Scaling;
  
  // Shutdown
  shutdown_delay?: string;
  stop_after_client_disconnect?: string;
  max_client_disconnect?: string;
  
  // Consul
  consul?: Consul;
  
  // Meta
  meta?: Record<string, string>;
}

export interface Task {
  // Task basics
  driver: string;
  user?: string;
  lifecycle?: Lifecycle;
  
  // Configuration
  config?: Record<string, any>;
  constraint?: Constraint[];
  affinity?: Affinity[];
  
  // Environment
  env?: Record<string, string>;
  
  // Resources
  resources?: Resources;
  
  // Services
  service?: Service[];
  
  // Artifacts
  artifact?: Artifact[];
  
  // Templates
  template?: Template[];
  
  // Vault
  vault?: Vault;
  
  // Logs
  logs?: Logs;
  
  // Restart
  restart?: Restart;
  
  // Kill
  kill_timeout?: string;
  kill_signal?: string;
  
  // Shutdown
  shutdown_delay?: string;
  
  // Leader
  leader?: boolean;
  
  // Meta
  meta?: Record<string, string>;
  
  // Volume mounts
  volume_mount?: Record<string, VolumeMount>;
  
  // CSI
  csi_plugin?: CSIPlugin;
  
  // Scaling policy
  scaling?: Scaling;
}

export interface Constraint {
  attribute?: string;
  operator?: ConstraintOperator;
  value?: string;
}

export type ConstraintOperator = 
  | '=' | '!=' | '>' | '>=' | '<' | '<=' 
  | 'distinct_hosts' | 'distinct_property' 
  | 'regexp' | 'set_contains' | 'set_contains_all' | 'set_contains_any'
  | 'version' | 'semver' | 'is_set' | 'is_not_set';

export interface Affinity {
  attribute?: string;
  operator?: ConstraintOperator;
  value?: string;
  weight?: number;
}

export interface Spread {
  attribute?: string;
  weight?: number;
  target?: Record<string, SpreadTarget>;
}

export interface SpreadTarget {
  percent?: number;
  value?: string;
}

export interface Network {
  mode?: NetworkMode;
  port?: Record<string, Port>;
  dns?: DNS;
}

export type NetworkMode = 'bridge' | 'host' | 'none' | 'cni';

export interface Port {
  static?: number;
  to?: number;
  host_network?: string;
}

export interface DNS {
  servers?: string[];
  searches?: string[];
  options?: string[];
}

export interface Volume {
  type?: VolumeType;
  source?: string;
  read_only?: boolean;
  access_mode?: AccessMode;
  attachment_mode?: AttachmentMode;
  mount_options?: MountOptions;
  per_alloc?: boolean;
}

export type VolumeType = 'host' | 'csi';
export type AccessMode = 'single-node-reader-only' | 'single-node-writer' | 'multi-node-reader-only' | 'multi-node-single-writer' | 'multi-node-multi-writer';
export type AttachmentMode = 'file-system' | 'block-device';

export interface MountOptions {
  fs_type?: string;
  mount_flags?: string[];
}

export interface VolumeMount {
  volume?: string;
  destination?: string;
  read_only?: boolean;
  propagation_mode?: PropagationMode;
}

export type PropagationMode = 'private' | 'host-to-task' | 'bidirectional';

export interface Service {
  name?: string;
  port?: string;
  tags?: string[];
  canary_tags?: string[];
  enable_tag_override?: boolean;
  address_mode?: AddressMode;
  task?: string;
  meta?: Record<string, string>;
  canary_meta?: Record<string, string>;
  tagged_addresses?: Record<string, string>;
  check?: Check[];
  check_restart?: CheckRestart;
  connect?: Connect;
  provider?: ServiceProvider;
  on_update?: OnUpdate;
}

export type AddressMode = 'alloc' | 'driver' | 'host' | 'auto';
export type ServiceProvider = 'consul' | 'nomad';
export type OnUpdate = 'require_healthy' | 'ignore_warnings' | 'ignore';

export interface Check {
  name?: string;
  type?: CheckType;
  command?: string;
  args?: string[];
  path?: string;
  protocol?: CheckProtocol;
  port?: string;
  expose?: boolean;
  address_mode?: AddressMode;
  interval?: string;
  timeout?: string;
  initial_status?: CheckStatus;
  tls_skip_verify?: boolean;
  header?: Record<string, string[]>;
  method?: string;
  body?: string;
  success_before_passing?: number;
  failures_before_critical?: number;
  failures_before_warning?: number;
  task?: string;
  on_update?: OnUpdate;
}

export type CheckType = 'tcp' | 'http' | 'script' | 'grpc';
export type CheckProtocol = 'http' | 'https';
export type CheckStatus = 'passing' | 'warning' | 'critical';

export interface CheckRestart {
  limit?: number;
  grace?: string;
  ignore_warnings?: boolean;
}

export interface Connect {
  native?: boolean;
  gateway?: Gateway;
  sidecar_service?: SidecarService;
  sidecar_task?: SidecarTask;
}

export interface Gateway {
  proxy?: GatewayProxy;
  ingress?: Ingress;
  terminating?: Terminating;
  mesh?: Mesh;
}

export interface GatewayProxy {
  connect_timeout?: string;
  envoy_gateway_bind_tagged_addresses?: boolean;
  envoy_gateway_bind_addresses?: Record<string, GatewayBindAddress>;
  envoy_gateway_no_default_bind?: boolean;
  config?: Record<string, any>;
}

export interface GatewayBindAddress {
  address?: string;
  port?: number;
}

export interface Ingress {
  tls?: IngressTLS;
  listener?: IngressListener[];
}

export interface IngressTLS {
  enabled?: boolean;
  tls_min_version?: string;
  tls_max_version?: string;
  cipher_suites?: string[];
}

export interface IngressListener {
  port?: number;
  protocol?: string;
  service?: IngressService[];
}

export interface IngressService {
  name?: string;
  hosts?: string[];
}

export interface Terminating {
  service?: TerminatingService[];
}

export interface TerminatingService {
  name?: string;
  ca_file?: string;
  cert_file?: string;
  key_file?: string;
  sni?: string;
}

export interface Mesh {
  // Mesh gateway configuration
}

export interface SidecarService {
  tags?: string[];
  port?: string;
  proxy?: SidecarProxy;
}

export interface SidecarProxy {
  local_service_address?: string;
  local_service_port?: number;
  config?: Record<string, any>;
  upstreams?: Upstream[];
}

export interface Upstream {
  destination_name?: string;
  destination_namespace?: string;
  local_bind_port?: number;
  local_bind_address?: string;
  config?: Record<string, any>;
  mesh_gateway?: MeshGateway;
}

export interface MeshGateway {
  mode?: MeshGatewayMode;
}

export type MeshGatewayMode = 'local' | 'remote' | 'none';

export interface SidecarTask {
  name?: string;
  driver?: string;
  user?: string;
  config?: Record<string, any>;
  env?: Record<string, string>;
  resources?: Resources;
  meta?: Record<string, string>;
  kill_timeout?: string;
  logs?: Logs;
  shutdown_delay?: string;
}

export interface Resources {
  cpu?: number;
  memory?: number;
  memory_max?: number;
  disk?: number;
  device?: Device[];
}

export interface Device {
  name?: string;
  count?: number;
  constraint?: Constraint[];
  affinity?: Affinity[];
}

export interface Artifact {
  source?: string;
  destination?: string;
  mode?: ArtifactMode;
  options?: Record<string, string>;
  headers?: Record<string, string>;
}

export type ArtifactMode = 'any' | 'file' | 'dir';

export interface Template {
  source?: string;
  destination?: string;
  embedded_tmpl?: string;
  change_mode?: ChangeMode;
  change_signal?: string;
  splay?: string;
  perms?: string;
  left_delimiter?: string;
  right_delimiter?: string;
  env_var?: boolean;
  vault_grace?: string;
  error_on_missing_key?: boolean;
  uid?: number;
  gid?: number;
}

export type ChangeMode = 'noop' | 'restart' | 'signal';

export interface Vault {
  policies?: string[];
  env?: boolean;
  change_mode?: ChangeMode;
  change_signal?: string;
}

export interface Logs {
  max_files?: number;
  max_file_size?: number;
  disabled?: boolean;
}

export interface Restart {
  attempts?: number;
  delay?: string;
  interval?: string;
  mode?: RestartMode;
}

export type RestartMode = 'fail' | 'delay';

export interface Migrate {
  max_parallel?: number;
  health_check?: MigrateHealthCheck;
  min_healthy_time?: string;
  healthy_deadline?: string;
}

export type MigrateHealthCheck = 'checks' | 'task_states';

export interface Reschedule {
  attempts?: number;
  interval?: string;
  delay?: string;
  delay_function?: DelayFunction;
  max_delay?: string;
  unlimited?: boolean;
}

export type DelayFunction = 'constant' | 'exponential' | 'fibonacci';

export interface Update {
  max_parallel?: number;
  health_check?: UpdateHealthCheck;
  min_healthy_time?: string;
  healthy_deadline?: string;
  progress_deadline?: string;
  auto_revert?: boolean;
  auto_promote?: boolean;
  canary?: number;
  stagger?: string;
}

export type UpdateHealthCheck = 'checks' | 'task_states' | 'manual';

export interface Lifecycle {
  hook?: LifecycleHook;
  sidecar?: boolean;
}

export type LifecycleHook = 'prestart' | 'poststart' | 'poststop';

export interface Scaling {
  enabled?: boolean;
  min?: number;
  max?: number;
  policy?: Record<string, any>;
}

export interface Periodic {
  cron?: string;
  prohibit_overlap?: boolean;
  time_zone?: string;
}

export interface ParameterizedJob {
  payload?: PayloadConfig;
  meta_keys?: string[];
  meta_optional?: string[];
  meta_required?: string[];
}

export type PayloadConfig = 'optional' | 'required' | 'forbidden';

export interface Multiregion {
  strategy?: MultiregionStrategy;
  region?: MultiregionRegion[];
}

export interface MultiregionStrategy {
  max_parallel?: number;
  on_failure?: MultiregionOnFailure;
}

export type MultiregionOnFailure = 'fail_all' | 'fail_remaining';

export interface MultiregionRegion {
  name?: string;
  count?: number;
  datacenters?: string[];
  meta?: Record<string, string>;
}

export interface Consul {
  namespace?: string;
}

export interface CSIPlugin {
  id?: string;
  type?: CSIPluginType;
  mount_dir?: string;
  stage_publish_base_dir?: string;
  health_timeout?: string;
  mount_options?: MountOptions;
}

export type CSIPluginType = 'node' | 'controller' | 'monolith';
