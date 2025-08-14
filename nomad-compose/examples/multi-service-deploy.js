#!/usr/bin/env node

/**
 * Multi-service deployment example
 * 
 * This script demonstrates deploying a complex multi-service application
 * with databases, web services, and monitoring.
 */

const { deployComposeToNomad, NomadClient, DeploymentService } = require('../lib');

async function deployMultiServiceApp() {
  try {
    console.log('🚀 Deploying Multi-Service Application to Nomad...\n');

    // Complex multi-service Docker Compose
    const composeContent = `
version: '3.8'

services:
  # Web Application
  webapp:
    image: myapp/web:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
      - API_KEY=${process.env.API_KEY || 'default-key'}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  # API Service
  api:
    image: myapp/api:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${process.env.JWT_SECRET || 'default-secret'}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Database
  db:
    image: postgres:13-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=${process.env.DB_PASSWORD || 'password'}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Redis Cache
  redis:
    image: redis:6-alpine
    command: redis-server --appendonly yes --requirepass ${process.env.REDIS_PASSWORD || 'password'}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - webapp
      - api
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M
        reservations:
          cpus: '0.1'
          memory: 64M

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Grafana Dashboard
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${process.env.GRAFANA_PASSWORD || 'admin'}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  default:
    driver: bridge
`;

    // Nomad configuration
    const nomadConfig = {
      address: process.env.NOMAD_ADDRESS || 'http://localhost:4646',
      token: process.env.NOMAD_TOKEN,
      region: process.env.NOMAD_REGION || 'global',
      namespace: process.env.NOMAD_NAMESPACE || 'default',
      timeout: 60000, // Increased timeout for complex deployment
    };

    console.log('📋 Nomad Configuration:');
    console.log(`  Address: ${nomadConfig.address}`);
    console.log(`  Region: ${nomadConfig.region}`);
    console.log(`  Namespace: ${nomadConfig.namespace}`);
    console.log(`  Token: ${nomadConfig.token ? '***' : 'None'}\n`);

    // Deploy options
    const deployOptions = {
      dryRun: process.argv.includes('--dry-run'),
      waitForDeployment: true,
      timeout: 900000, // 15 minutes for complex deployment
      force: false,
      checkHealth: true,
    };

    if (deployOptions.dryRun) {
      console.log('🔍 Running in DRY RUN mode (no actual deployment)\n');
    }

    // Deploy the multi-service application
    console.log('📤 Deploying Multi-Service Application...');
    console.log('📊 Services to be deployed:');
    console.log('  - Web Application (Port 3000)');
    console.log('  - API Service (Port 3001)');
    console.log('  - PostgreSQL Database (Port 5432)');
    console.log('  - Redis Cache (Port 6379)');
    console.log('  - Nginx Reverse Proxy (Ports 80, 443)');
    console.log('  - Prometheus Monitoring (Port 9090)');
    console.log('  - Grafana Dashboard (Port 3002)\n');

    const result = await deployComposeToNomad(composeContent, nomadConfig, deployOptions);

    if (result.success) {
      console.log('✅ Multi-Service Deployment Successful!');
      console.log(`📝 Message: ${result.message}`);
      
      if (result.jobId) {
        console.log(`🆔 Job ID: ${result.jobId}`);
      }
      
      if (result.jobUrl) {
        console.log(`🔗 Job URL: ${result.jobUrl}`);
      }

      console.log('\n🌐 Service Endpoints:');
      console.log(`  Web App: http://localhost:3000`);
      console.log(`  API: http://localhost:3001`);
      console.log(`  Database: localhost:5432`);
      console.log(`  Redis: localhost:6379`);
      console.log(`  Nginx: http://localhost:80`);
      console.log(`  Prometheus: http://localhost:9090`);
      console.log(`  Grafana: http://localhost:3002`);

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

    } else {
      console.log('❌ Multi-Service Deployment Failed!');
      console.log(`📝 Message: ${result.message}`);
      
      if (result.errors.length > 0) {
        console.log('\n🚨 Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  }
}

// Function to check deployment status
async function checkDeploymentStatus(jobId) {
  try {
    const nomadClient = new NomadClient({
      address: process.env.NOMAD_ADDRESS || 'http://localhost:4646',
      token: process.env.NOMAD_TOKEN,
      region: process.env.NOMAD_REGION || 'global',
      namespace: process.env.NOMAD_NAMESPACE || 'default',
    });

    const deploymentService = new DeploymentService(nomadClient);
    
    console.log(`\n🔍 Checking deployment status for job: ${jobId}`);
    const status = await deploymentService.getDeploymentStatus(jobId);
    
    console.log('\n📊 Deployment Status:');
    console.log(`  Job: ${status.job.Name} (${status.job.ID})`);
    console.log(`  Status: ${status.job.Status}`);
    console.log(`  Allocations: ${status.allocations.length}`);
    console.log(`  Evaluations: ${status.evaluations.length}`);
    
    if (status.allocations.length > 0) {
      console.log('\n📋 Allocation Details:');
      status.allocations.forEach(alloc => {
        console.log(`  - ${alloc.ID}: ${alloc.ClientStatus} (${alloc.TaskGroup})`);
      });
    }

  } catch (error) {
    console.error('💥 Error checking deployment status:', error.message);
  }
}

// Function to stop the deployment
async function stopDeployment(jobId) {
  try {
    const nomadClient = new NomadClient({
      address: process.env.NOMAD_ADDRESS || 'http://localhost:4646',
      token: process.env.NOMAD_TOKEN,
      region: process.env.NOMAD_REGION || 'global',
      namespace: process.env.NOMAD_NAMESPACE || 'default',
    });

    const deploymentService = new DeploymentService(nomadClient);
    
    console.log(`\n🛑 Stopping deployment for job: ${jobId}`);
    await deploymentService.stopJob(jobId, true); // Purge the job
    
    console.log('✅ Deployment stopped and purged successfully');

  } catch (error) {
    console.error('💥 Error stopping deployment:', error.message);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      deployMultiServiceApp();
      break;
    case 'status':
      const jobId = process.argv[3];
      if (!jobId) {
        console.error('❌ Please provide a job ID: node multi-service-deploy.js status <job-id>');
        process.exit(1);
      }
      checkDeploymentStatus(jobId);
      break;
    case 'stop':
      const stopJobId = process.argv[3];
      if (!stopJobId) {
        console.error('❌ Please provide a job ID: node multi-service-deploy.js stop <job-id>');
        process.exit(1);
      }
      stopDeployment(stopJobId);
      break;
    default:
      console.log('🚀 Multi-Service Deployment Tool');
      console.log('\nUsage:');
      console.log('  node multi-service-deploy.js deploy          # Deploy the application');
      console.log('  node multi-service-deploy.js status <job-id> # Check deployment status');
      console.log('  node multi-service-deploy.js stop <job-id>   # Stop and purge deployment');
      console.log('\nEnvironment Variables:');
      console.log('  NOMAD_ADDRESS     # Nomad server address (default: http://localhost:4646)');
      console.log('  NOMAD_TOKEN      # Nomad ACL token');
      console.log('  NOMAD_REGION     # Nomad region (default: global)');
      console.log('  NOMAD_NAMESPACE  # Nomad namespace (default: default)');
      console.log('  API_KEY          # API key for the web application');
      console.log('  JWT_SECRET       # JWT secret for the API service');
      console.log('  DB_PASSWORD      # Database password');
      console.log('  REDIS_PASSWORD   # Redis password');
      console.log('  GRAFANA_PASSWORD # Grafana admin password');
      break;
  }
}

module.exports = { 
  deployMultiServiceApp, 
  checkDeploymentStatus, 
  stopDeployment 
};
