import { load as loadYAML } from 'js-yaml';
import { DockerComposeFile, Service as ComposeService } from './types/compose';
import { NomadJob, JobSpec, TaskGroup, Task, Constraint, ConstraintOperator } from './types/nomad';
import { validateComposeFile } from './validation/compose-validator';
import { generateHCL } from './generators/hcl-generator';

export interface ConversionOptions {
  jobName?: string;
  namespace?: string;
  datacenters?: string[];
  region?: string;
  priority?: number;
  skipValidation?: boolean;
  includeComments?: boolean;
  preserveLabels?: boolean;
  networkMode?: 'bridge' | 'host' | 'none';
  resourceDefaults?: {
    cpu?: number;
    memory?: number;
  };
}

export interface ConversionResult {
  hcl: string;
  nomadJob: NomadJob;
  warnings: string[];
  errors: string[];
}

export class Compose2HCLConverter {
  private options: Required<ConversionOptions>;
  private warnings: string[] = [];
  private errors: string[] = [];

  constructor(options: ConversionOptions = {}) {
    this.options = {
      jobName: options.jobName || 'docker-compose',
      namespace: options.namespace || 'default',
      datacenters: options.datacenters || ['dc1'],
      region: options.region || 'global',
      priority: options.priority || 50,
      skipValidation: options.skipValidation || false,
      includeComments: options.includeComments || true,
      preserveLabels: options.preserveLabels || true,
      networkMode: options.networkMode || 'bridge',
      resourceDefaults: {
        cpu: options.resourceDefaults?.cpu || 100,
        memory: options.resourceDefaults?.memory || 128,
      },
    };
  }

