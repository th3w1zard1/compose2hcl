# nomad-compose

A powerful CLI tool to deploy Docker Compose files to HashiCorp Nomad using the `compose2hcl` package.

## Features

- 🚀 **Direct Deployment**: Deploy Docker Compose files directly to Nomad clusters
- 🔄 **Full Conversion**: Leverages the complete `compose2hcl` package for comprehensive Docker Compose support
- 🎯 **Multiple Commands**: Deploy, convert, status, stop, and cluster info
- 🎨 **Interactive Mode**: User-friendly interactive deployment wizard
- 📊 **Real-time Status**: Monitor deployment progress and job status
- 🛡️ **Validation**: Comprehensive Docker Compose validation before deployment
- 🔧 **Flexible Configuration**: Support for regions, namespaces, and ACL tokens
- 📝 **Dry Run**: Preview conversions without deploying

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to a Nomad cluster
- The `compose2hcl` package (included as a dependency)

### Install from Source

```bash
# Clone the repository
git clone <your-repo>
cd src/nomad-compose

# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm install -g .
```

### Install as Dependency

```bash
npm install nomad-compose
```

## Quick Start

### Basic Deployment

```bash
# Deploy a Docker Compose file to Nomad
nomad-compose deploy docker-compose.yml

# Deploy with custom Nomad server
nomad-compose -a http://nomad-server:4646 deploy docker-compose.yml

# Deploy with authentication
nomad-compose -t your-acl-token deploy docker-compose.yml
```

### Interactive Mode

```bash
# Run the interactive deployment wizard
nomad-compose interactive
```

## Usage

### Global Options

```bash
nomad-compose [global-options] <command> [command-options]

Global Options:
  -a, --address <url>     Nomad server address (default: http://localhost:4646)
  -t, --token <token>     Nomad ACL token
  -r, --region <region>   Nomad region (default: global)
  -n, --namespace <ns>    Nomad namespace (default: default)
  --timeout <ms>          Operation timeout in milliseconds (default: 30000)
```

### Commands

#### Deploy

Deploy a Docker Compose file to Nomad:

```bash
nomad-compose deploy <file> [options]

Options:
  -d, --dry-run           Convert and show HCL without deploying
  -w, --wait              Wait for deployment to complete
  --timeout <ms>          Deployment timeout (default: 300000)
  -f, --force             Force deployment even if validation fails
  --check-health          Check job health after deployment
  -o, --output <file>     Save converted HCL to file
```

Examples:

```bash
# Basic deployment
nomad-compose deploy docker-compose.yml

# Dry run to see the generated HCL
nomad-compose deploy docker-compose.yml --dry-run

# Deploy and wait for completion
nomad-compose deploy docker-compose.yml --wait

# Save HCL to file
nomad-compose deploy docker-compose.yml -o output.nomad.hcl

# Deploy with custom timeout
nomad-compose deploy docker-compose.yml --wait --timeout 600000
```

#### Convert

Convert Docker Compose to Nomad HCL without deploying:

```bash
nomad-compose convert <file> [options]

Options:
  -o, --output <file>     Output file for HCL (default: stdout)
  --format <format>       Output format: hcl, json, yaml (default: hcl)
```

Examples:

```bash
# Convert and display HCL
nomad-compose convert docker-compose.yml

# Convert and save to file
nomad-compose convert docker-compose.yml -o output.nomad.hcl
```

#### Status

Get status of a deployed job:

```bash
nomad-compose status <job-id> [options]

Options:
  -r, --region <region>   Nomad region
  -n, --namespace <ns>    Nomad namespace
```

Examples:

```bash
# Get job status
nomad-compose status abc12345-6789-def0-1234-567890abcdef

# Get status in specific region/namespace
nomad-compose status abc12345-6789-def0-1234-567890abcdef -r us-west-1 -n production
```

#### Stop

Stop a deployed job:

```bash
nomad-compose stop <job-id> [options]

Options:
  -p, --purge            Purge the job completely
  -r, --region <region>  Nomad region
  -n, --namespace <ns>   Nomad namespace
```

Examples:

```bash
# Stop a job
nomad-compose stop abc12345-6789-def0-1234-567890abcdef

# Stop and purge a job
nomad-compose stop abc12345-6789-def0-1234-567890abcdef --purge
```

#### Info

Show Nomad cluster information:

```bash
nomad-compose info
```

#### Interactive

Run in interactive mode:

```bash
nomad-compose interactive
```

## Configuration

### Environment Variables

You can set default values using environment variables:

```bash
export NOMAD_ADDRESS=http://nomad-server:4646
export NOMAD_TOKEN=your-acl-token
export NOMAD_REGION=us-west-1
export NOMAD_NAMESPACE=production
```

### Configuration File

Create a `.nomad-compose.yml` file in your project root:

```yaml
nomad:
  address: http://nomad-server:4646
  token: your-acl-token
  region: us-west-1
  namespace: production
  timeout: 30000

deploy:
  defaultTimeout: 300000
  waitForDeployment: true
  checkHealth: false
```

## Programmatic Usage

You can also use the package programmatically in your Node.js applications:

```typescript
import { deployComposeToNomad, NomadClient, DeploymentService } from 'nomad-compose';

// Deploy compose content to Nomad
const result = await deployComposeToNomad(
  composeContent,
  {
    address: 'http://localhost:4646',
    token: 'your-token',
    region: 'global',
    namespace: 'default'
  },
  {
    dryRun: false,
    waitForDeployment: true,
    timeout: 300000
  }
);

if (result.success) {
  console.log(`Job deployed: ${result.jobId}`);
} else {
  console.error('Deployment failed:', result.errors);
}

// Or use the classes directly
const nomadClient = new NomadClient({
  address: 'http://localhost:4646',
  token: 'your-token'
});

const deploymentService = new DeploymentService(nomadClient);
const result = await deploymentService.deployComposeFile('docker-compose.yml');
```

## Examples

### Simple Web Application

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    environment:
      - NGINX_HOST=localhost
    restart: unless-stopped
```

Deploy to Nomad:

```bash
nomad-compose deploy docker-compose.yml --wait
```

### Multi-Service Application

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: myapp:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://db:5432/myapp
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Deploy with custom configuration:

```bash
nomad-compose \
  -a http://nomad-cluster:4646 \
  -t your-acl-token \
  -r us-west-1 \
  -n production \
  deploy docker-compose.yml \
  --wait \
  --timeout 600000
```

## Error Handling

The tool provides comprehensive error handling:

- **Validation Errors**: Docker Compose validation failures
- **Conversion Errors**: Issues during HCL generation
- **Connection Errors**: Nomad server connectivity issues
- **Deployment Errors**: Job submission or scheduling failures

All errors include detailed messages and suggestions for resolution.

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify Nomad server address and port
   - Check firewall settings
   - Ensure Nomad is running

2. **Authentication Failed**
   - Verify ACL token is valid
   - Check token permissions
   - Ensure token hasn't expired

3. **Validation Errors**
   - Check Docker Compose file syntax
   - Verify all required fields are present
   - Review error messages for specific issues

4. **Deployment Timeout**
   - Increase timeout value
   - Check Nomad cluster capacity
   - Verify resource requirements

### Debug Mode

Enable verbose logging:

```bash
DEBUG=nomad-compose:* nomad-compose deploy docker-compose.yml
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Examples**: See the examples directory

## Related Projects

- [compose2hcl](https://github.com/your-org/compose2hcl) - Docker Compose to Nomad HCL converter
- [Nomad](https://www.nomadproject.io/) - HashiCorp Nomad
- [Docker Compose](https://docs.docker.com/compose/) - Docker Compose specification
