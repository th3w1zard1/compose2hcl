/**
 * Complete Docker Compose specification types
 * Based on compose-spec v1.20.0+
 */

export interface DockerComposeFile {
  version?: string;
  name?: string;
  services?: Record<string, Service>;
  networks?: Record<string, Network>;
  volumes?: Record<string, Volume>;
  configs?: Record<string, Config>;
  secrets?: Record<string, Secret>;
  include?: Include[];
  x?: Record<string, any>; // Extension fields
}

export interface Service {
  // Core service properties
  image?: string;
  build?: Build | string;
  container_name?: string;
  hostname?: string;
  
  // Runtime configuration
  command?: string | string[];
  entrypoint?: string | string[];
  environment?: Environment;
  env_file?: string | string[];
  working_dir?: string;
  user?: string;
  
  // Networking
  ports?: Port[];
  expose?: string[];
  networks?: Networks;
  links?: string[];
  dns?: string | string[];
  dns_search?: string | string[];
  dns_opt?: string[];
  extra_hosts?: string[] | Record<string, string>;
  
  // Volumes and storage
  volumes?: Volume[];
  tmpfs?: string | string[];
  
  // Resources
  deploy?: Deploy;
  mem_limit?: string | number;
  mem_reservation?: string | number;
  memswap_limit?: string | number;
  mem_swappiness?: number;
  oom_kill_disable?: boolean;
  oom_score_adj?: number;
  cpu_count?: number;
  cpu_percent?: number;
  cpu_shares?: number;
  cpu_period?: number;
  cpu_quota?: number;
  cpu_rt_runtime?: number;
  cpu_rt_period?: number;
  cpus?: string | number;
  cpuset?: string;
  
  // Security
  cap_add?: string[];
  cap_drop?: string[];
  cgroup_parent?: string;
  devices?: Device[];
  device_cgroup_rules?: string[];
  security_opt?: string[];
  privileged?: boolean;
  read_only?: boolean;
  shm_size?: string | number;
  stdin_open?: boolean;
  tty?: boolean;
  
  // Health and lifecycle
  healthcheck?: HealthCheck;
  depends_on?: DependsOn;
  restart?: RestartPolicy;
  stop_grace_period?: string;
  stop_signal?: string;
  
  // Logging
  logging?: Logging;
  
  // Labels and metadata
  labels?: Labels;
  
  // Advanced features
  configs?: ConfigRef[];
  secrets?: SecretRef[];
  sysctls?: Record<string, string | number>;
  ulimits?: Ulimits;
  profiles?: string[];
  platform?: string;
  isolation?: string;
  
  // Legacy/compatibility
  pid?: string;
  network_mode?: string;
  
  // Legacy/compatibility
  extends?: Extends;
  external_links?: string[];
  
  // Extension fields
  x?: Record<string, any>;
}

export interface Build {
  context?: string;
  dockerfile?: string;
  args?: Record<string, string>;
  ssh?: string | string[] | Record<string, string>;
  cache_from?: string[];
  cache_to?: string[];
  extra_hosts?: string[] | Record<string, string>;
  isolation?: string;
  labels?: Labels;
  network?: string;
  no_cache?: boolean;
  pull?: boolean;
  shm_size?: string | number;
  target?: string;
  secrets?: BuildSecret[];
  tags?: string[];
  platforms?: string[];
  privileged?: boolean;
  additional_contexts?: Record<string, string>;
}

export interface BuildSecret {
  id: string;
  source?: string;
  target?: string;
  uid?: string;
  gid?: string;
  mode?: number;
}

export type Environment = Record<string, string | number | boolean | null> | string[];

export interface Port {
  mode?: 'host' | 'ingress';
  target?: number;
  published?: string | number;
  protocol?: 'tcp' | 'udp';
  app_protocol?: string;
  host_ip?: string;
}

export type Networks = string[] | Record<string, NetworkConfig>;

export interface NetworkConfig {
  aliases?: string[];
  ipv4_address?: string;
  ipv6_address?: string;
  link_local_ips?: string[];
  mac_address?: string;
  priority?: number;
}

export interface Volume {
  type?: 'bind' | 'volume' | 'tmpfs' | 'npipe' | 'cluster';
  source?: string;
  target?: string;
  read_only?: boolean;
  consistency?: 'consistent' | 'cached' | 'delegated';
  bind?: BindOptions;
  volume?: VolumeOptions;
  tmpfs?: TmpfsOptions;
}

export interface BindOptions {
  propagation?: 'rprivate' | 'private' | 'rshared' | 'shared' | 'rslave' | 'slave';
  create_host_path?: boolean;
  selinux?: 'z' | 'Z';
}