  /**
   * Convert Docker Compose YAML to Nomad HCL
   */
  async convert(composeContent: string): Promise<ConversionResult> {
    this.warnings = [];
    this.errors = [];

    try {
      // Parse YAML
      const composeData = this.parseCompose(composeContent);
      
      // Validate if not skipped
      if (!this.options.skipValidation) {
        const validationResult = validateComposeFile(composeData);
        this.warnings.push(...validationResult.warnings);
        this.errors.push(...validationResult.errors);
        
        if (this.errors.length > 0) {
          throw new Error(`Validation failed: ${this.errors.join(', ')}`);
        }
      }

      // Convert to Nomad job
      const nomadJob = this.convertToNomadJob(composeData);
      
      // Generate HCL
      const hcl = generateHCL(nomadJob, {
        includeComments: this.options.includeComments,
      });

      return {
        hcl,
        nomadJob,
        warnings: this.warnings,
        errors: this.errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(errorMessage);
      
      return {
        hcl: `# ERROR: ${errorMessage}`,
        nomadJob: { job: {} },
        warnings: this.warnings,
        errors: this.errors,
      };
    }
  }

  /**
   * Parse Docker Compose YAML content
   */
  private parseCompose(content: string): DockerComposeFile {
    try {
      const parsed = loadYAML(content) as DockerComposeFile;
      
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML structure');
      }

      // Handle version field
      if (parsed.version && !this.isSupportedVersion(parsed.version)) {
        this.warnings.push(`Docker Compose version '${parsed.version}' may not be fully supported`);
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if Docker Compose version is supported
   */
  private isSupportedVersion(version: string): boolean {
    const supportedVersions = ['3', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9'];
    return supportedVersions.includes(version) || version.startsWith('3.');
  }

  /**
   * Convert Docker Compose file to Nomad job specification
   */
  private convertToNomadJob(compose: DockerComposeFile): NomadJob {
    const jobName = compose.name || this.options.jobName;
    
    const jobSpec: JobSpec = {
      id: jobName,
      name: jobName,
      type: 'service',
      region: this.options.region,
      namespace: this.options.namespace,
      datacenters: this.options.datacenters,
      priority: this.options.priority,
      group: {},
    };

    // Convert services to task groups
    if (compose.services) {
      for (const [serviceName, service] of Object.entries(compose.services)) {
        const taskGroup = this.convertServiceToTaskGroup(serviceName, service, compose);
        if (taskGroup) {
          jobSpec.group![serviceName] = taskGroup;
        }
      }
    }

    // Add global constraints from compose extensions
    if (compose.x?.nomad?.constraints) {
      const constraints = compose.x.nomad.constraints;
      if (Array.isArray(constraints)) {
        const constraintStrings = constraints.map(c => 
          typeof c === 'string' ? c : `${c.attribute || ''} ${c.operator || '='} ${c.value || ''}`
        ).filter(c => c.trim() !== '');
        jobSpec.constraint = this.convertConstraints(constraintStrings);
      }
    }

    return { job: { [jobName]: jobSpec } };
  }

  /**
   * Convert a Docker Compose service to a Nomad task group
   */
  private convertServiceToTaskGroup(
    serviceName: string,
    service: ComposeService,
    compose: DockerComposeFile
  ): TaskGroup | null {
    try {
      const taskGroup: TaskGroup = {
        count: this.getServiceReplicas(service),
        task: {},
      };

      // Convert service to task
      const task = this.convertServiceToTask(serviceName, service, compose);
      if (task) {
        taskGroup.task![serviceName] = task;
      }

      // Add network configuration
      if (service.ports || service.expose) {
        taskGroup.network = this.convertNetworking(service);
      }

      // Add volumes
      if (service.volumes || compose.volumes) {
        taskGroup.volume = this.convertVolumes(service, compose.volumes);
      }

      // Add services (for service discovery)
      const nomadServices = this.convertToNomadServices(service, serviceName);
      if (nomadServices.length > 0) {
        taskGroup.service = nomadServices;
      }

      // Add restart policy
      if (service.restart || service.deploy?.restart_policy) {
        taskGroup.restart = this.convertRestartPolicy(service);
      }

      return taskGroup;
    } catch (error) {
      this.errors.push(`Failed to convert service '${serviceName}': ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Convert a Docker Compose service to a Nomad task
   */
  private convertServiceToTask(
    serviceName: string,
    service: ComposeService,
    compose: DockerComposeFile
  ): Task {
    const task: Task = {
      driver: 'docker',
      config: this.convertDockerConfig(service),
    };

    // Add environment variables
    if (service.environment) {
      task.env = this.convertEnvironment(service.environment);
    }

    // Add resources
    task.resources = this.convertResources(service);

    // Add health checks
    if (service.healthcheck) {
      const nomadServices = this.convertToNomadServices(service, serviceName);
      if (nomadServices.length > 0 && nomadServices[0]!.check) {
        // Health check is added to service, not task directly
      }
    }

    // Add templates for configs and secrets
    const templates = this.convertConfigsAndSecrets(service, compose);
    if (templates.length > 0) {
      task.template = templates;
    }

    // Add constraints
    if (service.deploy?.placement?.constraints) {
      task.constraint = this.convertConstraints(service.deploy.placement.constraints);
    }

    // Add volume mounts
    if (service.volumes) {
      task.volume_mount = this.convertVolumeMounts(service.volumes);
    }

    // Add lifecycle configuration
    if (service.depends_on) {
      // Dependencies are handled at the job level in Nomad
      this.warnings.push(`Service dependencies for '${serviceName}' converted to constraints where possible`);
    }

    return task;
  }

  /**
   * Get service replica count
   */
  private getServiceReplicas(service: ComposeService): number {
    return service.deploy?.replicas || 1;
  }

  /**
   * Convert Docker configuration
   */
  private convertDockerConfig(service: ComposeService): Record<string, any> {
    const config: Record<string, any> = {};

    // Image
    if (service.image) {
      config.image = service.image;
    }

    // Command and args
    if (service.command) {
      if (Array.isArray(service.command)) {
        config.command = service.command[0];
        config.args = service.command.slice(1);
      } else {
        config.command = service.command;
      }
    }

    // Entrypoint
    if (service.entrypoint) {
      config.entrypoint = Array.isArray(service.entrypoint) ? service.entrypoint : [service.entrypoint];
    }

    // Working directory
    if (service.working_dir) {
      config.work_dir = service.working_dir;
    }

    // User
    if (service.user) {
      config.user = service.user;
    }

    // Hostname
    if (service.hostname) {
      config.hostname = service.hostname;
    }

    // Privileged
    if (service.privileged) {
      config.privileged = service.privileged;
    }

    // Read-only
    if (service.read_only) {
      config.readonly_rootfs = service.read_only;
    }

    // Security options
    if (service.security_opt) {
      config.security_opt = service.security_opt;
    }

    // Capabilities
    if (service.cap_add || service.cap_drop) {
      config.cap_add = service.cap_add || [];
      config.cap_drop = service.cap_drop || [];
    }

    // Devices
    if (service.devices) {
      config.devices = service.devices.map(device => {
        if (typeof device === 'string') {
          const parts = (device as string).split(':');
          return {
            host_path: parts[0]!,
            container_path: parts[1] || parts[0]!,
            cgroup_permissions: parts[2] || 'rwm',
          };
        }
        return {
          host_path: device.source || '',
          container_path: device.target || '',
          cgroup_permissions: device.permissions || 'rwm',
        };
      });
    }

    // Labels
    if (service.labels && this.options.preserveLabels) {
      const labels: Record<string, string> = {};
      if (Array.isArray(service.labels)) {
        service.labels.forEach(label => {
          const [key, value] = label.split('=', 2);
          if (key && value !== undefined) {
            labels[key] = value;
          }
        });
      } else {
        Object.assign(labels, service.labels);
      }
      config.labels = labels;
    }

    // DNS
    if (service.dns) {
      config.dns_servers = Array.isArray(service.dns) ? service.dns : [service.dns];
    }

    if (service.dns_search) {
      config.dns_search = service.dns_search;
    }

    // Extra hosts
    if (service.extra_hosts) {
      if (Array.isArray(service.extra_hosts)) {
        config.extra_hosts = service.extra_hosts;
      } else {
        config.extra_hosts = Object.entries(service.extra_hosts).map(([host, ip]) => `${host}:${ip}`);
      }
    }

    // Logging
    if (service.logging) {
      config.logging = {
        type: service.logging.driver || 'json-file',
        config: service.logging.options || {},
      };
    }

    // Network mode
    config.network_mode = this.options.networkMode;

    return config;
  }

  /**
   * Convert environment variables
   */
  private convertEnvironment(environment: ComposeService['environment']): Record<string, string> {
    const env: Record<string, string> = {};

    if (Array.isArray(environment)) {
      environment.forEach(envVar => {
        const [key, ...valueParts] = envVar.split('=');
        if (key) {
          env[key] = valueParts.join('=') || '';
        }
      });
    } else if (environment) {
      Object.entries(environment).forEach(([key, value]) => {
        env[key] = String(value ?? '');
      });
    }

    return env;
  }

  /**
   * Convert resource specifications
   */
  private convertResources(service: ComposeService) {
    const resources: any = {
      cpu: this.options.resourceDefaults.cpu,
      memory: this.options.resourceDefaults.memory,
    };

    // From deploy.resources
    if (service.deploy?.resources) {
      const { limits, reservations } = service.deploy.resources;
      
      if (limits?.cpus) {
        resources.cpu = this.parseCpuValue(limits.cpus);
      }
      
      if (limits?.memory) {
        resources.memory = this.parseMemoryValue(limits.memory);
      }
      
      if (reservations?.cpus) {
        resources.cpu = Math.max(resources.cpu, this.parseCpuValue(reservations.cpus));
      }
      
      if (reservations?.memory) {
        resources.memory = Math.max(resources.memory, this.parseMemoryValue(reservations.memory));
      }
    }

    // From legacy resource fields
    if (service.mem_limit) {
      resources.memory = this.parseMemoryValue(service.mem_limit);
    }

    if (service.cpus) {
      resources.cpu = this.parseCpuValue(service.cpus);
    }

    return resources;
  }

  /**
   * Parse CPU value to MHz
   */
  private parseCpuValue(cpu: string | number): number {
    if (typeof cpu === 'number') {
      return Math.round(cpu * 1000); // Convert cores to MHz
    }
    
    const cpuNum = parseFloat(cpu);
    return Math.round(cpuNum * 1000);
  }

  /**
   * Parse memory value to MB
   */
  private parseMemoryValue(memory: string | number): number {
    if (typeof memory === 'number') {
      return Math.round(memory / 1024 / 1024); // Convert bytes to MB
    }

    const units: Record<string, number> = {
      b: 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    };

    const match = memory.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmg]?)b?$/);
    if (!match) {
      this.warnings.push(`Unable to parse memory value: ${memory}`);
      return this.options.resourceDefaults.memory || 128;
    }

    const value = parseFloat(match[1]!);
    const unit = match[2] || 'b';
    
    return Math.round((value * units[unit]!) / 1024 / 1024);
  }

  /**
   * Convert networking configuration
   */
  private convertNetworking(service: ComposeService) {
    const network: any = {
      mode: this.options.networkMode,
      port: {},
    };

    // Convert ports
    if (service.ports) {
      service.ports.forEach((port, index) => {
        const portName = `port_${index}`;
        
        if (typeof port === 'string') {
          const parts = (port as string).split(':');
          if (parts.length === 2) {
            network.port[portName] = {
              static: parseInt(parts[0]!),
              to: parseInt(parts[1]!),
            };
          } else {
            network.port[portName] = {
              to: parseInt(port),
            };
          }
        } else {
          network.port[portName] = {
            static: port.published ? parseInt(String(port.published)) : undefined,
            to: port.target,
          };
        }
      });
    }

    // Convert exposed ports
    if (service.expose) {
      service.expose.forEach((port, index) => {
        const portName = `expose_${index}`;
        network.port[portName] = {
          to: parseInt(port),
        };
      });
    }

    return network;
  }

  /**
   * Convert volumes
   */
  private convertVolumes(service: ComposeService, composeVolumes?: DockerComposeFile['volumes']) {
    const volumes: Record<string, any> = {};

    // Handle service volumes
    if (service.volumes) {
      service.volumes.forEach((volume, index) => {
        const volumeName = `volume_${index}`;
        
        if (typeof volume === 'string') {
          const parts = (volume as string).split(':');
          volumes[volumeName] = {
            type: parts[0]!.startsWith('/') ? 'host' : 'csi',
            source: parts[0]!,
            read_only: parts[2]?.includes('ro') || false,
          };
        } else {
          volumes[volumeName] = {
            type: volume.type === 'bind' ? 'host' : 'csi',
            source: volume.source,
            read_only: volume.read_only || false,
          };
        }
      });
    }

    return volumes;
  }

  /**
   * Convert volume mounts
   */
  private convertVolumeMounts(volumes: ComposeService['volumes']) {
    const mounts: Record<string, any> = {};

    if (!volumes) return mounts;

    volumes.forEach((volume, index) => {
      const mountName = `mount_${index}`;
      
      if (typeof volume === 'string') {
        const parts = (volume as string).split(':');
        if (parts.length >= 2) {
          mounts[mountName] = {
            volume: `volume_${index}`,
            destination: parts[1]!,
            read_only: parts[2]?.includes('ro') || false,
          };
        }
      } else {
        mounts[mountName] = {
          volume: `volume_${index}`,
          destination: volume.target,
          read_only: volume.read_only || false,
        };
      }
    });

    return mounts;
  }

  /**
   * Convert to Nomad services
   */
  private convertToNomadServices(service: ComposeService, serviceName: string) {
    const services: any[] = [];

    // Create service for each exposed port
    if (service.ports || service.expose) {
      const ports = [
        ...(service.ports || []),
        ...(service.expose || []).map(port => ({ target: parseInt(port) })),
      ];

      ports.forEach((port, index) => {
        const nomadService: any = {
          name: `${serviceName}-${index}`,
          port: `port_${index}`,
          tags: ['docker-compose'],
        };

        // Add health check
        if (service.healthcheck) {
          nomadService.check = [this.convertHealthCheck(service.healthcheck)];
        }

        services.push(nomadService);
      });
    } else {
      // Create a basic service even without ports
      const nomadService: any = {
        name: serviceName,
        tags: ['docker-compose'],
      };

      if (service.healthcheck) {
        nomadService.check = [this.convertHealthCheck(service.healthcheck)];
      }

      services.push(nomadService);
    }

    return services;
  }

  /**
   * Convert health check
   */
  private convertHealthCheck(healthcheck: ComposeService['healthcheck']) {
    if (!healthcheck || healthcheck.disable) {
      return null;
    }

    const check: any = {
      type: 'script',
      interval: healthcheck.interval || '30s',
      timeout: healthcheck.timeout || '5s',
    };

    if (healthcheck.test) {
      if (Array.isArray(healthcheck.test)) {
        if (healthcheck.test[0] === 'CMD') {
          check.command = healthcheck.test[1];
          check.args = healthcheck.test.slice(2);
        } else if (healthcheck.test[0] === 'CMD-SHELL') {
          check.command = '/bin/sh';
          check.args = ['-c', healthcheck.test.slice(1).join(' ')];
        }
      } else {
        check.command = '/bin/sh';
        check.args = ['-c', healthcheck.test];
      }
    }

    return check;
  }

  /**
   * Convert configs and secrets to templates
   */
  private convertConfigsAndSecrets(service: ComposeService, compose: DockerComposeFile) {
    const templates: any[] = [];

    // Convert configs
    if (service.configs) {
      service.configs.forEach(config => {
        const configName = typeof config === 'string' ? config : config.source;
        const composeConfig = compose.configs?.[configName];
        
        if (composeConfig) {
          templates.push({
            destination: `local/${typeof config === 'string' ? config : config.target || config.source}`,
            embedded_tmpl: composeConfig.content || `# Config: ${configName}`,
            change_mode: 'restart',
          });
        }
      });
    }

    // Convert secrets
    if (service.secrets) {
      service.secrets.forEach(secret => {
        const secretName = typeof secret === 'string' ? secret : secret.source;
        
        templates.push({
          destination: `secrets/${typeof secret === 'string' ? secret : secret.target || secret.source}`,
          embedded_tmpl: `{{ with secret "secret/data/${secretName}" }}{{ .Data.data.value }}{{ end }}`,
          change_mode: 'restart',
        });
      });
    }

    return templates;
  }

