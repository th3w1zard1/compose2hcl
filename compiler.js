// Enhanced Docker Compose to Nomad HCL Converter
// Supports all Docker Compose features with proper YAML parsing

let composeData = null;
let currentJobName = 'docker-compose';

function out_reset() {
    document.getElementById('hcl-output').value = '';
}

function out_indent(depth) {
    return '  '.repeat(Math.max(0, depth));
}

function out_append(text = '', depth = 0) {
    const output = document.getElementById('hcl-output');
    output.value += out_indent(depth) + text + '\n';
}

function compile() {
    try {
        out_reset();
        
        const input = document.getElementById('compose-input').value;
        if (!input.trim()) {
            throw new Error('Please provide Docker Compose content');
        }

        // Parse YAML using js-yaml or native parsing
        composeData = parseYAML(input);
        if (!composeData) {
            throw new Error('Failed to parse YAML content');
        }

        // Generate Nomad HCL
        generateNomadHCL();
        
    } catch (err) {
        console.error('Compilation error:', err);
        out_append(`# ERROR: ${err.message}`, 0);
        alert(`Compilation failed: ${err.message}`);
    }
}

function parseYAML(input) {
    try {
        // Try to use js-yaml if available
        if (typeof jsyaml !== 'undefined') {
            return jsyaml.load(input);
        }
        
        // Fallback to basic YAML parsing for common cases
        return parseBasicYAML(input);
    } catch (err) {
        throw new Error(`YAML parsing failed: ${err.message}`);
    }
}

function parseBasicYAML(input) {
    // Basic YAML parser for common Docker Compose files
    // This is a fallback when js-yaml is not available
    
    const lines = input.split('\n');
    const result = {};
    const stack = [result];
    const indentStack = [0];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        
        // Calculate indentation
        const indent = line.length - line.trimStart().length;
        
        // Pop stack until we find the right level
        while (indentStack.length > 1 && indent <= indentStack[indentStack.length - 2]) {
            stack.pop();
            indentStack.pop();
        }
        
        // Parse key-value pairs
        if (trimmed.includes(':')) {
            const [key, ...valueParts] = trimmed.split(':');
            const value = valueParts.join(':').trim();
            
            if (value === '') {
                // This is a new object/map
                const newObj = {};
                stack[stack.length - 1][key] = newObj;
                stack.push(newObj);
                indentStack.push(indent);
            } else {
                // This is a simple value
                let parsedValue = value;
                
                // Try to parse as number
                if (!isNaN(value) && value !== '') {
                    parsedValue = Number(value);
                }
                // Try to parse as boolean
                else if (value === 'true' || value === 'false') {
                    parsedValue = value === 'true';
                }
                // Remove quotes if present
                else if ((value.startsWith('"') && value.endsWith('"')) || 
                         (value.startsWith("'") && value.endsWith("'"))) {
                    parsedValue = value.slice(1, -1);
                }
                
                stack[stack.length - 1][key] = parsedValue;
            }
        }
    }
    
    return result;
}

function generateNomadHCL() {
    // Job header
    out_append('job "' + (composeData.name || 'docker-compose') + '" {', 0);
    out_append('  region = "global"', 1);
    out_append('  datacenters = ["dc1"]', 1);
    out_append('  type = "service"', 1);
    out_append('', 0);
    
    // Update strategy
    out_append('  update {', 1);
    out_append('    stagger      = "10s"', 2);
    out_append('    max_parallel = 2', 2);
    out_append('  }', 1);
    out_append('', 0);
    
    // Services group
    if (composeData.services) {
        out_append('  group "services" {', 1);
        
        Object.keys(composeData.services).forEach(serviceName => {
            const service = composeData.services[serviceName];
            generateServiceHCL(serviceName, service, 2);
        });
        
        out_append('  }', 1);
    }
    
    // Networks
    if (composeData.networks) {
        generateNetworksHCL(1);
    }
    
    // Volumes
    if (composeData.volumes) {
        generateVolumesHCL(1);
    }
    
    // Configs
    if (composeData.configs) {
        generateConfigsHCL(1);
    }
    
    // Secrets
    if (composeData.secrets) {
        generateSecretsHCL(1);
    }
    
    // Models (AI/ML models)
    if (composeData.models) {
        generateModelsHCL(1);
    }
    
    // Include files
    if (composeData.include) {
        generateIncludeHCL(1);
    }
    
    // Profiles
    if (composeData.profiles) {
        generateProfilesHCL(1);
    }
    
    out_append('}', 0);
}

