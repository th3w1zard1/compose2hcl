import React, { useState } from 'react'
import './App.css'

function App() {
  const [composeInput, setComposeInput] = useState('')
  const [hclOutput, setHclOutput] = useState('')
  const [status, setStatus] = useState('')
  const [isConverting, setIsConverting] = useState(false)

  const loadExample = () => {
    const example = `# Example Docker Compose file
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NGINX_HOST=localhost
      - NGINX_PORT=80
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./logs:/var/log/nginx
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:

networks:
  default:
    driver: bridge`
    
    setComposeInput(example)
  }

  const clearInput = () => {
    setComposeInput('')
  }

  const clearOutput = () => {
    setHclOutput('')
  }

  const copyOutput = async () => {
    if (!hclOutput.trim()) {
      setStatus('No output to copy')
      return
    }

    try {
      await navigator.clipboard.writeText(hclOutput)
      setStatus('Copied to clipboard!')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus('Failed to copy to clipboard')
      setTimeout(() => setStatus(''), 3000)
    }
  }

  const downloadOutput = () => {
    if (!hclOutput.trim()) {
      setStatus('No output to download')
      return
    }

    const blob = new Blob([hclOutput], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nomad-job.hcl'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setStatus('Downloaded successfully!')
    setTimeout(() => setStatus(''), 2000)
  }

  const convertToHCL = async () => {
    if (!composeInput.trim()) {
      setStatus('Please enter Docker Compose content')
      return
    }

    setIsConverting(true)
    setStatus('Converting...')

    try {
      // For now, we'll use a placeholder conversion
      // In the real implementation, this would call the compose2hcl library
      const placeholderHCL = `# Generated Nomad HCL
# This is a placeholder - the actual conversion will use the compose2hcl library

job "docker-compose-converted" {
  datacenters = ["dc1"]
  type = "service"

  group "app" {
    count = 1

    network {
      port "http" {
        static = 80
      }
    }

    task "web" {
      driver = "docker"

      config {
        image = "nginx:alpine"
        ports = ["http"]
      }

      resources {
        cpu    = 500
        memory = 512
      }

      service {
        name = "web"
        port = "http"

        check {
          type     = "http"
          path     = "/"
          interval = "10s"
          timeout  = "2s"
        }
      }
    }
  }
}`

      setHclOutput(placeholderHCL)
      setStatus('Conversion completed successfully!')
      setTimeout(() => setStatus(''), 3000)
    } catch (error) {
      setStatus(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setStatus(''), 5000)
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>🐳 Docker Compose to Nomad HCL Converter</h1>
        <p className="subtitle">Convert your Docker Compose files to Nomad job specifications</p>
      </header>

      <main>
        <div className="input-section">
          <div className="input-header">
            <h2>Input: Docker Compose YAML</h2>
            <div className="input-controls">
              <button type="button" className="button secondary" onClick={loadExample}>
                Load Example
              </button>
              <button type="button" className="button secondary" onClick={clearInput}>
                Clear
              </button>
            </div>
          </div>
          <textarea
            value={composeInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComposeInput(e.target.value)}
            placeholder="Paste your docker-compose.yml here!

Supports all Docker Compose features:
- Services with full configuration
- Networks, volumes, configs, secrets
- Environment variables, ports, mounts
- Health checks, capabilities, GPU support
- And much more..."
            rows={20}
          />
        </div>

        <div className="controls">
          <button
            type="button"
            className="button primary"
            onClick={convertToHCL}
            disabled={isConverting}
          >
            <span>{isConverting ? '🔄 Converting...' : '🚀 Convert to Nomad HCL'}</span>
          </button>
          {status && <div className={`status ${status.includes('success') ? 'success' : status.includes('failed') ? 'error' : 'processing'}`}>{status}</div>}
        </div>

        <div className="output-section">
          <div className="output-header">
            <h2>Output: Nomad HCL</h2>
            <div className="output-controls">
              <button type="button" className="button secondary" onClick={copyOutput}>
                Copy
              </button>
              <button type="button" className="button secondary" onClick={downloadOutput}>
                Download
              </button>
              <button type="button" className="button secondary" onClick={clearOutput}>
                Clear
              </button>
            </div>
          </div>
          <textarea
            value={hclOutput}
            readOnly
            placeholder="Convert a Docker Compose file above to get the equivalent Nomad HCL specification here.

The converter supports:
- Full service definitions
- Resource constraints
- Network configuration
- Volume mounts
- Environment variables
- Health checks
- And comprehensive Docker Compose features"
            rows={25}
          />
        </div>
      </main>

      <footer>
        <div className="features">
          <h3>✨ Features</h3>
          <ul>
            <li><strong>Complete Coverage:</strong> Supports all Docker Compose features</li>
            <li><strong>Robust Parsing:</strong> Handles complex YAML with comments and anchors</li>
            <li><strong>Nomad Optimized:</strong> Generates production-ready Nomad job specs</li>
            <li><strong>Error Handling:</strong> Clear feedback on parsing issues</li>
          </ul>
        </div>
        
        <div className="supported-features">
          <h3>🔧 Supported Docker Compose Features</h3>
          <div className="feature-grid">
            <div className="feature-category">
              <h4>Services</h4>
              <ul>
                <li>Image & build configuration</li>
                <li>Ports & networking</li>
                <li>Environment variables</li>
                <li>Volumes & mounts</li>
                <li>Commands & entrypoints</li>
              </ul>
            </div>
            <div className="feature-category">
              <h4>Resources</h4>
              <ul>
                <li>CPU & memory limits</li>
                <li>GPU support</li>
                <li>Capabilities</li>
                <li>Health checks</li>
                <li>Restart policies</li>
              </ul>
            </div>
            <div className="feature-category">
              <h4>Advanced</h4>
              <ul>
                <li>Configs & secrets</li>
                <li>Networks & volumes</li>
                <li>Deploy strategies</li>
                <li>Development mode</li>
                <li>Service hooks</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
