#!/usr/bin/env node

/**
 * Simple example of using nomad-compose programmatically
 * 
 * This script demonstrates how to deploy a Docker Compose file to Nomad
 * using the nomad-compose package in your own Node.js applications.
 */

const { deployComposeToNomad, NomadClient, DeploymentService } = require('../lib');

async function main() {
  try {
    console.log('🚀 Starting Docker Compose to Nomad deployment...\n');

    // Example Docker Compose content
    const composeContent = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    environment:
      - NGINX_HOST=localhost
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
`;

    // Nomad configuration
    const nomadConfig = {
      address: process.env.NOMAD_ADDRESS || 'http://localhost:4646',
      token: process.env.NOMAD_TOKEN,
      region: process.env.NOMAD_REGION || 'global',
      namespace: process.env.NOMAD_NAMESPACE || 'default',
      timeout: 30000,
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
      timeout: 300000, // 5 minutes
      force: false,
      checkHealth: true,
    };

    if (deployOptions.dryRun) {
      console.log('🔍 Running in DRY RUN mode (no actual deployment)\n');
    }

    // Deploy the compose content
    console.log('📤 Deploying to Nomad...');
    const result = await deployComposeToNomad(composeContent, nomadConfig, deployOptions);

    if (result.success) {
      console.log('✅ Deployment successful!');
      console.log(`📝 Message: ${result.message}`);
      
      if (result.jobId) {
        console.log(`🆔 Job ID: ${result.jobId}`);
      }
      
      if (result.jobUrl) {
        console.log(`🔗 Job URL: ${result.jobUrl}`);
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

    } else {
      console.log('❌ Deployment failed!');
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

// Alternative approach using the classes directly
async function alternativeApproach() {
  console.log('\n🔄 Alternative approach using classes directly...\n');

  try {
    const nomadClient = new NomadClient({
      address: process.env.NOMAD_ADDRESS || 'http://localhost:4646',
      token: process.env.NOMAD_TOKEN,
      region: process.env.NOMAD_REGION || 'global',
      namespace: process.env.NOMAD_NAMESPACE || 'default',
    });

    const deploymentService = new DeploymentService(nomadClient);

    // Check Nomad connectivity
    console.log('🔍 Checking Nomad connectivity...');
    const isHealthy = await nomadClient.healthCheck();
    
    if (!isHealthy) {
      console.log('❌ Cannot connect to Nomad server');
      return;
    }
    
    console.log('✅ Connected to Nomad server');

    // Get cluster info
    console.log('\n📊 Getting cluster information...');
    const status = await nomadClient.getStatus();
    console.log(`  Leader: ${status.leader}`);
    console.log(`  Servers: ${status.servers.length}`);

  } catch (error) {
    console.error('💥 Error in alternative approach:', error.message);
  }
}

// Run the main function
if (require.main === module) {
  main().then(() => {
    if (process.argv.includes('--alternative')) {
      return alternativeApproach();
    }
  });
}

module.exports = { main, alternativeApproach };