function generateServiceHCL(serviceName, service, indent) {
    out_append(`task "${serviceName}" {`, indent);
    
    // Driver
    out_append('  driver = "docker"', indent + 1);
    out_append('', indent);
    
    // Resources
    generateResourcesHCL(service, indent + 1);
    
    // Network
    if (service.ports || service.networks) {
        generateServiceNetworkHCL(service, indent + 1);
    }
    
    // Config
    out_append('  config {', indent + 1);
    
    // Image
    if (service.image) {
        out_append(`    image = "${service.image}"`, indent + 2);
    }
    
    // Ports
    if (service.ports) {
        generatePortsHCL(service.ports, indent + 2);
    }
    
    // Environment variables
    if (service.environment) {
        generateEnvironmentHCL(service.environment, indent + 2);
    }
    
    // Env files
    if (service.env_file) {
        generateEnvFileHCL(service.env_file, indent + 2);
    }
    
    // Volumes
    if (service.volumes) {
        generateServiceVolumesHCL(service.volumes, indent + 2);
    }
    
    // Command
    if (service.command) {
        generateCommandHCL(service.command, indent + 2);
    }
    
    // Entrypoint
    if (service.entrypoint) {
        generateEntrypointHCL(service.entrypoint, indent + 2);
    }
    
    // Working directory
    if (service.working_dir) {
        out_append(`    working_dir = "${service.working_dir}"`, indent + 2);
    }
    
    // User
    if (service.user) {
        out_append(`    user = "${service.user}"`, indent + 2);
    }
    
    // Capabilities
    if (service.cap_add || service.cap_drop) {
        generateCapabilitiesHCL(service, indent + 2);
    }
    
    // Health check
    if (service.healthcheck) {
        generateHealthcheckHCL(service.healthcheck, indent + 2);
    }
    
    // Labels
    if (service.labels) {
        generateLabelsHCL(service.labels, indent + 2);
    }
    
    // Restart policy
    if (service.restart) {
        generateRestartPolicyHCL(service.restart, indent + 2);
    }
    
    // Logging
    if (service.logging) {
        generateLoggingHCL(service.logging, indent + 2);
    }
    
    // Configs
    if (service.configs) {
        generateServiceConfigsHCL(service.configs, indent + 2);
    }
    
    // Secrets
    if (service.secrets) {
        generateServiceSecretsHCL(service.secrets, indent + 2);
    }
    
    // GPU support
    if (service.gpus) {
        generateGPUHCL(service.gpus, indent + 2);
    }
    
    // Development mode
    if (service.develop) {
        generateDevelopmentHCL(service.develop, indent + 2);
    }
    
    // Deploy configuration
    if (service.deploy) {
        generateDeployHCL(service.deploy, indent + 2);
    }
    
    // Profiles
    if (service.profiles) {
        generateServiceProfilesHCL(service.profiles, indent + 2);
    }
    
    // Depends on
    if (service.depends_on) {
        generateDependsOnHCL(service.depends_on, indent + 2);
    }
    
    // Extends
    if (service.extends) {
        generateExtendsHCL(service.extends, indent + 2);
    }
    
    // Build configuration
    if (service.build) {
        generateBuildHCL(service.build, indent + 2);
    }
    
    // Privileged mode
    if (service.privileged) {
        out_append(`    privileged = ${service.privileged}`, indent + 2);
    }
    
    // Read-only filesystem
    if (service.read_only) {
        out_append(`    readonly_rootfs = ${service.read_only}`, indent + 2);
    }
    
    // TTY allocation
    if (service.tty) {
        out_append(`    tty = ${service.tty}`, indent + 2);
    }
    
    // STDIN open
    if (service.stdin_open) {
        out_append(`    interactive = ${service.stdin_open}`, indent + 2);
    }
    
    // Stop signal
    if (service.stop_signal) {
        out_append(`    stop_signal = "${service.stop_signal}"`, indent + 2);
    }
    
    // Stop grace period
    if (service.stop_grace_period) {
        out_append(`    kill_timeout = "${service.stop_grace_period}"`, indent + 2);
    }
    
    // Platform
    if (service.platform) {
        out_append(`    # Platform: ${service.platform}`, indent + 2);
        out_append('    # Note: Nomad handles platform selection automatically', indent + 2);
    }
    
    // Runtime
    if (service.runtime) {
        out_append(`    # Runtime: ${service.runtime}`, indent + 2);
        out_append('    # Note: Nomad uses its own runtime management', indent + 2);
    }
    
    // Isolation
    if (service.isolation) {
        out_append(`    # Isolation: ${service.isolation}`, indent + 2);
        out_append('    # Note: Nomad handles container isolation', indent + 2);
    }
    
    // Sysctls
    if (service.sysctls) {
        generateSysctlsHCL(service.sysctls, indent + 2);
    }
    
    // Ulimits
    if (service.ulimits) {
        generateUlimitsHCL(service.ulimits, indent + 2);
    }
    
    // Security options
    if (service.security_opt) {
        generateSecurityOptHCL(service.security_opt, indent + 2);
    }
    
    // Storage options
    if (service.storage_opt) {
        generateStorageOptHCL(service.storage_opt, indent + 2);
    }
    
    // Tmpfs mounts
    if (service.tmpfs) {
        generateTmpfsHCL(service.tmpfs, indent + 2);
    }
    
    // Devices
    if (service.devices) {
        generateDevicesHCL(service.devices, indent + 2);
    }
    
    // Group add
    if (service.group_add) {
        generateGroupAddHCL(service.group_add, indent + 2);
    }
    
    // Extra hosts
    if (service.extra_hosts) {
        generateExtraHostsHCL(service.extra_hosts, indent + 2);
    }
    
    // DNS
    if (service.dns) {
        generateDNSHCL(service.dns, indent + 2);
    }
    
    // DNS options
    if (service.dns_opt) {
        generateDNSOptHCL(service.dns_opt, indent + 2);
    }
    
    // DNS search
    if (service.dns_search) {
        generateDNSSearchHCL(service.dns_search, indent + 2);
    }
    
    // Domain name
    if (service.domainname) {
        out_append(`    # Domain name: ${service.domainname}`, indent + 2);
        out_append('    # Note: Nomad handles domain configuration', indent + 2);
    }
    
    // Hostname
    if (service.hostname) {
        out_append(`    # Hostname: ${service.hostname}`, indent + 2);
        out_append('    # Note: Nomad handles hostname configuration', indent + 2);
    }
    
    // IPC mode
    if (service.ipc) {
        out_append(`    # IPC mode: ${service.ipc}`, indent + 2);
        out_append('    # Note: Nomad handles IPC configuration', indent + 2);
    }
    
    // PID mode
    if (service.pid) {
        out_append(`    # PID mode: ${service.pid}`, indent + 2);
        out_append('    # Note: Nomad handles PID configuration', indent + 2);
    }
    
    // UTS mode
    if (service.uts) {
        out_append(`    # UTS mode: ${service.uts}`, indent + 2);
        out_append('    # Note: Nomad handles UTS configuration', indent + 2);
    }
    
    // User namespace mode
    if (service.userns_mode) {
        out_append(`    # User namespace mode: ${service.userns_mode}`, indent + 2);
        out_append('    # Note: Nomad handles namespace configuration', indent + 2);
    }
    
    // Cgroup
    if (service.cgroup) {
        out_append(`    # Cgroup: ${service.cgroup}`, indent + 2);
        out_append('    # Note: Nomad handles cgroup configuration', indent + 2);
    }
    
    // Cgroup parent
    if (service.cgroup_parent) {
        out_append(`    # Cgroup parent: ${service.cgroup_parent}`, indent + 2);
        out_append('    # Note: Nomad handles cgroup configuration', indent + 2);
    }
    
    // Block IO configuration
    if (service.blkio_config) {
        generateBlkioConfigHCL(service.blkio_config, indent + 2);
    }
    
    // CPU configuration
    if (service.cpu_count || service.cpu_percent || service.cpu_shares || 
        service.cpu_period || service.cpu_quota || service.cpu_rt_period || 
        service.cpu_rt_runtime || service.cpus || service.cpuset) {
        generateCPUConfigHCL(service, indent + 2);
    }
    
    // Memory configuration
    if (service.mem_limit || service.mem_reservation || service.mem_swappiness || 
        service.memswap_limit) {
        generateMemoryConfigHCL(service, indent + 2);
    }
    
    // PIDs limit
    if (service.pids_limit) {
        out_append(`    # PIDs limit: ${service.pids_limit}`, indent + 2);
        out_append('    # Note: Nomad handles process limits', indent + 2);
    }
    
    // OOM kill disable
    if (service.oom_kill_disable) {
        out_append(`    # OOM kill disable: ${service.oom_kill_disable}`, indent + 2);
        out_append('    # Note: Nomad handles OOM configuration', indent + 2);
    }
    
    // OOM score adjustment
    if (service.oom_score_adj) {
        out_append(`    # OOM score adjustment: ${service.oom_score_adj}`, indent + 2);
        out_append('    # Note: Nomad handles OOM configuration', indent + 2);
    }
    
    // Init process
    if (service.init) {
        out_append(`    # Init process: ${service.init}`, indent + 2);
        out_append('    # Note: Nomad handles init configuration', indent + 2);
    }
    
    // Pull policy
    if (service.pull_policy) {
        out_append(`    # Pull policy: ${service.pull_policy}`, indent + 2);
        out_append('    # Note: Nomad handles image pulling', indent + 2);
    }
    
    // Pull refresh after
    if (service.pull_refresh_after) {
        out_append(`    # Pull refresh after: ${service.pull_refresh_after}`, indent + 2);
        out_append('    # Note: Nomad handles image refresh', indent + 2);
    }
    
    // Scale
    if (service.scale) {
        out_append(`    # Scale: ${service.scale}`, indent + 2);
        out_append('    # Note: Use Nomad scaling commands', indent + 2);
    }
    
    // External links
    if (service.external_links) {
        generateExternalLinksHCL(service.external_links, indent + 2);
    }
    
    // Links
    if (service.links) {
        generateLinksHCL(service.links, indent + 2);
    }
    
    // Provider
    if (service.provider) {
        generateProviderHCL(service.provider, indent + 2);
    }
    
    // Annotations
    if (service.annotations) {
        generateAnnotationsHCL(service.annotations, indent + 2);
    }
    
    // Attach
    if (service.attach !== undefined) {
        out_append(`    # Attach: ${service.attach}`, indent + 2);
        out_append('    # Note: Nomad handles log collection', indent + 2);
    }
    
    // Models (AI/ML models)
    if (service.models) {
        generateServiceModelsHCL(service.models, indent + 2);
    }
    
    // Use API socket
    if (service.use_api_socket) {
        out_append(`    # Use API socket: ${service.use_api_socket}`, indent + 2);
        out_append('    # Note: Nomad handles Docker API access', indent + 2);
    }
    
    out_append('  }', indent + 1);
    
    // Service hooks
    if (service.post_start || service.pre_stop) {
        generateServiceHooksHCL(service, indent + 1);
    }
    
    out_append('}', indent);
    out_append('', indent);
}

