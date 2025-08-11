import { Compose2HCLConverter } from '../src/converter';

describe('Compose2HCLConverter', () => {
  let converter: Compose2HCLConverter;

  beforeEach(() => {
    converter = new Compose2HCLConverter();
  });

  describe('Basic Conversion', () => {
    it('should convert simple compose file', async () => {
      const composeYaml = `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.hcl).toContain('job "docker-compose"');
      expect(result.hcl).toContain('group "web"');
      expect(result.hcl).toContain('driver = "docker"');
      expect(result.hcl).toContain('image = "nginx:alpine"');
    });

    it('should handle environment variables', async () => {
      const composeYaml = `
version: '3.8'
services:
  app:
    image: node:16
    environment:
      - NODE_ENV=production
      - PORT=3000
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.hcl).toContain('env {');
      expect(result.hcl).toContain('NODE_ENV = "production"');
      expect(result.hcl).toContain('PORT = "3000"');
    });

    it('should convert ports correctly', async () => {
      const composeYaml = `
version: '3.8'
services:
  web:
    image: nginx
    ports:
      - "80:80"
      - "443:443"
      - "8080"
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.hcl).toContain('network {');
      expect(result.hcl).toContain('port "port_0"');
      expect(result.hcl).toContain('static = 80');
      expect(result.hcl).toContain('to = 80');
    });

    it('should handle volumes', async () => {
      const composeYaml = `
version: '3.8'
services:
  db:
    image: postgres
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./config:/etc/postgresql
volumes:
  db_data:
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.hcl).toContain('volume "volume_0"');
      expect(result.hcl).toContain('volume_mount {');
    });
  });

  describe('Advanced Features', () => {
    it('should convert healthchecks', async () => {
      const composeYaml = `
version: '3.8'
services:
  web:
    image: nginx
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.hcl).toContain('check {');
      expect(result.hcl).toContain('interval = "30s"');
      expect(result.hcl).toContain('timeout = "10s"');
    });

    it('should handle resource limits', async () => {
      const composeYaml = `
version: '3.8'
services:
  app:
    image: myapp
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.hcl).toContain('resources {');
      expect(result.hcl).toContain('cpu = 500'); // 0.5 * 1000
      expect(result.hcl).toContain('memory = 512');
    });

    it('should convert restart policies', async () => {
      const composeYaml = `
version: '3.8'
services:
  app:
    image: myapp
    restart: unless-stopped
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.hcl).toContain('restart {');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid YAML', async () => {
      const invalidYaml = `
version: '3.8'
services:
  web:
    image: nginx
    ports:
      - "80:80
`;

      const result = await converter.convert(invalidYaml);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.hcl).toContain('# ERROR:');
    });

    it('should handle missing required fields', async () => {
      const composeYaml = `
version: '3.8'
services:
  web:
    ports:
      - "80:80"
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom job name', async () => {
      const converter = new Compose2HCLConverter({
        jobName: 'my-custom-app'
      });

      const composeYaml = `
version: '3.8'
services:
  web:
    image: nginx
`;

      const result = await converter.convert(composeYaml);

      expect(result.hcl).toContain('job "my-custom-app"');
    });

    it('should respect resource defaults', async () => {
      const converter = new Compose2HCLConverter({
        resourceDefaults: {
          cpu: 200,
          memory: 256
        }
      });

      const composeYaml = `
version: '3.8'
services:
  web:
    image: nginx
`;

      const result = await converter.convert(composeYaml);

      expect(result.hcl).toContain('cpu = 200');
      expect(result.hcl).toContain('memory = 256');
    });

    it('should skip validation when requested', async () => {
      const converter = new Compose2HCLConverter({
        skipValidation: true
      });

      const composeYaml = `
version: '3.8'
services:
  web:
    ports:
      - "80:80"
`;

      const result = await converter.convert(composeYaml);

      // Should not fail validation even with missing image
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multi-service application', async () => {
      const composeYaml = `
version: '3.8'
services:
  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - backend
  
  backend:
    image: node:16
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=myapp
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.hcl).toContain('group "frontend"');
      expect(result.hcl).toContain('group "backend"');
      expect(result.hcl).toContain('group "db"');
    });

    it('should handle networks', async () => {
      const composeYaml = `
version: '3.8'
services:
  web:
    image: nginx
    networks:
      - frontend
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
`;

      const result = await converter.convert(composeYaml);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });
});
