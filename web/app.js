/**
 * Compose2HCL Web Interface JavaScript
 */

class Compose2HCLApp {
  constructor() {
    this.lastConversionResult = null;
    this.currentOutputFormat = 'hcl';
    this.settings = this.loadSettings();
    this.initializeApp();
  }

  initializeApp() {
    this.setupEventListeners();
    this.loadExample();
    this.updateStats();
  }

  setupEventListeners() {
    // Input change listener
    const input = document.getElementById('compose-input');
    input.addEventListener('input', () => this.updateStats());
    input.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Output format change
    const formatSelect = document.getElementById('output-format');
    formatSelect.addEventListener('change', () => this.changeOutputFormat());

    // Window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  handleKeydown(e) {
    // Ctrl/Cmd + Enter to convert
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.convert();
    }
  }

  handleResize() {
    // Adjust editor heights on mobile
    if (window.innerWidth < 768) {
      const editors = document.querySelectorAll('.editor');
      editors.forEach(editor => {
        editor.style.height = '250px';
      });
    }
  }

  updateStats() {
    const input = document.getElementById('compose-input');
    const output = document.getElementById('hcl-output');
    
    // Input stats
    const inputLines = input.value.split('\\n').length;
    const inputChars = input.value.length;
    document.getElementById('input-stats').textContent = 
      `${inputLines} lines, ${inputChars} characters`;

    // Output stats
    const outputLines = output.value.split('\\n').length;
    const outputChars = output.value.length;
    document.getElementById('output-stats').textContent = 
      `${outputLines} lines, ${outputChars} characters`;
  }

  async convert() {
    const input = document.getElementById('compose-input').value.trim();
    
    if (!input) {
      this.showToast('Please provide Docker Compose content', 'warning');
      return;
    }

    const convertBtn = document.getElementById('convert-btn');
    const originalText = convertBtn.innerHTML;
    
    try {
      // Show loading state
      convertBtn.innerHTML = '<span class="loading"></span> Converting...';
      convertBtn.disabled = true;
      
      this.hideStatus();

      // Make API call
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          composeContent: input,
          options: this.settings
        }),
      });

      const result = await response.json();
      this.lastConversionResult = result;

      if (result.success) {
        this.handleConversionSuccess(result);
      } else {
        this.handleConversionError(result.error);
      }

    } catch (error) {
      this.handleConversionError(error.message);
    } finally {
      // Restore button
      convertBtn.innerHTML = originalText;
      convertBtn.disabled = false;
      this.updateStats();
    }
  }

  handleConversionSuccess(result) {
    // Update output
    this.updateOutput(result);
    
    // Show status
    const messages = [];
    
    if (result.errors && result.errors.length > 0) {
      messages.push({
        type: 'error',
        title: 'Errors:',
        items: result.errors
      });
    }
    
    if (result.warnings && result.warnings.length > 0) {
      messages.push({
        type: 'warning',
        title: 'Warnings:',
        items: result.warnings
      });
    }
    
    if (messages.length === 0) {
      messages.push({
        type: 'success',
        title: '✅ Conversion successful!',
        items: []
      });
    }
    
    this.showStatus(messages);
    this.showToast('Conversion completed successfully!', 'success');
  }

  handleConversionError(error) {
    this.showStatus([{
      type: 'error',
      title: '❌ Conversion failed:',
      items: [error]
    }]);
    
    this.showToast('Conversion failed', 'error');
    
    // Clear output
    document.getElementById('hcl-output').value = '';
    this.updateStats();
  }

  updateOutput(result) {
    const output = document.getElementById('hcl-output');
    
    if (this.currentOutputFormat === 'json') {
      output.value = JSON.stringify(result.nomadJob, null, 2);
    } else {
      output.value = result.hcl;
    }
    
    // Update format indicator
    const formatSpan = output.parentElement.querySelector('.editor-format');
    formatSpan.textContent = this.currentOutputFormat.toUpperCase();
  }

  async validateOnly() {
    const input = document.getElementById('compose-input').value.trim();
    
    if (!input) {
      this.showToast('Please provide Docker Compose content', 'warning');
      return;
    }

    try {
      // For now, we'll use the convert endpoint and just show validation results
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          composeContent: input,
          options: { ...this.settings, skipValidation: false }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        if (result.warnings && result.warnings.length > 0) {
          this.showStatus([{
            type: 'warning',
            title: '⚠️ Validation completed with warnings:',
            items: result.warnings
          }]);
        } else {
          this.showStatus([{
            type: 'success',
            title: '✅ Docker Compose file is valid!',
            items: []
          }]);
        }
        this.showToast('Validation completed', 'success');
      } else {
        this.showStatus([{
          type: 'error',
          title: '❌ Validation failed:',
          items: [result.error]
        }]);
        this.showToast('Validation failed', 'error');
      }

    } catch (error) {
      this.showStatus([{
        type: 'error',
        title: '❌ Validation error:',
        items: [error.message]
      }]);
      this.showToast('Validation error', 'error');
    }
  }

  changeOutputFormat() {
    const format = document.getElementById('output-format').value;
    this.currentOutputFormat = format;
    
    if (this.lastConversionResult && this.lastConversionResult.success) {
      this.updateOutput(this.lastConversionResult);
      this.updateStats();
    }
  }

  showStatus(messages) {
    const statusSection = document.getElementById('status-section');
    const statusContent = document.getElementById('status-content');
    
    let html = '';
    
    messages.forEach(message => {
      html += `<div class="status ${message.type}">`;
      html += `<strong>${message.title}</strong>`;
      
      if (message.items && message.items.length > 0) {
        html += '<ul>';
        message.items.forEach(item => {
          html += `<li>${this.escapeHtml(item)}</li>`;
        });
        html += '</ul>';
      }
      
      html += '</div>';
    });
    
    statusContent.innerHTML = html;
    statusSection.style.display = 'block';
  }

  hideStatus() {
    const statusSection = document.getElementById('status-section');
    statusSection.style.display = 'none';
  }

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => container.removeChild(toast), 300);
    }, duration);
  }

  clearInput() {
    document.getElementById('compose-input').value = '';
    this.updateStats();
    this.hideStatus();
  }

  loadExample() {
    const example = `version: '3.8'

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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - api

  api:
    image: node:16-alpine
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgres://user:password@db:5432/myapp
    volumes:
      - ./app:/usr/src/app
      - /usr/src/app/node_modules
    working_dir: /usr/src/app
    command: ["npm", "start"]
    restart: unless-stopped
    depends_on:
      - db
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  db:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  default:
    driver: bridge`;

    document.getElementById('compose-input').value = example;
    this.updateStats();
    this.hideStatus();
  }

  loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\\.(yml|yaml)$/i)) {
      this.showToast('Please select a YAML file (.yml or .yaml)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('compose-input').value = e.target.result;
      this.updateStats();
      this.hideStatus();
      this.showToast(`Loaded ${file.name}`, 'success');
    };
    reader.readAsText(file);
  }

  copyOutput() {
    const output = document.getElementById('hcl-output');
    
    if (!output.value.trim()) {
      this.showToast('No output to copy', 'warning');
      return;
    }

    navigator.clipboard.writeText(output.value).then(() => {
      this.showToast('Output copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback for older browsers
      output.select();
      document.execCommand('copy');
      this.showToast('Output copied to clipboard!', 'success');
    });
  }

  downloadOutput() {
    const output = document.getElementById('hcl-output');
    
    if (!output.value.trim()) {
      this.showToast('No output to download', 'warning');
      return;
    }

    const extension = this.currentOutputFormat === 'json' ? 'json' : 'nomad';
    const filename = `docker-compose-converted.${extension}`;
    const mimeType = this.currentOutputFormat === 'json' ? 'application/json' : 'text/plain';
    
    const blob = new Blob([output.value], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast(`Downloaded ${filename}`, 'success');
  }

  showExamples() {
    const examples = [
      {
        name: 'Simple Web App',
        description: 'Basic nginx + Node.js application',
        compose: `version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
  app:
    image: node:16-alpine
    ports:
      - "3000:3000"`
      },
      {
        name: 'Full Stack App',
        description: 'Complete application with database, cache, and monitoring',
        compose: `version: '3.8'
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
      - DATABASE_URL=postgres://user:pass@db:5432/app
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=app
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - db_data:/var/lib/postgresql/data
  
  cache:
    image: redis:7-alpine
    volumes:
      - cache_data:/data

volumes:
  db_data:
  cache_data:`
      },
      {
        name: 'Microservices',
        description: 'Multiple services with service discovery',
        compose: `version: '3.8'
services:
  user-service:
    image: myapp/user-service:latest
    ports:
      - "3001:3000"
    environment:
      - SERVICE_NAME=user-service
  
  order-service:
    image: myapp/order-service:latest
    ports:
      - "3002:3000"
    environment:
      - SERVICE_NAME=order-service
      - USER_SERVICE_URL=http://user-service:3000
  
  api-gateway:
    image: myapp/api-gateway:latest
    ports:
      - "80:3000"
    depends_on:
      - user-service
      - order-service`
      }
    ];

    const content = `
      <div style="max-width: 600px;">
        <p>Select an example to load into the editor:</p>
        ${examples.map(example => `
          <div style="border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; cursor: pointer;" 
               onclick="app.loadExampleCompose(\`${example.compose.replace(/\`/g, '\\`')}\`)">
            <h4 style="margin: 0 0 0.5rem 0;">${example.name}</h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">${example.description}</p>
          </div>
        `).join('')}
      </div>
    `;

    this.showModal('Examples', content);
  }

  loadExampleCompose(compose) {
    document.getElementById('compose-input').value = compose;
    this.updateStats();
    this.hideStatus();
    this.closeModal();
    this.showToast('Example loaded!', 'success');
  }

  showSettings() {
    const content = `
      <div style="max-width: 500px;">
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Job Name:</label>
          <input type="text" id="setting-job-name" value="${this.settings.jobName || 'docker-compose'}" 
                 style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius);">
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Namespace:</label>
          <input type="text" id="setting-namespace" value="${this.settings.namespace || 'default'}"
                 style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius);">
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Region:</label>
          <input type="text" id="setting-region" value="${this.settings.region || 'global'}"
                 style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius);">
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datacenters (comma-separated):</label>
          <input type="text" id="setting-datacenters" value="${(this.settings.datacenters || ['dc1']).join(', ')}"
                 style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius);">
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Network Mode:</label>
          <select id="setting-network-mode" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius);">
            <option value="bridge" ${(this.settings.networkMode || 'bridge') === 'bridge' ? 'selected' : ''}>Bridge</option>
            <option value="host" ${this.settings.networkMode === 'host' ? 'selected' : ''}>Host</option>
            <option value="none" ${this.settings.networkMode === 'none' ? 'selected' : ''}>None</option>
          </select>
        </div>
        
        <div style="display: flex; gap: 1rem;">
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Default CPU (MHz):</label>
            <input type="number" id="setting-cpu" value="${this.settings.resourceDefaults?.cpu || 100}" min="1"
                   style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius);">
          </div>
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Default Memory (MB):</label>
            <input type="number" id="setting-memory" value="${this.settings.resourceDefaults?.memory || 128}" min="1"
                   style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius);">
          </div>
        </div>
        
        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
          <button class="btn btn-primary" onclick="app.saveSettings()">Save Settings</button>
          <button class="btn btn-secondary" onclick="app.resetSettings()">Reset to Defaults</button>
        </div>
      </div>
    `;

    this.showModal('Settings', content);
  }

  saveSettings() {
    this.settings = {
      jobName: document.getElementById('setting-job-name').value || 'docker-compose',
      namespace: document.getElementById('setting-namespace').value || 'default',
      region: document.getElementById('setting-region').value || 'global',
      datacenters: document.getElementById('setting-datacenters').value.split(',').map(dc => dc.trim()).filter(dc => dc),
      networkMode: document.getElementById('setting-network-mode').value,
      resourceDefaults: {
        cpu: parseInt(document.getElementById('setting-cpu').value) || 100,
        memory: parseInt(document.getElementById('setting-memory').value) || 128,
      },
      includeComments: true,
      preserveLabels: true,
      skipValidation: false,
    };

    localStorage.setItem('compose2hcl-settings', JSON.stringify(this.settings));
    this.closeModal();
    this.showToast('Settings saved!', 'success');
  }

  resetSettings() {
    this.settings = this.getDefaultSettings();
    localStorage.removeItem('compose2hcl-settings');
    this.closeModal();
    this.showToast('Settings reset to defaults', 'success');
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('compose2hcl-settings');
      return saved ? JSON.parse(saved) : this.getDefaultSettings();
    } catch {
      return this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      jobName: 'docker-compose',
      namespace: 'default',
      region: 'global',
      datacenters: ['dc1'],
      networkMode: 'bridge',
      resourceDefaults: {
        cpu: 100,
        memory: 128,
      },
      includeComments: true,
      preserveLabels: true,
      skipValidation: false,
    };
  }

  async showInfo() {
    try {
      const response = await fetch('/api/info');
      const info = await response.json();
      
      const content = `
        <div style="max-width: 600px;">
          <div style="margin-bottom: 2rem;">
            <h3 style="margin: 0 0 1rem 0;">📦 Package Information</h3>
            <p><strong>Name:</strong> ${info.name}</p>
            <p><strong>Version:</strong> ${info.version}</p>
            <p><strong>Description:</strong> ${info.description}</p>
          </div>
          
          <div style="margin-bottom: 2rem;">
            <h3 style="margin: 0 0 1rem 0;">🐋 Supported Docker Compose Versions</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${info.supportedComposeVersions.map(v => `<span style="background: var(--surface); padding: 0.25rem 0.5rem; border-radius: var(--radius); font-family: var(--font-mono); font-size: 12px;">${v}</span>`).join('')}
            </div>
          </div>
          
          <div style="margin-bottom: 2rem;">
            <h3 style="margin: 0 0 1rem 0;">🎯 Supported Nomad Versions</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${info.supportedNomadVersions.map(v => `<span style="background: var(--surface); padding: 0.25rem 0.5rem; border-radius: var(--radius); font-family: var(--font-mono); font-size: 12px;">${v}</span>`).join('')}
            </div>
          </div>
          
          <div>
            <h3 style="margin: 0 0 1rem 0;">✨ Features</h3>
            <ul style="margin: 0; padding-left: 1.5rem;">
              ${info.features.map(f => `<li style="margin-bottom: 0.5rem;">${f}</li>`).join('')}
            </ul>
          </div>
          
          <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 14px; color: var(--text-secondary);">
            <p>For more information, documentation, and examples, visit the project repository.</p>
          </div>
        </div>
      `;

      this.showModal('Information', content);
    } catch (error) {
      this.showToast('Failed to load information', 'error');
    }
  }

  showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('active');
    
    // Focus management
    const modal = overlay.querySelector('.modal');
    modal.focus();
  }

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global functions for HTML onclick handlers
function convert() { app.convert(); }
function validateOnly() { app.validateOnly(); }
function clearInput() { app.clearInput(); }
function loadExample() { app.loadExample(); }
function loadFile(event) { app.loadFile(event); }
function copyOutput() { app.copyOutput(); }
function downloadOutput() { app.downloadOutput(); }
function changeOutputFormat() { app.changeOutputFormat(); }
function showExamples() { app.showExamples(); }
function showSettings() { app.showSettings(); }
function showInfo() { app.showInfo(); }
function closeModal() { app.closeModal(); }

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new Compose2HCLApp();
});