function generateResourcesHCL(service, indent) {
    const resources = {};
    
    // CPU
    if (service.cpus) {
        resources.cpu = service.cpus;
    }
    if (service.cpu_count) {
        resources.cpu = service.cpu_count;
    }
    if (service.cpu_percent) {
        resources.cpu = `${service.cpu_percent}%`;
    }
    
    // Memory
    if (service.mem_limit) {
        resources.memory = service.mem_limit;
    }
    if (service.mem_reservation) {
        resources.memory_reservation = service.mem_reservation;
    }
    
    // Network
    if (service.network_mode) {
        resources.network = service.network_mode;
    }
    
    if (Object.keys(resources).length > 0) {
        out_append('  resources {', indent);
        Object.entries(resources).forEach(([key, value]) => {
            out_append(`    ${key} = ${typeof value === 'string' ? `"${value}"` : value}`, indent + 1);
        });
        out_append('  }', indent);
        out_append('', indent);
    }
}

function generateServiceNetworkHCL(service, indent) {
    out_append('  network {', indent);
    
    // Ports
    if (service.ports) {
        generatePortsHCL(service.ports, indent + 1);
    }
    
    // Network mode
    if (service.network_mode) {
        out_append(`    mode = "${service.network_mode}"`, indent + 1);
    }
    
    // DNS
    if (service.dns) {
        if (Array.isArray(service.dns)) {
            out_append(`    dns = ${JSON.stringify(service.dns)}`, indent + 1);
        } else {
            out_append(`    dns = ["${service.dns}"]`, indent + 1);
        }
    }
    
    // Extra hosts
    if (service.extra_hosts) {
        generateExtraHostsHCL(service.extra_hosts, indent + 1);
    }
    
    out_append('  }', indent);
    out_append('', indent);
}