  /**
   * Convert restart policy
   */
  private convertRestartPolicy(service: ComposeService) {
    const restart: any = {
      attempts: 3,
      delay: '15s',
      interval: '5m',
      mode: 'delay',
    };

    if (service.restart) {
      switch (service.restart) {
        case 'always':
          restart.attempts = 0; // Unlimited
          break;
        case 'on-failure':
          restart.mode = 'fail';
          break;
        case 'no':
        case 'unless-stopped':
          restart.attempts = 0;
          restart.mode = 'fail';
          break;
      }
    }

    if (service.deploy?.restart_policy) {
      const policy = service.deploy.restart_policy;
      
      if (policy.condition === 'none') {
        restart.attempts = 0;
        restart.mode = 'fail';
      } else if (policy.condition === 'on-failure') {
        restart.mode = 'fail';
      }
      
      if (policy.max_attempts !== undefined) {
        restart.attempts = policy.max_attempts;
      }
      
      if (policy.delay) {
        restart.delay = policy.delay;
      }
      
      if (policy.window) {
        restart.interval = policy.window;
      }
    }

    return restart;
  }

  /**
   * Convert constraints
   */
  private convertConstraints(constraints: string[]): Constraint[] {
    return constraints.map(constraint => {
      // Parse constraint format: "attribute operator value"
      const parts = constraint.split(/\s+/);
      if (parts.length >= 3) {
        const operator = parts[1]!;
        // Validate operator is a valid ConstraintOperator
        const validOperators: ConstraintOperator[] = ['=', '!=', '>', '>=', '<', '<=', 'distinct_hosts', 'distinct_property', 'regexp', 'set_contains', 'set_contains_all', 'set_contains_any', 'version', 'semver', 'is_set', 'is_not_set'];
        
        return {
          attribute: parts[0]!,
          operator: validOperators.includes(operator as ConstraintOperator) ? operator as ConstraintOperator : '=',
          value: parts.slice(2).join(' '),
        };
      }
      
      // Simple constraint
      return {
        attribute: constraint,
        operator: '=',
        value: 'true',
      };
    });
  }
}