export interface VolumeOptions {
  nocopy?: boolean;
}

export interface TmpfsOptions {
  size?: number | string;
  mode?: number;
}

export interface Device {
  source?: string;
  target?: string;
  permissions?: string;
}

export interface HealthCheck {
  test?: string | string[];
  interval?: string;
  timeout?: string;
  retries?: number;
  start_period?: string;
  start_interval?: string;
  disable?: boolean;
}

export type DependsOn = string[] | Record<string, DependsOnConfig>;

export interface DependsOnConfig {
  condition?: 'service_started' | 'service_healthy' | 'service_completed_successfully';
  restart?: boolean;
  required?: boolean;
}

export type RestartPolicy = 'no' | 'always' | 'on-failure' | 'unless-stopped';

export interface Logging {
  driver?: string;
  options?: Record<string, string>;
}

export type Labels = Record<string, string> | string[];

export interface Deploy {
  mode?: 'global' | 'replicated';
  replicas?: number;
  labels?: Labels;
  update_config?: UpdateConfig;
  rollback_config?: RollbackConfig;
  resources?: Resources;
  restart_policy?: RestartPolicyConfig;
  placement?: Placement;
  endpoint_mode?: 'vip' | 'dnsrr';
}

export interface UpdateConfig {
  parallelism?: number;
  delay?: string;
  failure_action?: 'continue' | 'rollback' | 'pause';
  monitor?: string;
  max_failure_ratio?: number;
  order?: 'start-first' | 'stop-first';
}

export interface RollbackConfig {
  parallelism?: number;
  delay?: string;
  failure_action?: 'continue' | 'pause';
  monitor?: string;
  max_failure_ratio?: number;
  order?: 'start-first' | 'stop-first';
}

export interface Resources {
  limits?: ResourceLimit;
  reservations?: ResourceReservation;
}

export interface ResourceLimit {
  cpus?: string;
  memory?: string;
  pids?: number;
  devices?: DeviceRequest[];
}

export interface ResourceReservation {
  cpus?: string;
  memory?: string;
  generic_resources?: GenericResource[];
  devices?: DeviceRequest[];
}

export interface DeviceRequest {
  driver?: string;
  count?: number | 'all';
  device_ids?: string[];
  capabilities?: string[][];
  options?: Record<string, string>;
}

export interface GenericResource {
  discrete_resource_spec?: {
    kind?: string;
    value?: number;
  };
}

export interface RestartPolicyConfig {
  condition?: 'none' | 'on-failure' | 'any';
  delay?: string;
  max_attempts?: number;
  window?: string;
}

export interface Placement {
  constraints?: string[];
  preferences?: PlacementPreference[];
  max_replicas_per_node?: number;
}

export interface PlacementPreference {
  spread?: string;
}

export interface ConfigRef {
  source: string;
  target?: string;
  uid?: string;
  gid?: string;
  mode?: number;
}

export interface SecretRef {
  source: string;
  target?: string;
  uid?: string;
  gid?: string;
  mode?: number;
}

export interface Ulimits {
  nproc?: number | UlimitConfig;
  nofile?: number | UlimitConfig;
  fsize?: number | UlimitConfig;
  [key: string]: number | UlimitConfig | undefined;
}

export interface UlimitConfig {
  soft: number;
  hard: number;
}

export interface Extends {
  service: string;
  file?: string;
}

export interface Network {
  driver?: string;
  driver_opts?: Record<string, string>;
  attachable?: boolean;
  enable_ipv6?: boolean;
  ipam?: IPAM;
  internal?: boolean;
  labels?: Labels;
  external?: boolean | ExternalNetwork;
  name?: string;
}

export interface ExternalNetwork {
  name: string;
}

export interface IPAM {
  driver?: string;
  config?: IPAMConfig[];
  options?: Record<string, string>;
}

export interface IPAMConfig {
  subnet?: string;
  ip_range?: string;
  gateway?: string;
  aux_addresses?: Record<string, string>;
}

export interface Volume {
  driver?: string;
  driver_opts?: Record<string, string>;
  external?: boolean | ExternalVolume;
  labels?: Labels;
  name?: string;
}

export interface ExternalVolume {
  name: string;
}

export interface Config {
  file?: string;
  external?: boolean | ExternalConfig;
  labels?: Labels;
  name?: string;
  environment?: string;
  content?: string;
}

export interface ExternalConfig {
  name: string;
}

export interface Secret {
  file?: string;
  external?: boolean | ExternalSecret;
  labels?: Labels;
  name?: string;
  environment?: string;
}

export interface ExternalSecret {
  name: string;
}

export interface Include {
  path: string | string[];
  project_directory?: string;
  env_file?: string | string[];
}
