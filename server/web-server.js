#!/usr/bin/env node

/**
 * Simple web server for Compose2HCL browser interface
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { convertCompose } = require('../lib/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../web')));

// API endpoint for conversion
app.post('/api/convert', async (req, res) => {
  try {
    const { composeContent, options = {} } = req.body;
    
    if (!composeContent) {
      return res.status(400).json({
        error: 'No Docker Compose content provided'
      });
    }

    // Convert
    const result = await convertCompose(composeContent, options);
    
    res.json({
      success: true,
      hcl: result.hcl,
      nomadJob: result.nomadJob,
      warnings: result.warnings,
      errors: result.errors,
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
  });
});

// Info endpoint
app.get('/api/info', (req, res) => {
  const { INFO } = require('../lib/index');
  res.json(INFO);
});

// Serve main page
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, '../web/index.html');
  
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    // Fallback simple HTML if web directory doesn't exist
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Compose2HCL Web Interface</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
        .container { max-width: 1200px; margin: 0 auto; }
        textarea { width: 100%; height: 300px; font-family: monospace; }
        button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
        button:hover { background: #005a9e; }
        .result { margin-top: 20px; }
        .error { color: red; }
        .warning { color: orange; }
        .success { color: green; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐳 Compose2HCL Web Interface</h1>
        <p>Convert Docker Compose files to Nomad HCL</p>
        
        <h2>Docker Compose Input:</h2>
        <textarea id="compose-input" placeholder="Paste your docker-compose.yml content here..."></textarea>
        
        <br><br>
        <button onclick="convert()">Convert to Nomad HCL</button>
        
        <div id="result" class="result"></div>
        
        <h2>Nomad HCL Output:</h2>
        <textarea id="hcl-output" readonly></textarea>
    </div>
    
    <script>
        async function convert() {
            const input = document.getElementById('compose-input').value;
            const resultDiv = document.getElementById('result');
            const output = document.getElementById('hcl-output');
            
            if (!input.trim()) {
                resultDiv.innerHTML = '<p class="error">Please provide Docker Compose content</p>';
                return;
            }
            
            try {
                resultDiv.innerHTML = '<p>Converting...</p>';
                
                const response = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ composeContent: input })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    output.value = result.hcl;
                    
                    let messages = [];
                    if (result.warnings.length > 0) {
                        messages.push('<p class="warning">Warnings: ' + result.warnings.join(', ') + '</p>');
                    }
                    messages.push('<p class="success">✅ Conversion successful!</p>');
                    
                    resultDiv.innerHTML = messages.join('');
                } else {
                    resultDiv.innerHTML = '<p class="error">❌ ' + result.error + '</p>';
                    output.value = '';
                }
                
            } catch (error) {
                resultDiv.innerHTML = '<p class="error">❌ Conversion failed: ' + error.message + '</p>';
                output.value = '';
            }
        }
        
        // Load example on page load
        document.getElementById('compose-input').value = \`version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./html:/usr/share/nginx/html
    restart: unless-stopped
  
  api:
    image: node:16-alpine
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
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
  postgres_data:\`;
    </script>
</body>
</html>
    `);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🐳 Compose2HCL Web Server running on http://localhost:${PORT}`);
  console.log(`📖 API endpoints:`);
  console.log(`   POST /api/convert - Convert Docker Compose to Nomad HCL`);
  console.log(`   GET  /api/health  - Health check`);
  console.log(`   GET  /api/info    - Library information`);
});

module.exports = app;
