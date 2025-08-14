# Compose2HCL

A complete Docker Compose to Nomad HCL converter with full spec compliance, featuring both a Node.js library and a modern web interface.

## 🌐 Web Interface

The web interface is available at: **https://bolabaden.github.io/compose2hcl**

Built with **Vite + React** for a fast, modern user experience.

### Features

- **Complete Coverage**: Supports all Docker Compose features
- **Robust Parsing**: Handles complex YAML with comments and anchors
- **Nomad Optimized**: Generates production-ready Nomad job specs
- **Error Handling**: Clear feedback on parsing issues
- **Modern UI**: Beautiful, responsive interface with real-time conversion

### Supported Docker Compose Features

#### Services
- Image & build configuration
- Ports & networking
- Environment variables
- Volumes & mounts
- Commands & entrypoints

#### Resources
- CPU & memory limits
- GPU support
- Capabilities
- Health checks
- Restart policies

#### Advanced
- Configs & secrets
- Networks & volumes
- Deploy strategies
- Development mode
- Service hooks

## 🚀 Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Navigate to the compose2hcl directory
cd src/compose2hcl

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
src/compose2hcl/
├── src/
│   ├── App.tsx          # Main React component
│   ├── main.tsx         # React entry point
│   ├── App.css          # App-specific styles
│   └── index.css        # Global styles
├── index.html           # Main HTML file
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
└── README.md            # This file
```

## 🏗️ Build & Deployment

The project uses **Vite** for fast development and optimized builds:

- **Development**: Hot Module Replacement (HMR) with instant feedback
- **Build**: Optimized production bundle with tree-shaking
- **Deployment**: Automatic deployment to GitHub Pages via GitHub Actions

### Build Output

The build process generates:
- Optimized JavaScript bundles
- Minified CSS
- Static assets
- Source maps for debugging

### GitHub Pages Deployment

The web interface automatically deploys to `https://bolabaden.github.io/compose2hcl` when changes are pushed to the main branch.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Format code
npm run format
```

## 📦 Library Usage

The compose2hcl package can also be used as a Node.js library:

```javascript
import { convertCompose, validateComposeFile } from 'compose2hcl';

// Validate a Docker Compose file
const validation = validateComposeFile(composeContent);
if (validation.isValid) {
  // Convert to Nomad HCL
  const result = convertCompose(composeContent);
  console.log(result.hcl);
}
```

## 🔧 Configuration

### Vite Configuration

The `vite.config.ts` file is configured for:
- React support via `@vitejs/plugin-react`
- Base path `/compose2hcl/` for GitHub Pages
- Source maps for debugging
- Path aliases for clean imports

### TypeScript Configuration

Optimized for modern React development with:
- ES2020 target
- React JSX support
- Strict type checking
- Module bundler resolution

## 🌟 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the BSL-1.1 License - see the LICENSE file for details.

## 🔗 Links

- **Web Interface**: https://bolabaden.github.io/compose2hcl
- **GitHub Repository**: [Repository URL]
- **Documentation**: [Documentation URL]
- **Issues**: [Issues URL]

## 🆘 Support

If you encounter any issues or have questions:
1. Check the [Issues]([Issues URL]) page
2. Create a new issue with detailed information
3. Include your Docker Compose file and any error messages

---

Built with ❤️ using Vite, React, and TypeScript
