# Neutree Model Catalog UI

A static web interface for browsing and managing Neutree model catalog. Built with vanilla HTML, CSS, and JavaScript for fast performance and easy deployment.

## ✨ Features

- 📊 **Model Gallery**: Browse all available models with rich metadata
- 🔍 **Search & Filter**: Find models by name, task type, or other criteria
- ✅ **Multi-Selection**: Select individual models or use bulk selection
- 📋 **YAML Generation**: Generate complete YAML configurations for selected models
- 🚀 **Auto Deployment**: Automatically deploys to GitHub Pages on push

## 🚀 Deployment

### GitHub Pages (Automated)

This project includes GitHub Actions workflow for automatic deployment to GitHub Pages:

1. **Enable GitHub Pages** in your repository settings:

   - Go to Settings → Pages
   - Set Source to "GitHub Actions"

2. **Push to main branch** - the workflow will automatically:

   - Build the project using Deno and npm
   - Deploy to GitHub Pages
   - Your site will be available at `https://<username>.github.io/<repository-name>`

3. **Manual deployment** (if needed):
   - Go to Actions tab
   - Run "Deploy to GitHub Pages" workflow manually

### Local Development

```bash
# Install dependencies
npm install

# Start development server (with file watching)
npm run dev

# Build for production
npm run build
```

## 🎯 How to Use

### Browsing Models

- View all available models in the grid layout
- Use the search box to find specific models
- Filter by task type using the dropdown menu
- Switch between light and dark themes

### Selecting Models

- Click checkboxes to select individual models
- Use "Select All" or "Select None" for bulk operations
- Selected count is displayed in the header

### Generating Configuration

1. Select the models you want to deploy
2. Click "Generate YAML" button
3. Copy the generated configuration from the modal
4. Use the configuration in your deployment

## 🔧 Adding New Models

### Using hf2catalog Tool

Convert HuggingFace models to catalog format using the built-in tool:

```bash
# Convert a HuggingFace model to YAML format
deno run --allow-net scripts/hf2catalog.ts https://huggingface.co/microsoft/DialoGPT-medium

# Convert to JSON format
deno run --allow-net scripts/hf2catalog.ts https://huggingface.co/microsoft/DialoGPT-medium --json
```

**Example:**

```bash
# Add Qwen model to catalog
deno run --allow-net scripts/hf2catalog.ts https://huggingface.co/Qwen/Qwen2.5-7B-Instruct > catalog/qwen2-5-7b-instruct.yaml

# Rebuild to include the new model
npm run build
```

The tool automatically extracts model metadata and generates the appropriate configuration format for the catalog.
