# 🐳 Compose2HCL

[![npm version](https://badge.fury.io/js/compose2hcl.svg)](https://badge.fury.io/js/compose2hcl)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A comprehensive **Docker Compose to Nomad HCL converter** with complete specification support. Convert your Docker Compose files to production-ready Nomad job specifications with full feature coverage.

## ✨ Features

### 🚀 **Complete Docker Compose Support**

- **All service configurations** - images, builds, commands, environments
- **Full resource management** - CPU, memory, GPU, capabilities
- **Comprehensive networking** - ports, networks, DNS, extra hosts  
- **Volume management** - bind mounts, named volumes, tmpfs
- **Security features** - capabilities, security options, user management
- **Health checks** - with proper Nomad check configurations
- **Environment variables** - inline and from files
- **Configs & secrets** - with template-based handling
- **Dependencies** - converted to Nomad constraints where possible

### 🎯 **Production-Ready Nomad HCL**

- **Complete job specifications** - all Nomad features supported
- **Service discovery** - automatic Consul service registration
- **Resource allocation** - proper CPU/memory/disk management
- **Health monitoring** - health checks and restart policies
- **Network configuration** - port mapping and network modes
- **Volume mounting** - host and CSI volume support
- **Template system** - for configs and secrets management

### 🛠️ **Developer Experience**

- **TypeScript** - full type safety and IntelliSense
- **CLI tool** - command-line interface for automation
- **Web interface** - browser-based converter with live preview
- **Node.js API** - programmatic usage in applications
- **Comprehensive validation** - catch errors before deployment
- **Detailed warnings** - guidance for best practices

## 📦 Installation

### NPM Package

```bash
# Install globally for CLI usage
npm install -g compose2hcl

# Or install locally for programmatic usage
npm install compose2hcl
```

### From Source

```bash
git clone <repository-url>
cd compose2hcl
npm install
npm run build
```

## 🚀 Quick Start

### CLI Usage

```bash
# Convert a Docker Compose file
compose2hcl convert docker-compose.yml

# Convert with custom output file
compose2hcl convert docker-compose.yml -o app.nomad

# Convert with custom job name and settings
compose2hcl convert docker-compose.yml -j my-app -n production -d "dc1,dc2"

# Validate Docker Compose file
compose2hcl validate docker-compose.yml

# Show help
compose2hcl --help
```

### Programmatic Usage

```typescript
import { convertCompose } from 'compose2hcl';

const composeYaml = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
`;

const result = await convertCompose(composeYaml, {
  jobName: 'my-web-app',
  namespace: 'production',
  datacenters: ['dc1', 'dc2']
});

console.log(result.hcl);
```

### Web Interface

```bash
# Start the web server
npm run start:web

# Open http://localhost:3000 in your browser
```

## 📖 API Reference

### `convertCompose(composeContent, options)`

Convert Docker Compose YAML to Nomad HCL.

**Parameters:**

- `composeContent` (string) - Docker Compose YAML content
- `options` (ConversionOptions) - Conversion options

**Returns:** `Promise<ConversionResult>`

### `ConversionOptions`

```typescript
interface ConversionOptions {
  jobName?: string;           // Nomad job name (default: 'docker-compose')
  namespace?: string;         // Nomad namespace (default: 'default')  
  datacenters?: string[];     // Target datacenters (default: ['dc1'])
  region?: string;            // Nomad region (default: 'global')
  priority?: number;          // Job priority (default: 50)
  skipValidation?: boolean;   // Skip validation (default: false)
  includeComments?: boolean;  // Include comments in HCL (default: true)
  preserveLabels?: boolean;   // Preserve Docker labels (default: true)
  networkMode?: 'bridge' | 'host' | 'none'; // Network mode (default: 'bridge')
  resourceDefaults?: {
    cpu?: number;             // Default CPU in MHz (default: 100)
    memory?: number;          // Default memory in MB (default: 128)
  };
}
```

### `ConversionResult`

```typescript
interface ConversionResult {
  hcl: string;              // Generated Nomad HCL
  nomadJob: NomadJob;       // Parsed Nomad job object
  warnings: string[];       // Conversion warnings
  errors: string[];         // Conversion errors
}
```

## 📋 Examples

### Basic Web Application

**Docker Compose:**

```yaml
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped
```

**Generated Nomad HCL:**

```hcl
job "docker-compose" {
  datacenters = ["dc1"]
  type = "service"

  group "web" {
    count = 1

    network {
      port "port_0" {
        static = 80
        to = 80
      }
    }

    task "web" {
      driver = "docker"

      config {
        image = "nginx:alpine"
        ports = ["port_0"]
      }

      env {
        NODE_ENV = "production"
      }

      resources {
        cpu = 100
        memory = 128
      }
    }
  }
}
```

### Full Stack Application

**Docker Compose:**

```yaml
version: '3.8'
services:
  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    image: node:16-alpine
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/app
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=app
      - POSTGRES_USER=user  
      - POSTGRES_PASSWORD=pass
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

This generates a complete multi-service Nomad job with proper networking, service discovery, and resource management.

## 🔧 Advanced Usage

### Custom Resource Allocation

```typescript
const result = await convertCompose(composeYaml, {
  resourceDefaults: {
    cpu: 500,    // 500 MHz
    memory: 512  // 512 MB
  }
});
```

### Multiple Datacenters

```typescript
const result = await convertCompose(composeYaml, {
  datacenters: ['dc1', 'dc2', 'dc3'],
  region: 'us-west'
});
```

### Production Configuration

```typescript
const result = await convertCompose(composeYaml, {
  jobName: 'production-app',
  namespace: 'production',
  priority: 75,
  networkMode: 'host',
  includeComments: false
});
```

## 🎯 Supported Docker Compose Features

### ✅ Fully Supported

- **Services**: image, build, command, entrypoint, working_dir, user
- **Networking**: ports, expose, networks, external_links, links
- **Volumes**: bind mounts, named volumes, tmpfs
- **Environment**: variables, env_file
- **Resources**: CPU, memory limits and reservations
- **Health Checks**: all test types and configurations
- **Restart Policies**: all restart modes
- **Dependencies**: depends_on converted to constraints
- **Labels**: preserved as Nomad meta
- **Logging**: driver and options
- **Security**: capabilities, privileged mode, security_opt
- **Devices**: device mapping

### ⚠️ Partially Supported

- **Networks**: converted to Nomad networking where possible
- **Configs/Secrets**: converted to Nomad templates
- **Build**: build context noted, requires separate build process
- **Deploy**: most deployment options converted

### ❌ Not Supported

- **Swarm Mode**: specific features (use Nomad equivalents)
- **External Networks**: must exist in Nomad environment
- **Some Legacy Features**: deprecated Docker Compose v1/v2 features

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Format code
npm run format
```

## 🌐 Web Interface

The package includes a modern web interface for converting Docker Compose files:

### Features

- **Live Editor**: Syntax-highlighted YAML and HCL editors
- **Real-time Conversion**: Convert as you type
- **File Upload**: Drag and drop Docker Compose files
- **Export Options**: Download as HCL or JSON
- **Examples**: Pre-built examples to get started
- **Settings**: Customize conversion options
- **Responsive**: Works on desktop and mobile

### Starting the Web Server

```bash
# Start the web server
npm run start:web

# Or with custom port
PORT=8080 npm run start:web
```

## 🔌 API Endpoints

The web server exposes REST API endpoints:

### `POST /api/convert`

Convert Docker Compose to Nomad HCL

**Request Body:**

```json
{
  "composeContent": "version: '3.8'\nservices:\n  web:\n    image: nginx",
  "options": {
    "jobName": "my-app",
    "namespace": "production"
  }
}
```

**Response:**

```json
{
  "success": true,
  "hcl": "job \"my-app\" { ... }",
  "nomadJob": { ... },
  "warnings": [],
  "errors": []
}
```

### `GET /api/info`

Get library information

### `GET /api/health`

Health check endpoint

## 📚 Documentation

### CLI Commands

```bash
# Convert command
compose2hcl convert <input> [options]
  -o, --output <file>        Output HCL file path
  -j, --job-name <name>      Nomad job name
  -n, --namespace <ns>       Nomad namespace
  -r, --region <region>      Nomad region
  -d, --datacenters <dcs>    Comma-separated datacenters
  -p, --priority <priority>  Job priority
  --skip-validation          Skip Docker Compose validation
  --no-comments             Exclude comments from HCL
  --network-mode <mode>     Network mode (bridge|host|none)
  --cpu <cpu>               Default CPU allocation (MHz)
  --memory <memory>         Default memory allocation (MB)
  --format <format>         Output format (hcl|json)
  --verbose                 Verbose output

# Validate command  
compose2hcl validate <input> [options]
  --verbose                 Verbose output

# Info command
compose2hcl info

# Examples command
compose2hcl examples
```

### Environment Variables

```bash
# For web server
PORT=3000                    # Web server port
NODE_ENV=production         # Environment mode
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd compose2hcl

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

### Project Structure

```
src/
├── types/           # TypeScript type definitions
├── converter.ts     # Main conversion logic
├── validation/      # Docker Compose validation
├── generators/      # HCL generation
└── index.ts         # Public API

bin/
└── cli.js          # CLI interface

server/
└── web-server.js   # Web server

web/
├── index.html      # Web interface
├── styles.css      # Styles
└── app.js          # Frontend JavaScript

tests/
└── *.test.ts       # Test files
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [HashiCorp Nomad](https://www.nomadproject.io/) for the excellent orchestration platform
- [Docker Compose](https://docs.docker.com/compose/) for the container definition standard
- [js-yaml](https://github.com/nodeca/js-yaml) for YAML parsing
- [Commander.js](https://github.com/tj/commander.js) for CLI interface

## 📞 Support

- 📖 [Documentation](https://github.com/yourusername/compose2hcl/wiki)
- 🐛 [Issue Tracker](https://github.com/yourusername/compose2hcl/issues)
- 💬 [Discussions](https://github.com/yourusername/compose2hcl/discussions)
- 📧 [Email Support](mailto:support@compose2hcl.com)

---

**Made with ❤️ for the containerization community**
