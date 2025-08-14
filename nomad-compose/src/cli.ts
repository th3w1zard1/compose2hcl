#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { join, resolve, extname } from 'path';
import { existsSync } from 'fs';
import { NomadClient } from './nomad-client';
import { DeploymentService } from './deployment-service';
import { DeployOptions } from './types/nomad-client';

const program = new Command();

program
  .name('nomad-compose')
  .description('Deploy Docker Compose files to Nomad')
  .version('1.0.0');

// Global options
program
  .option('-a, --address <url>', 'Nomad server address (default: http://localhost:4646)')
  .option('-t, --token <token>', 'Nomad ACL token')
  .option('-r, --region <region>', 'Nomad region (default: global)')
  .option('-n, --namespace <namespace>', 'Nomad namespace (default: default)')
  .option('--timeout <ms>', 'Operation timeout in milliseconds (default: 30000)');

// Deploy command
program
  .command('deploy <file>')
  .description('Deploy a Docker Compose file to Nomad')
  .option('-d, --dry-run', 'Convert and show HCL without deploying')
  .option('-w, --wait', 'Wait for deployment to complete')
  .option('--timeout <ms>', 'Deployment timeout in milliseconds (default: 300000)')
  .option('-f, --force', 'Force deployment even if validation fails')
  .option('--check-health', 'Check job health after deployment')
  .option('-o, --output <file>', 'Save converted HCL to file')
  .action(async (file, options) => {
    try {
      const globalOpts = program.opts();
      const composePath = resolve(file);
      
      if (!existsSync(composePath)) {
        console.error(chalk.red(`Error: File not found: ${composePath}`));
        process.exit(1);
      }

      // Initialize Nomad client
      const nomadClient = new NomadClient({
        address: globalOpts.address || 'http://localhost:4646',
        token: globalOpts.token,
        region: globalOpts.region,
        namespace: globalOpts.namespace,
        timeout: globalOpts.timeout ? parseInt(globalOpts.timeout) : undefined,
      });

      // Check Nomad connectivity
      const spinner = ora('Checking Nomad connectivity...').start();
      try {
        const isHealthy = await nomadClient.healthCheck();
        if (!isHealthy) {
          spinner.fail('Cannot connect to Nomad server');
          process.exit(1);
        }
        spinner.succeed('Connected to Nomad server');
      } catch (error) {
        spinner.fail(`Failed to connect to Nomad: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      // Initialize deployment service
      const deploymentService = new DeploymentService(nomadClient);

      // Deploy the compose file
      const deployOptions: DeployOptions = {
        dryRun: options.dryRun,
        waitForDeployment: options.wait,
        timeout: options.timeout ? parseInt(options.timeout) : undefined,
        force: options.force,
        checkHealth: options.checkHealth,
      };

      spinner.start('Deploying Docker Compose file...');
      const result = await deploymentService.deployComposeFile(composePath, deployOptions);

      if (result.success) {
        spinner.succeed(result.message);
        
        if (result.jobId) {
          console.log(chalk.green(`Job ID: ${result.jobId}`));
          if (result.jobUrl) {
            console.log(chalk.blue(`Job URL: ${result.jobUrl}`));
          }
        }

        // Show warnings if any
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(warning => console.log(chalk.yellow(`  - ${warning}`)));
        }

        // Save HCL to file if requested
        if (options.output && result.jobId) {
          try {
            const hclResult = await deploymentService.convertComposeFile(composePath);
            if (hclResult.success && hclResult.hcl) {
              await deploymentService.saveHclToFile(hclResult.hcl, options.output);
              console.log(chalk.green(`HCL saved to: ${options.output}`));
            }
          } catch (error) {
            console.log(chalk.yellow(`Warning: Could not save HCL to file: ${error instanceof Error ? error.message : String(error)}`));
          }
        }
      } else {
        spinner.fail(result.message);
        if (result.errors.length > 0) {
          console.log(chalk.red('\nErrors:'));
          result.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        }
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Convert command
program
  .command('convert <file>')
  .description('Convert Docker Compose file to Nomad HCL without deploying')
  .option('-o, --output <file>', 'Output file for HCL (default: stdout)')
  .option('--format <format>', 'Output format: hcl, json, yaml (default: hcl)')
  .action(async (file, options) => {
    try {
      const globalOpts = program.opts();
      const composePath = resolve(file);
      
      if (!existsSync(composePath)) {
        console.error(chalk.red(`Error: File not found: ${composePath}`));
        process.exit(1);
      }

      // Initialize Nomad client (we don't need it for conversion, but keeping consistent)
      const nomadClient = new NomadClient({
        address: globalOpts.address || 'http://localhost:4646',
        token: globalOpts.token,
        region: globalOpts.region,
        namespace: globalOpts.namespace,
        timeout: globalOpts.timeout ? parseInt(globalOpts.timeout) : undefined,
      });

      const deploymentService = new DeploymentService(nomadClient);

      const spinner = ora('Converting Docker Compose to Nomad HCL...').start();
      const result = await deploymentService.convertComposeFile(composePath);

      if (result.success && result.hcl) {
        spinner.succeed('Conversion completed successfully');
        
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(warning => console.log(chalk.yellow(`  - ${warning}`)));
        }

        if (options.output) {
          await deploymentService.saveHclToFile(result.hcl, options.output);
          console.log(chalk.green(`HCL saved to: ${options.output}`));
        } else {
          console.log(chalk.cyan('\nGenerated Nomad HCL:'));
          console.log('='.repeat(50));
          console.log(result.hcl);
          console.log('='.repeat(50));
        }
      } else {
        spinner.fail('Conversion failed');
        if (result.errors.length > 0) {
          console.log(chalk.red('\nErrors:'));
          result.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        }
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Status command
program
  .command('status <job-id>')
  .description('Get status of a deployed job')
  .option('-r, --region <region>', 'Nomad region')
  .option('-n, --namespace <namespace>', 'Nomad namespace')
  .action(async (jobId, options) => {
    try {
      const globalOpts = program.opts();
      
      const nomadClient = new NomadClient({
        address: globalOpts.address || 'http://localhost:4646',
        token: globalOpts.token,
        region: globalOpts.region,
        namespace: globalOpts.namespace,
        timeout: globalOpts.timeout ? parseInt(globalOpts.timeout) : undefined,
      });

      const deploymentService = new DeploymentService(nomadClient);

      const spinner = ora('Fetching job status...').start();
      const status = await deploymentService.getDeploymentStatus(jobId);

      spinner.succeed('Status retrieved successfully');

      console.log(chalk.cyan('\nJob Information:'));
      console.log(`  ID: ${status.job.ID}`);
      console.log(`  Name: ${status.job.Name}`);
      console.log(`  Type: ${status.job.Type}`);
      console.log(`  Status: ${status.job.Status}`);
      console.log(`  Submit Time: ${new Date(status.job.SubmitTime * 1000).toISOString()}`);

      console.log(chalk.cyan('\nAllocations:'));
      if (status.allocations.length > 0) {
        status.allocations.forEach(alloc => {
          console.log(`  - ${alloc.ID}: ${alloc.ClientStatus} (${alloc.TaskGroup})`);
        });
      } else {
        console.log('  No allocations found');
      }

      console.log(chalk.cyan('\nEvaluations:'));
      if (status.evaluations.length > 0) {
        status.evaluations.forEach(eval => {
          console.log(`  - ${eval.ID}: ${eval.Status} (${eval.Type})`);
        });
      } else {
        console.log('  No evaluations found');
      }

    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Stop command
program
  .command('stop <job-id>')
  .description('Stop a deployed job')
  .option('-p, --purge', 'Purge the job completely')
  .option('-r, --region <region>', 'Nomad region')
  .option('-n, --namespace <namespace>', 'Nomad namespace')
  .action(async (jobId, options) => {
    try {
      const globalOpts = program.opts();
      
      const nomadClient = new NomadClient({
        address: globalOpts.address || 'http://localhost:4646',
        token: globalOpts.token,
        region: globalOpts.region,
        namespace: globalOpts.namespace,
        timeout: globalOpts.timeout ? parseInt(globalOpts.timeout) : undefined,
      });

      const deploymentService = new DeploymentService(nomadClient);

      const spinner = ora('Stopping job...').start();
      await deploymentService.stopJob(jobId, options.purge);
      
      spinner.succeed(`Job ${jobId} stopped successfully${options.purge ? ' and purged' : ''}`);

    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Show Nomad cluster information')
  .action(async () => {
    try {
      const globalOpts = program.opts();
      
      const nomadClient = new NomadClient({
        address: globalOpts.address || 'http://localhost:4646',
        token: globalOpts.token,
        region: globalOpts.region,
        namespace: globalOpts.namespace,
        timeout: globalOpts.timeout ? parseInt(globalOpts.timeout) : undefined,
      });

      const spinner = ora('Fetching cluster information...').start();
      const status = await nomadClient.getStatus();
      const nodes = await nomadClient.getNodes();

      spinner.succeed('Cluster information retrieved');

      console.log(chalk.cyan('\nNomad Cluster Status:'));
      console.log(`  Leader: ${status.leader}`);
      console.log(`  Servers: ${status.servers.length}`);

      console.log(chalk.cyan('\nNodes:'));
      nodes.forEach(node => {
        const statusColor = node.Status === 'ready' ? chalk.green : chalk.red;
        console.log(`  - ${node.Name} (${node.ID}): ${statusColor(node.Status)}`);
        console.log(`    Datacenter: ${node.Datacenter}, Class: ${node.NodeClass}`);
      });

    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('interactive')
  .description('Run in interactive mode')
  .action(async () => {
    try {
      const globalOpts = program.opts();
      
      console.log(chalk.cyan('Welcome to nomad-compose interactive mode!'));
      console.log(chalk.gray('This will guide you through the deployment process.\n'));

      // Get compose file
      const { composeFile } = await inquirer.prompt([
        {
          type: 'input',
          name: 'composeFile',
          message: 'Path to Docker Compose file:',
          validate: (input) => {
            if (!input.trim()) return 'Please provide a file path';
            if (!existsSync(resolve(input.trim()))) return 'File does not exist';
            return true;
          }
        }
      ]);

      // Get Nomad configuration
      const { nomadAddress, nomadToken, nomadRegion, nomadNamespace } = await inquirer.prompt([
        {
          type: 'input',
          name: 'nomadAddress',
          message: 'Nomad server address:',
          default: globalOpts.address || 'http://localhost:4646'
        },
        {
          type: 'password',
          name: 'nomadToken',
          message: 'Nomad ACL token (optional):',
          default: globalOpts.token || ''
        },
        {
          type: 'input',
          name: 'nomadRegion',
          message: 'Nomad region:',
          default: globalOpts.region || 'global'
        },
        {
          type: 'input',
          name: 'nomadNamespace',
          message: 'Nomad namespace:',
          default: globalOpts.namespace || 'default'
        }
      ]);

      // Get deployment options
      const { dryRun, waitForDeployment, saveHcl } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'dryRun',
          message: 'Dry run (convert only, don\'t deploy)?',
          default: false
        },
        {
          type: 'confirm',
          name: 'waitForDeployment',
          message: 'Wait for deployment to complete?',
          default: true,
          when: (answers) => !answers.dryRun
        },
        {
          type: 'confirm',
          name: 'saveHcl',
          message: 'Save converted HCL to file?',
          default: false
        }
      ]);

      let outputFile = '';
      if (saveHcl) {
        const { outputPath } = await inquirer.prompt([
          {
            type: 'input',
            name: 'outputPath',
            message: 'Output file path for HCL:',
            default: `${composeFile}.nomad.hcl`
          }
        ]);
        outputFile = outputPath;
      }

      // Initialize services
      const nomadClient = new NomadClient({
        address: nomadAddress,
        token: nomadToken || undefined,
        region: nomadRegion,
        namespace: nomadNamespace,
        timeout: globalOpts.timeout ? parseInt(globalOpts.timeout) : undefined,
      });

      const deploymentService = new DeploymentService(nomadClient);

      // Check connectivity
      const spinner = ora('Checking Nomad connectivity...').start();
      try {
        const isHealthy = await nomadClient.healthCheck();
        if (!isHealthy) {
          spinner.fail('Cannot connect to Nomad server');
          process.exit(1);
        }
        spinner.succeed('Connected to Nomad server');
      } catch (error) {
        spinner.fail(`Failed to connect to Nomad: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      // Deploy
      const deployOptions: DeployOptions = {
        dryRun,
        waitForDeployment,
        timeout: 300000,
      };

      spinner.start('Processing deployment...');
      const result = await deploymentService.deployComposeFile(resolve(composeFile), deployOptions);

      if (result.success) {
        spinner.succeed(result.message);
        
        if (result.jobId) {
          console.log(chalk.green(`Job ID: ${result.jobId}`));
          if (result.jobUrl) {
            console.log(chalk.blue(`Job URL: ${result.jobUrl}`));
          }
        }

        // Save HCL if requested
        if (saveHcl && outputFile && result.jobId) {
          try {
            const hclResult = await deploymentService.convertComposeFile(resolve(composeFile));
            if (hclResult.success && hclResult.hcl) {
              await deploymentService.saveHclToFile(hclResult.hcl, outputFile);
              console.log(chalk.green(`HCL saved to: ${outputFile}`));
            }
          } catch (error) {
            console.log(chalk.yellow(`Warning: Could not save HCL to file: ${error instanceof Error ? error.message : String(error)}`));
          }
        }

        // Show warnings if any
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(warning => console.log(chalk.yellow(`  - ${warning}`)));
        }
      } else {
        spinner.fail(result.message);
        if (result.errors.length > 0) {
          console.log(chalk.red('\nErrors:'));
          result.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        }
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