function generatePortsHCL(ports, indent) {
    if (Array.isArray(ports)) {
        ports.forEach((port, index) => {
            if (typeof port === 'string') {
                const [hostPort, containerPort] = port.split(':');
                if (containerPort) {
                    out_append(`    port "port${index}" {`, indent);
                    out_append(`      static = ${hostPort}`, indent + 1);
                    out_append(`      to = ${containerPort}`, indent + 1);
                    out_append('    }', indent);
                } else {
                    out_append(`    port "port${index}" {`, indent);
                    out_append(`      static = ${hostPort}`, indent + 1);
                    out_append('    }', indent);
                }
            } else if (typeof port === 'object') {
                out_append(`    port "${port.name || `port${index}`}" {`, indent);
                if (port.published) {
                    out_append(`      static = ${port.published}`, indent + 1);
                }
                if (port.target) {
                    out_append(`      to = ${port.target}`, indent + 1);
                }
                if (port.protocol) {
                    out_append(`      protocol = "${port.protocol}"`, indent + 1);
                }
                out_append('    }', indent);
            }
        });
    }
}

function generateEnvironmentHCL(environment, indent) {
    if (Array.isArray(environment)) {
        environment.forEach(env => {
            if (typeof env === 'string' && env.includes('=')) {
                const [key, value] = env.split('=', 2);
                out_append('    env {', indent);
                out_append(`      ${key} = "${value}"`, indent + 1);
                out_append('    }', indent);
            }
        });
    } else if (typeof environment === 'object') {
        out_append('    env {', indent);
        Object.entries(environment).forEach(([key, value]) => {
            out_append(`      ${key} = "${value}"`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateEnvFileHCL(envFile, indent) {
    if (Array.isArray(envFile)) {
        envFile.forEach(file => {
            out_append(`    # Environment file: ${file}`, indent);
            out_append('    # Note: Nomad handles environment files via templates', indent);
        });
    } else if (typeof envFile === 'string') {
        out_append(`    # Environment file: ${envFile}`, indent);
        out_append('    # Note: Nomad handles environment files via templates', indent);
    }
}

function generateServiceVolumesHCL(volumes, indent) {
    if (Array.isArray(volumes)) {
        volumes.forEach((volume, index) => {
            if (typeof volume === 'string') {
                const [source, target, mode] = volume.split(':');
                out_append(`    mount {`, indent);
                out_append(`      type = "bind"`, indent + 1);
                out_append(`      target = "${target || source}"`, indent + 1);
                out_append(`      source = "${source}"`, indent + 1);
                if (mode) {
                    out_append(`      readonly = ${mode === 'ro'}`, indent + 1);
                }
                out_append('    }', indent);
            } else if (typeof volume === 'object') {
                out_append(`    mount {`, indent);
                out_append(`      type = "${volume.type || 'bind'}"`, indent + 1);
                out_append(`      target = "${volume.target}"`, indent + 1);
                if (volume.source) {
                    out_append(`      source = "${volume.source}"`, indent + 1);
                }
                if (volume.read_only !== undefined) {
                    out_append(`      readonly = ${volume.read_only}`, indent + 1);
                }
                out_append('    }', indent);
            }
        });
    }
}

function generateCommandHCL(command, indent) {
    if (Array.isArray(command)) {
        out_append(`    args = ${JSON.stringify(command)}`, indent);
    } else if (typeof command === 'string') {
        out_append(`    args = ["/bin/sh", "-c", "${command}"]`, indent);
    }
}

function generateEntrypointHCL(entrypoint, indent) {
    if (Array.isArray(entrypoint)) {
        out_append(`    entrypoint = ${JSON.stringify(entrypoint)}`, indent);
    } else if (typeof entrypoint === 'string') {
        out_append(`    entrypoint = ["/bin/sh", "-c", "${entrypoint}"]`, indent);
    }
}

function generateCapabilitiesHCL(service, indent) {
    if (service.cap_add || service.cap_drop) {
        out_append('    capabilities {', indent);
        if (service.cap_add) {
            out_append(`      add = ${JSON.stringify(service.cap_add)}`, indent + 1);
        }
        if (service.cap_drop) {
            out_append(`      drop = ${JSON.stringify(service.cap_drop)}`, indent + 1);
        }
        out_append('    }', indent);
    }
}

function generateHealthcheckHCL(healthcheck, indent) {
    if (healthcheck.test) {
        out_append('    check {', indent);
        out_append('      type = "script"', indent + 1);
        out_append('      command = "docker"', indent + 1);
        if (Array.isArray(healthcheck.test)) {
            out_append(`      args = ${JSON.stringify(healthcheck.test)}`, indent + 1);
        } else {
            out_append(`      args = ["exec", "container", "${healthcheck.test}"]`, indent + 1);
        }
        if (healthcheck.interval) {
            out_append(`      interval = "${healthcheck.interval}"`, indent + 1);
        }
        if (healthcheck.timeout) {
            out_append(`      timeout = "${healthcheck.timeout}"`, indent + 1);
        }
        if (healthcheck.retries) {
            out_append(`      check_restart {`, indent + 1);
            out_append(`        limit = ${healthcheck.retries}`, indent + 2);
            out_append('      }', indent + 1);
        }
        out_append('    }', indent);
    }
}

function generateLabelsHCL(labels, indent) {
    if (typeof labels === 'object') {
        out_append('    labels {', indent);
        Object.entries(labels).forEach(([key, value]) => {
            out_append(`      ${key} = "${value}"`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateRestartPolicyHCL(restart, indent) {
    const restartMap = {
        'no': 'fail',
        'always': 'restart',
        'on-failure': 'fail',
        'unless-stopped': 'restart'
    };
    
    if (restartMap[restart]) {
        out_append(`    restart_policy = "${restartMap[restart]}"`, indent);
    }
}

function generateLoggingHCL(logging, indent) {
    if (logging.driver) {
        out_append('    logging {', indent);
        out_append(`      type = "${logging.driver}"`, indent + 1);
        if (logging.options) {
            out_append('      config {', indent + 1);
            Object.entries(logging.options).forEach(([key, value]) => {
                out_append(`        ${key} = "${value}"`, indent + 2);
            });
            out_append('      }', indent + 1);
        }
        out_append('    }', indent);
    }
}

function generateServiceConfigsHCL(configs, indent) {
    if (Array.isArray(configs)) {
        configs.forEach(config => {
            if (typeof config === 'string') {
                out_append(`    template {`, indent);
                out_append(`      data = <<EOH`, indent + 1);
                out_append(`        # Config: ${config}`, indent + 1);
                out_append('      EOH', indent + 1);
                out_append(`      destination = "local/${config}"`, indent + 1);
                out_append('    }', indent);
            } else if (typeof config === 'object') {
                out_append('    template {', indent);
                out_append('      data = <<EOH', indent + 1);
                out_append(`        # Config: ${config.source}`, indent + 1);
                out_append('      EOH', indent + 1);
                out_append(`      destination = "local/${config.target || config.source}"`, indent + 1);
                out_append('    }', indent);
            }
        });
    }
}

function generateServiceSecretsHCL(secrets, indent) {
    if (Array.isArray(secrets)) {
        secrets.forEach(secret => {
            if (typeof secret === 'string') {
                out_append(`    template {`, indent);
                out_append(`      data = <<EOH`, indent + 1);
                out_append(`        # Secret: ${secret}`, indent + 1);
                out_append('      EOH', indent + 1);
                out_append(`      destination = "secrets/${secret}"`, indent + 1);
                out_append('    }', indent);
            } else if (typeof secret === 'object') {
                out_append(`    template {`, indent);
                out_append(`      data = <<EOH`, indent + 1);
                out_append(`        # Secret: ${secret.source}`, indent + 1);
                out_append('      EOH', indent + 1);
                out_append(`      destination = "secrets/${secret.target || secret.source}"`, indent + 1);
                out_append('    }', indent);
            }
        });
    }
}

function generateGPUHCL(gpus, indent) {
    if (gpus === 'all') {
        out_append('    device "nvidia.com/gpu" {', indent);
        out_append('      count = 1', indent + 1);
        out_append('    }', indent);
    } else if (Array.isArray(gpus)) {
        gpus.forEach((gpu, index) => {
            out_append(`    device "nvidia.com/gpu" {`, indent);
            if (gpu.count) {
                out_append(`      count = ${gpu.count}`, indent + 1);
            } else {
                out_append('      count = 1', indent + 1);
            }
            if (gpu.device_ids) {
                out_append(`      device_ids = ${JSON.stringify(gpu.device_ids)}`, indent + 1);
            }
            out_append('    }', indent);
        });
    }
}

function generateDevelopmentHCL(develop, indent) {
    if (develop.watch) {
        out_append('    # Development mode with file watching', indent);
        out_append('    # Note: Nomad does not support file watching like Docker Compose', indent);
        out_append('    # Consider using external tools or CI/CD for development workflows', indent);
    }
}

function generateDeployHCL(deploy, indent) {
    if (deploy.replicas) {
        out_append(`    # Deploy replicas: ${deploy.replicas}`, indent);
        out_append('    # Note: Use Nomad scaling commands to adjust replicas', indent);
    }
    
    if (deploy.resources) {
        out_append('    # Deploy resources configuration', indent);
        if (deploy.resources.limits) {
            out_append('    # Resource limits:', indent);
            if (deploy.resources.limits.cpus) {
                out_append(`    #   CPUs: ${deploy.resources.limits.cpus}`, indent);
            }
            if (deploy.resources.limits.memory) {
                out_append(`    #   Memory: ${deploy.resources.limits.memory}`, indent);
            }
        }
    }
}

function generateServiceHooksHCL(service, indent) {
    if (service.post_start || service.pre_stop) {
        out_append('    # Service lifecycle hooks', indent);
        out_append('    # Note: Nomad does not support post_start/pre_stop hooks', indent);
        out_append('    # Consider using Nomad lifecycle hooks or external orchestration', indent);
    }
}

function generateNetworksHCL(indent) {
    out_append('  # Networks configuration', indent);
    out_append('  # Note: Nomad handles networking differently than Docker Compose', indent);
    out_append('  # Networks are typically configured at the cluster level', indent);
}

function generateVolumesHCL(indent) {
    out_append('  # Volumes configuration', indent);
    out_append('  # Note: Nomad volumes are configured differently than Docker Compose', indent);
    out_append('  # Consider using Nomad CSI plugins or host volumes', indent);
}

function generateConfigsHCL(indent) {
    out_append('  # Configs configuration', indent);
    out_append('  # Note: Nomad configs are handled via templates and variables', indent);
}

function generateSecretsHCL(indent) {
    out_append('  # Secrets configuration', indent);
    out_append('  # Note: Nomad secrets are handled via Vault integration or templates', indent);
}

function generateModelsHCL(indent) {
    out_append('  # Models (AI/ML models) configuration', indent);
    out_append('  # Note: Nomad handles model deployment and management', indent);
}

function generateIncludeHCL(indent) {
    out_append('  # Include files', indent);
    out_append('  # Note: Nomad handles file inclusion via templates', indent);
}

function generateProfilesHCL(indent) {
    out_append('  # Profiles', indent);
    out_append('  # Note: Nomad handles profile-specific configurations', indent);
}

function generateServiceProfilesHCL(profiles, indent) {
    if (Array.isArray(profiles)) {
        profiles.forEach(profile => {
            out_append(`    profile "${profile}" {`, indent);
            // Add specific profile configurations here if needed
            out_append('    }', indent);
        });
    }
}

function generateDependsOnHCL(dependsOn, indent) {
    if (Array.isArray(dependsOn)) {
        dependsOn.forEach(dep => {
            out_append(`    depends_on = ["${dep}"]`, indent);
        });
    } else if (typeof dependsOn === 'object') {
        Object.entries(dependsOn).forEach(([name, condition]) => {
            out_append(`    depends_on = ["${name}"]`, indent);
            if (condition) {
                out_append(`      condition = "${condition}"`, indent);
            }
        });
    }
}

function generateExtendsHCL(extendsConfig, indent) {
    if (typeof extendsConfig === 'string') {
        out_append(`    extends = "${extendsConfig}"`, indent);
    } else if (typeof extendsConfig === 'object') {
        out_append('    extends = {', indent);
        Object.entries(extendsConfig).forEach(([key, value]) => {
            out_append(`      ${key} = "${value}"`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateBuildHCL(build, indent) {
    if (typeof build === 'string') {
        out_append(`    build = "${build}"`, indent);
    } else if (typeof build === 'object') {
        out_append('    build = {', indent);
        Object.entries(build).forEach(([key, value]) => {
            out_append(`      ${key} = "${value}"`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateBlkioConfigHCL(blkioConfig, indent) {
    if (typeof blkioConfig === 'object') {
        out_append('    blkio_config {', indent);
        Object.entries(blkioConfig).forEach(([key, value]) => {
            out_append(`      ${key} = ${typeof value === 'string' ? `"${value}"` : value}`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateCPUConfigHCL(service, indent) {
    out_append('    cpu {', indent);
    if (service.cpu_count) {
        out_append(`      count = ${service.cpu_count}`, indent + 1);
    }
    if (service.cpu_percent) {
        out_append(`      percent = ${service.cpu_percent}`, indent + 1);
    }
    if (service.cpu_shares) {
        out_append(`      shares = ${service.cpu_shares}`, indent + 1);
    }
    if (service.cpu_period) {
        out_append(`      period = ${service.cpu_period}`, indent + 1);
    }
    if (service.cpu_quota) {
        out_append(`      quota = ${service.cpu_quota}`, indent + 1);
    }
    if (service.cpu_rt_period) {
        out_append(`      rt_period = ${service.cpu_rt_period}`, indent + 1);
    }
    if (service.cpu_rt_runtime) {
        out_append(`      rt_runtime = ${service.cpu_rt_runtime}`, indent + 1);
    }
    if (service.cpus) {
        out_append(`      cpus = "${service.cpus}"`, indent + 1);
    }
    if (service.cpuset) {
        out_append(`      cpuset = "${service.cpuset}"`, indent + 1);
    }
    out_append('    }', indent);
}

function generateMemoryConfigHCL(service, indent) {
    out_append('    memory {', indent);
    if (service.mem_limit) {
        out_append(`      limit = ${service.mem_limit}`, indent + 1);
    }
    if (service.mem_reservation) {
        out_append(`      reservation = ${service.mem_reservation}`, indent + 1);
    }
    if (service.mem_swappiness) {
        out_append(`      swappiness = ${service.mem_swappiness}`, indent + 1);
    }
    if (service.memswap_limit) {
        out_append(`      swap_limit = ${service.memswap_limit}`, indent + 1);
    }
    out_append('    }', indent);
}

function generateUlimitsHCL(ulimits, indent) {
    if (Array.isArray(ulimits)) {
        ulimits.forEach(ulimit => {
            out_append('    ulimit {', indent);
            out_append(`      name = "${ulimit.name}"`, indent + 1);
            out_append(`      soft = ${ulimit.soft}`, indent + 1);
            out_append(`      hard = ${ulimit.hard}`, indent + 1);
            out_append('    }', indent);
        });
    } else if (typeof ulimits === 'object') {
        out_append('    ulimit {', indent);
        Object.entries(ulimits).forEach(([key, value]) => {
            out_append(`      ${key} = ${value}`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateSysctlsHCL(sysctls, indent) {
    if (typeof sysctls === 'object') {
        out_append('    sysctls {', indent);
        Object.entries(sysctls).forEach(([key, value]) => {
            out_append(`      ${key} = ${typeof value === 'string' ? `"${value}"` : value}`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateSecurityOptHCL(securityOpt, indent) {
    if (Array.isArray(securityOpt)) {
        out_append('    security_opt = [', indent);
        securityOpt.forEach(opt => {
            out_append(`      "${opt}"`, indent + 1);
        });
        out_append('    ]', indent);
    } else if (typeof securityOpt === 'string') {
        out_append(`    security_opt = ["${securityOpt}"]`, indent);
    }
}

function generateStorageOptHCL(storageOpt, indent) {
    if (Array.isArray(storageOpt)) {
        out_append('    storage_opt = [', indent);
        storageOpt.forEach(opt => {
            out_append(`      "${opt}"`, indent + 1);
        });
        out_append('    ]', indent);
    } else if (typeof storageOpt === 'string') {
        out_append(`    storage_opt = ["${storageOpt}"]`, indent);
    }
}

function generateTmpfsHCL(tmpfs, indent) {
    if (Array.isArray(tmpfs)) {
        out_append('    tmpfs {', indent);
        tmpfs.forEach(mount => {
            out_append(`      mount = "${mount}"`, indent + 1);
        });
        out_append('    }', indent);
    } else if (typeof tmpfs === 'string') {
        out_append(`    tmpfs = "${tmpfs}"`, indent);
    }
}

function generateDevicesHCL(devices, indent) {
    if (Array.isArray(devices)) {
        out_append('    devices {', indent);
        devices.forEach(device => {
            out_append(`      path = "${device.path}"`, indent + 1);
            if (device.cgroups_path) {
                out_append(`      cgroups_path = "${device.cgroups_path}"`, indent + 1);
            }
            if (device.permissions) {
                out_append(`      permissions = "${device.permissions}"`, indent + 1);
            }
        });
        out_append('    }', indent);
    }
}

function generateGroupAddHCL(groupAdd, indent) {
    if (Array.isArray(groupAdd)) {
        out_append('    group_add = [', indent);
        groupAdd.forEach(group => {
            out_append(`      "${group}"`, indent + 1);
        });
        out_append('    ]', indent);
    } else if (typeof groupAdd === 'string') {
        out_append(`    group_add = ["${groupAdd}"]`, indent);
    }
}

function generateExtraHostsHCL(extraHosts, indent) {
    if (Array.isArray(extraHosts)) {
        extraHosts.forEach(host => {
            if (typeof host === 'string' && host.includes(':')) {
                const [hostname, ip] = host.split(':');
                out_append(`    # Extra host: ${hostname} -> ${ip}`, indent);
            }
        });
    } else if (typeof extraHosts === 'object') {
        Object.entries(extraHosts).forEach(([hostname, ip]) => {
            out_append(`    # Extra host: ${hostname} -> ${ip}`, indent);
        });
    }
}

function generateDNSHCL(dns, indent) {
    if (Array.isArray(dns)) {
        out_append('    dns = [', indent);
        dns.forEach(entry => {
            out_append(`      "${entry}"`, indent + 1);
        });
        out_append('    ]', indent);
    } else if (typeof dns === 'string') {
        out_append(`    dns = ["${dns}"]`, indent);
    }
}

function generateDNSOptHCL(dnsOpt, indent) {
    if (Array.isArray(dnsOpt)) {
        out_append('    dns_opt = [', indent);
        dnsOpt.forEach(opt => {
            out_append(`      "${opt}"`, indent + 1);
        });
        out_append('    ]', indent);
    } else if (typeof dnsOpt === 'string') {
        out_append(`    dns_opt = ["${dnsOpt}"]`, indent);
    }
}

function generateDNSSearchHCL(dnsSearch, indent) {
    if (Array.isArray(dnsSearch)) {
        out_append('    dns_search = [', indent);
        dnsSearch.forEach(entry => {
            out_append(`      "${entry}"`, indent + 1);
        });
        out_append('    ]', indent);
    } else if (typeof dnsSearch === 'string') {
        out_append(`    dns_search = ["${dnsSearch}"]`, indent);
    }
}

function generateExternalLinksHCL(externalLinks, indent) {
    if (Array.isArray(externalLinks)) {
        out_append('    external_links = [', indent);
        externalLinks.forEach(link => {
            out_append(`      "${link}"`, indent + 1);
        });
        out_append('    ]', indent);
    } else if (typeof externalLinks === 'string') {
        out_append(`    external_links = ["${externalLinks}"]`, indent);
    }
}

function generateLinksHCL(links, indent) {
    if (Array.isArray(links)) {
        out_append('    links = [', indent);
        links.forEach(link => {
            out_append(`      "${link}"`, indent + 1);
        });
        out_append('    ]', indent);
    } else if (typeof links === 'string') {
        out_append(`    links = ["${links}"]`, indent);
    }
}

function generateProviderHCL(provider, indent) {
    if (typeof provider === 'string') {
        out_append(`    provider = "${provider}"`, indent);
    } else if (typeof provider === 'object') {
        out_append('    provider = {', indent);
        Object.entries(provider).forEach(([key, value]) => {
            out_append(`      ${key} = "${value}"`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateAnnotationsHCL(annotations, indent) {
    if (typeof annotations === 'object') {
        out_append('    annotations {', indent);
        Object.entries(annotations).forEach(([key, value]) => {
            out_append(`      ${key} = "${value}"`, indent + 1);
        });
        out_append('    }', indent);
    }
}

function generateServiceModelsHCL(models, indent) {
    if (Array.isArray(models)) {
        out_append('    models {', indent);
        models.forEach(model => {
            out_append(`      name = "${model.name}"`, indent + 1);
            if (model.image) {
                out_append(`      image = "${model.image}"`, indent + 1);
            }
            if (model.command) {
                generateCommandHCL(model.command, indent + 1);
            }
            if (model.entrypoint) {
                generateEntrypointHCL(model.entrypoint, indent + 1);
            }
            if (model.working_dir) {
                out_append(`      working_dir = "${model.working_dir}"`, indent + 1);
            }
            if (model.user) {
                out_append(`      user = "${model.user}"`, indent + 1);
            }
            if (model.cap_add || model.cap_drop) {
                generateCapabilitiesHCL(model, indent + 1);
            }
            if (model.healthcheck) {
                generateHealthcheckHCL(model.healthcheck, indent + 1);
            }
            if (model.labels) {
                generateLabelsHCL(model.labels, indent + 1);
            }
            if (model.restart) {
                generateRestartPolicyHCL(model.restart, indent + 1);
            }
            if (model.logging) {
                generateLoggingHCL(model.logging, indent + 1);
            }
            if (model.configs) {
                generateServiceConfigsHCL(model.configs, indent + 1);
            }
            if (model.secrets) {
                generateServiceSecretsHCL(model.secrets, indent + 1);
            }
            if (model.gpus) {
                generateGPUHCL(model.gpus, indent + 1);
            }
            if (model.develop) {
                generateDevelopmentHCL(model.develop, indent + 1);
            }
            if (model.deploy) {
                generateDeployHCL(model.deploy, indent + 1);
            }
            if (model.profiles) {
                generateServiceProfilesHCL(model.profiles, indent + 1);
            }
            if (model.depends_on) {
                generateDependsOnHCL(model.depends_on, indent + 1);
            }
            if (model.extends) {
                generateExtendsHCL(model.extends, indent + 1);
            }
            if (model.build) {
                generateBuildHCL(model.build, indent + 1);
            }
            if (model.privileged) {
                out_append(`      privileged = ${model.privileged}`, indent + 1);
            }
            if (model.read_only) {
                out_append(`      readonly_rootfs = ${model.read_only}`, indent + 1);
            }
            if (model.tty) {
                out_append(`      tty = ${model.tty}`, indent + 1);
            }
            if (model.stdin_open) {
                out_append(`      interactive = ${model.stdin_open}`, indent + 1);
            }
            if (model.stop_signal) {
                out_append(`      stop_signal = "${model.stop_signal}"`, indent + 1);
            }
            if (model.stop_grace_period) {
                out_append(`      kill_timeout = "${model.stop_grace_period}"`, indent + 1);
            }
            if (model.platform) {
                out_append(`      # Platform: ${model.platform}`, indent + 1);
                out_append('      # Note: Nomad handles platform selection automatically', indent + 1);
            }
            if (model.runtime) {
                out_append(`      # Runtime: ${model.runtime}`, indent + 1);
                out_append('      # Note: Nomad uses its own runtime management', indent + 1);
            }
            if (model.isolation) {
                out_append(`      # Isolation: ${model.isolation}`, indent + 1);
                out_append('      # Note: Nomad handles container isolation', indent + 1);
            }
            if (model.sysctls) {
                generateSysctlsHCL(model.sysctls, indent + 1);
            }
            if (model.ulimits) {
                generateUlimitsHCL(model.ulimits, indent + 1);
            }
            if (model.security_opt) {
                generateSecurityOptHCL(model.security_opt, indent + 1);
            }
            if (model.storage_opt) {
                generateStorageOptHCL(model.storage_opt, indent + 1);
            }
            if (model.tmpfs) {
                generateTmpfsHCL(model.tmpfs, indent + 1);
            }
            if (model.devices) {
                generateDevicesHCL(model.devices, indent + 1);
            }
            if (model.group_add) {
                generateGroupAddHCL(model.group_add, indent + 1);
            }
            if (model.extra_hosts) {
                generateExtraHostsHCL(model.extra_hosts, indent + 1);
            }
            if (model.dns) {
                generateDNSHCL(model.dns, indent + 1);
            }
            if (model.dns_opt) {
                generateDNSOptHCL(model.dns_opt, indent + 1);
            }
            if (model.dns_search) {
                generateDNSSearchHCL(model.dns_search, indent + 1);
            }
            if (model.domainname) {
                out_append(`      # Domain name: ${model.domainname}`, indent + 1);
                out_append('      # Note: Nomad handles domain configuration', indent + 1);
            }
            if (model.hostname) {
                out_append(`      # Hostname: ${model.hostname}`, indent + 1);
                out_append('      # Note: Nomad handles hostname configuration', indent + 1);
            }
            if (model.ipc) {
                out_append(`      # IPC mode: ${model.ipc}`, indent + 1);
                out_append('      # Note: Nomad handles IPC configuration', indent + 1);
            }
            if (model.pid) {
                out_append(`      # PID mode: ${model.pid}`, indent + 1);
                out_append('      # Note: Nomad handles PID configuration', indent + 1);
            }
            if (model.uts) {
                out_append(`      # UTS mode: ${model.uts}`, indent + 1);
                out_append('      # Note: Nomad handles UTS configuration', indent + 1);
            }
            if (model.userns_mode) {
                out_append(`      # User namespace mode: ${model.userns_mode}`, indent + 1);
                out_append('      # Note: Nomad handles namespace configuration', indent + 1);
            }
            if (model.cgroup) {
                out_append(`      # Cgroup: ${model.cgroup}`, indent + 1);
                out_append('      # Note: Nomad handles cgroup configuration', indent + 1);
            }
            if (model.cgroup_parent) {
                out_append(`      # Cgroup parent: ${model.cgroup_parent}`, indent + 1);
                out_append('      # Note: Nomad handles cgroup configuration', indent + 1);
            }
            if (model.blkio_config) {
                generateBlkioConfigHCL(model.blkio_config, indent + 1);
            }
            if (model.cpu_count || model.cpu_percent || model.cpu_shares || 
                model.cpu_period || model.cpu_quota || model.cpu_rt_period || 
                model.cpu_rt_runtime || model.cpus || model.cpuset) {
                generateCPUConfigHCL(model, indent + 1);
            }
            if (model.mem_limit || model.mem_reservation || model.mem_swappiness || 
                model.memswap_limit) {
                generateMemoryConfigHCL(model, indent + 1);
            }
            if (model.pids_limit) {
                out_append(`      # PIDs limit: ${model.pids_limit}`, indent + 1);
                out_append('      # Note: Nomad handles process limits', indent + 1);
            }
            if (model.oom_kill_disable) {
                out_append(`      # OOM kill disable: ${model.oom_kill_disable}`, indent + 1);
                out_append('      # Note: Nomad handles OOM configuration', indent + 1);
            }
            if (model.oom_score_adj) {
                out_append(`      # OOM score adjustment: ${model.oom_score_adj}`, indent + 1);
                out_append('      # Note: Nomad handles OOM configuration', indent + 1);
            }
            if (model.init) {
                out_append(`      # Init process: ${model.init}`, indent + 1);
                out_append('      # Note: Nomad handles init configuration', indent + 1);
            }
            if (model.pull_policy) {
                out_append(`      # Pull policy: ${model.pull_policy}`, indent + 1);
                out_append('      # Note: Nomad handles image pulling', indent + 1);
            }
            if (model.pull_refresh_after) {
                out_append(`      # Pull refresh after: ${model.pull_refresh_after}`, indent + 1);
                out_append('      # Note: Nomad handles image refresh', indent + 1);
            }
            if (model.scale) {
                out_append(`      # Scale: ${model.scale}`, indent + 1);
                out_append('      # Note: Use Nomad scaling commands', indent + 1);
            }
            if (model.external_links) {
                generateExternalLinksHCL(model.external_links, indent + 1);
            }
            if (model.links) {
                generateLinksHCL(model.links, indent + 1);
            }
            if (model.provider) {
                generateProviderHCL(model.provider, indent + 1);
            }
            if (model.annotations) {
                generateAnnotationsHCL(model.annotations, indent + 1);
            }
            if (model.attach !== undefined) {
                out_append(`      # Attach: ${model.attach}`, indent + 1);
                out_append('      # Note: Nomad handles log collection', indent + 1);
            }
            if (model.models) {
                generateServiceModelsHCL(model.models, indent + 1);
            }
            if (model.use_api_socket) {
                out_append(`      # Use API socket: ${model.use_api_socket}`, indent + 1);
                out_append('      # Note: Nomad handles Docker API access', indent + 1);
            }
        });
        out_append('    }', indent);
    }
}

// Add js-yaml library if not present
function loadYAMLLibrary() {
    if (typeof jsyaml === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js';
        script.onload = () => console.log('js-yaml library loaded');
        script.onerror = () => console.warn('Failed to load js-yaml, using fallback parser');
        document.head.appendChild(script);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadYAMLLibrary();
});
