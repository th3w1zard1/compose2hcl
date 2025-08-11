#!/usr/bin/env node

/**
 * Compose2HCL CLI
 * Command-line interface for Docker Compose to Nomad HCL conversion
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Import the compiled library
const { convertCompose, validateComposeFile, INFO } = require('../lib/index');

const program = new Command();

program
  .name('compose2hcl')
  .description('Convert Docker Compose files to Nomad HCL')
  .version(INFO.version);

// Main convert command
program
  .command('convert')
  .alias('c')
  .description('Convert Docker Compose file to Nomad HCL')
  .argument('<input>', 'Input Docker Compose file path')
  .option('-o, --output <file>', 'Output HCL file path')
  .option('-j, --job-name <name>', 'Nomad job name', 'docker-compose')
  .option('-n, --namespace <namespace>', 'Nomad namespace', 'default')
  .option('-r, --region <region>', 'Nomad region', 'global')
  .option('-d, --datacenters <dcs>', 'Comma-separated datacenters', 'dc1')
  .option('-p, --priority <priority>', 'Job priority', '50')
  .option('--skip-validation', 'Skip Docker Compose validation')
  .option('--no-comments', 'Exclude comments from HCL output')
  .option('--no-preserve-labels', 'Do not preserve Docker labels')
  .option('--network-mode <mode>', 'Network mode (bridge|host|none)', 'bridge')
  .option('--cpu <cpu>', 'Default CPU allocation (MHz)', '100')
  .option('--memory <memory>', 'Default memory allocation (MB)', '128')
  .option('--format <format>', 'Output format (hcl|json)', 'hcl')
  .option('--verbose', 'Verbose output')
  .action(async (input, options) => {
    try {
      console.log(chalk.blue('🐳 Compose2HCL - Docker Compose to Nomad HCL Converter'));
      console.log(chalk.gray(`Version: ${INFO.version}\n`));

      // Check input file
      if (!fs.existsSync(input)) {
        console.error(chalk.red(`❌ Input file not found: ${input}`));
        process.exit(1);
      }

      if (options.verbose) {
        console.log(chalk.gray(`📂 Reading: ${input}`));
      }

      // Read compose file
      const composeContent = fs.readFileSync(input, 'utf8');

      // Parse datacenters
      const datacenters = options.datacenters.split(',').map(dc => dc.trim());

      // Conversion options
      const conversionOptions = {
        jobName: options.jobName,
        namespace: options.namespace,
        region: options.region,
        datacenters,
        priority: parseInt(options.priority),
        skipValidation: options.skipValidation,
        includeComments: options.comments !== false,
        preserveLabels: options.preserveLabels !== false,
        networkMode: options.networkMode,
        resourceDefaults: {
          cpu: parseInt(options.cpu),
          memory: parseInt(options.memory),
        },
      };

      if (options.verbose) {
        console.log(chalk.gray('⚙️  Conversion options:'));
        console.log(chalk.gray(JSON.stringify(conversionOptions, null, 2)));
        console.log();
      }

      // Convert
      console.log(chalk.yellow('🔄 Converting Docker Compose to Nomad HCL...'));
      const result = await convertCompose(composeContent, conversionOptions);

      // Handle errors
      if (result.errors.length > 0) {
        console.log(chalk.red('\n❌ Conversion Errors:'));
        result.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
        process.exit(1);
      }

      // Show warnings
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
        console.log();
      }

      // Determine output
      let output;
      if (options.format === 'json') {
        output = JSON.stringify(result.nomadJob, null, 2);
      } else {
        output = result.hcl;
      }

      // Write output
      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, output);
        console.log(chalk.green(`✅ Successfully converted to: ${outputPath}`));
      } else {
        console.log(chalk.green('✅ Conversion successful:\n'));
        console.log(output);
      }

      // Show stats
      if (options.verbose) {
        const stats = {
          inputSize: composeContent.length,
          outputSize: output.length,
          services: Object.keys(result.nomadJob.job).length,
          warnings: result.warnings.length,
        };
        
        console.log(chalk.gray('\n📊 Conversion Statistics:'));
        console.log(chalk.gray(`  Input size: ${stats.inputSize} bytes`));
        console.log(chalk.gray(`  Output size: ${stats.outputSize} bytes`));
        console.log(chalk.gray(`  Jobs: ${stats.services}`));
        console.log(chalk.gray(`  Warnings: ${stats.warnings}`));
      }

    } catch (error) {
      console.error(chalk.red(`\n❌ Conversion failed: ${error.message}`));
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .alias('v')
  .description('Validate Docker Compose file')
  .argument('<input>', 'Input Docker Compose file path')
  .option('--verbose', 'Verbose output')
  .action(async (input, options) => {
    try {
      console.log(chalk.blue('🔍 Validating Docker Compose file...'));

      // Check input file
      if (!fs.existsSync(input)) {
        console.error(chalk.red(`❌ Input file not found: ${input}`));
        process.exit(1);
      }

      // Read and validate
      const composeContent = fs.readFileSync(input, 'utf8');
      const { load } = require('js-yaml');
      const composeData = load(composeContent);
      
      const result = validateComposeFile(composeData);

      if (result.isValid) {
        console.log(chalk.green('✅ Docker Compose file is valid'));
      } else {
        console.log(chalk.red('❌ Docker Compose file has errors:'));
        result.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }

      if (options.verbose && result.isValid) {
        console.log(chalk.gray('\n📋 File Summary:'));
        if (composeData.version) {
          console.log(chalk.gray(`  Version: ${composeData.version}`));
        }
        if (composeData.services) {
          console.log(chalk.gray(`  Services: ${Object.keys(composeData.services).length}`));
        }
        if (composeData.networks) {
          console.log(chalk.gray(`  Networks: ${Object.keys(composeData.networks).length}`));
        }
        if (composeData.volumes) {
          console.log(chalk.gray(`  Volumes: ${Object.keys(composeData.volumes).length}`));
        }
      }

      process.exit(result.isValid ? 0 : 1);

    } catch (error) {
      console.error(chalk.red(`\n❌ Validation failed: ${error.message}`));
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .alias('i')
  .description('Show library information')
  .action(() => {
    console.log(chalk.blue('🐳 Compose2HCL Information\n'));
    
    console.log(chalk.white('📦 Package:'));
    console.log(`  Name: ${INFO.name}`);
    console.log(`  Version: ${INFO.version}`);
    console.log(`  Description: ${INFO.description}\n`);
    
    console.log(chalk.white('🐋 Supported Docker Compose Versions:'));
    INFO.supportedComposeVersions.forEach(version => {
      console.log(`  • ${version}`);
    });
    
    console.log(chalk.white('\n🎯 Supported Nomad Versions:'));
    INFO.supportedNomadVersions.forEach(version => {
      console.log(`  • ${version}`);
    });
    
    console.log(chalk.white('\n✨ Features:'));
    INFO.features.forEach(feature => {
      console.log(`  • ${feature}`);
    });
  });

// Examples command
program
  .command('examples')
  .alias('e')
  .description('Show usage examples')
  .action(() => {
    console.log(chalk.blue('🐳 Compose2HCL Usage Examples\n'));
    
    console.log(chalk.white('Basic conversion:'));
    console.log(chalk.gray('  compose2hcl convert docker-compose.yml\n'));
    
    console.log(chalk.white('Convert with custom job name and output:'));
    console.log(chalk.gray('  compose2hcl convert docker-compose.yml -o app.nomad -j my-app\n'));
    
    console.log(chalk.white('Convert with specific datacenter and region:'));
    console.log(chalk.gray('  compose2hcl convert docker-compose.yml -d "dc1,dc2" -r us-west\n'));
    
    console.log(chalk.white('Convert with custom resources:'));
    console.log(chalk.gray('  compose2hcl convert docker-compose.yml --cpu 200 --memory 256\n'));
    
    console.log(chalk.white('Validate compose file:'));
    console.log(chalk.gray('  compose2hcl validate docker-compose.yml\n'));
    
    console.log(chalk.white('Convert to JSON format:'));
    console.log(chalk.gray('  compose2hcl convert docker-compose.yml --format json\n'));
    
    console.log(chalk.white('Verbose conversion with no comments:'));
    console.log(chalk.gray('  compose2hcl convert docker-compose.yml --verbose --no-comments\n'));
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Unknown command. Use --help to see available commands.'));
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
