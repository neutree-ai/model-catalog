// Model Catalog UI Application
class ModelCatalogApp {
  constructor() {
    this.models = [];
    this.filteredModels = [];
    this.selectedModels = new Set();
    this.searchTerm = '';
    this.taskFilter = '';

    this.init();
  }

  init() {
    // Wait for DOM and data to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Check if data is available
    if (typeof window.modelCatalogData === 'undefined') {
      this.showError('Model data not available. Please run the build script.');
      return;
    }

    this.models = window.modelCatalogData;
    this.filteredModels = [...this.models];

    this.setupEventListeners();
    this.setupTaskFilter();
    this.setupTheme();
    this.renderModels();
    this.hideLoading();
  }

  setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.filterModels();
    });

    // Task filter
    const taskFilter = document.getElementById('task-filter');
    taskFilter.addEventListener('change', (e) => {
      this.taskFilter = e.target.value;
      this.filterModels();
    });

    // Select all/none buttons
    document.getElementById('select-all').addEventListener('click', () => this.selectAll());
    document.getElementById('select-none').addEventListener('click', () => this.selectNone());

    // Export all button
    document.getElementById('export-all').addEventListener('click', () => this.exportAll());

    // Generate YAML button
    document.getElementById('generate-yaml').addEventListener('click', () => this.generateYaml());

    // Modal controls
    document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
    document.getElementById('copy-yaml').addEventListener('click', () => this.copyYaml());
    document.getElementById('yaml-modal').addEventListener('click', (e) => {
      if (e.target.id === 'yaml-modal') this.closeModal();
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  setupTaskFilter() {
    const taskFilter = document.getElementById('task-filter');
    const tasks = [...new Set(this.models.map(model => model.task))].sort();

    tasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task;
      option.textContent = this.formatTaskName(task);
      taskFilter.appendChild(option);
    });
  }

  setupTheme() {
    // Check for saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    this.updateThemeIcon();
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    const isDark = document.documentElement.classList.contains('dark');

    themeToggle.innerHTML = isDark
      ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>'
      : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';
  }

  filterModels() {
    this.filteredModels = this.models.filter(model => {
      const matchesSearch = !this.searchTerm ||
        model.displayName.toLowerCase().includes(this.searchTerm) ||
        model.name.toLowerCase().includes(this.searchTerm) ||
        model.task.toLowerCase().includes(this.searchTerm);

      const matchesTask = !this.taskFilter || model.task === this.taskFilter;

      return matchesSearch && matchesTask;
    });

    this.renderModels();
  }

  renderModels() {
    const grid = document.getElementById('model-grid');
    const emptyState = document.getElementById('empty-state');

    if (this.filteredModels.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    grid.innerHTML = this.filteredModels.map(model => this.createModelCard(model)).join('');

    // Add event listeners for checkboxes
    this.filteredModels.forEach(model => {
      const checkbox = document.getElementById(`model-${model.id}`);
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedModels.add(model.id);
        } else {
          this.selectedModels.delete(model.id);
        }
        this.updateSelectedCount();
      });
    });
  }

  createModelCard(model) {
    const isSelected = this.selectedModels.has(model.id);

    return `
            <div class="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div class="flex h-32">
                    <div class="flex-1 min-w-0 p-2 flex flex-col">
                        <div class="flex items-center space-x-3 mb-2">
                            <div class="flex-shrink-0 pt-1">
                                <input 
                                    type="checkbox" 
                                    id="model-${model.id}" 
                                    ${isSelected ? 'checked' : ''}
                                    class="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring focus:ring-2"
                                >
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-sm font-medium text-card-foreground truncate">${this.escapeHtml(model.displayName)}</h3>
                            </div>
                        </div>
                        
                        <div class="flex-1 space-y-2 overflow-hidden">
                            <div class="flex items-center space-x-2 flex-wrap">
                                <span class="px-2 py-1 text-xs font-semibold rounded-lg ${this.getTaskTagStyle(model.task)}">
                                    ${this.formatTaskName(model.task)}
                                </span>
                                <span class="text-xs text-muted-foreground">${model.engine} ${model.version}</span>
                            </div>
                            
                            <p class="text-xs text-muted-foreground truncate">${this.escapeHtml(model.name)}</p>
                            
                            ${model.hfRepoUrl ? `
                                <a href="${model.hfRepoUrl}" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="inline-flex items-center text-xs text-primary hover:underline truncate">
                                    <img src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg" alt="logo" class="w-4 h-4 mr-2 flex-shrink-0" />
                                    <span class="truncate">Hugging Face</span>
                                </a>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${model.iconUrl ? `<div class="w-32 h-full flex-shrink-0">
                        <img src="${model.iconUrl}" alt="${model.displayName}" class="w-full h-full object-cover">
                    </div>` : `<div class="w-32 h-full flex-shrink-0 bg-muted/30 flex items-center justify-center">
                        <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>`}
                </div>
            </div>
        `;
  }

  selectAll() {
    this.selectedModels.clear();
    this.filteredModels.forEach(model => this.selectedModels.add(model.id));
    this.renderModels();
    this.updateSelectedCount();
  }

  selectNone() {
    this.selectedModels.clear();
    this.renderModels();
    this.updateSelectedCount();
  }

  async exportAll() {
    // Get the current page URL and construct the data.yaml URL
    const currentUrl = new URL(window.location.href);
    const yamlUrl = new URL('data.yaml', currentUrl).href;

    // Copy to clipboard
    await globalThis.navigator.clipboard.writeText(yamlUrl);

    // Show feedback
    const exportButton = document.getElementById('export-all');
    const originalContent = exportButton.innerHTML;

    exportButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>URL Copied!</span>
      `;
    exportButton.style.backgroundColor = '#16a34a';
    exportButton.style.color = 'white';

    setTimeout(() => {
      exportButton.innerHTML = originalContent;
      exportButton.style.backgroundColor = '';
      exportButton.style.color = '';
    }, 2000);

  }

  updateSelectedCount() {
    const countElement = document.getElementById('selected-count');
    const generateButton = document.getElementById('generate-yaml');

    countElement.textContent = this.selectedModels.size;
    generateButton.disabled = this.selectedModels.size === 0;
  }

  generateYaml() {
    if (this.selectedModels.size === 0) return;

    const selectedModelData = this.models.filter(model => this.selectedModels.has(model.id));
    const originalYamlData = selectedModelData.map(model => model.originalYaml);

    // Use js-yaml to dump the data directly
    let yaml;
    if (originalYamlData.length === 1) {
      yaml = jsyaml.dump(originalYamlData[0], { indent: 2, lineWidth: -1 });
    } else {
      yaml = originalYamlData.map(data => jsyaml.dump(data, { indent: 2, lineWidth: -1 })).join('---\n');
    }

    this.showYamlModal(yaml);
  }

  showYamlModal(yaml) {
    const modal = document.getElementById('yaml-modal');
    const output = document.getElementById('yaml-output');

    output.textContent = yaml;
    modal.classList.remove('hidden');

    // Focus the modal for keyboard navigation
    modal.focus();
  }

  closeModal() {
    const modal = document.getElementById('yaml-modal');
    modal.classList.add('hidden');
  }

  async copyYaml() {
    const output = document.getElementById('yaml-output');
    const copyButton = document.getElementById('copy-yaml');

    try {
      await globalThis.navigator.clipboard.writeText(output.textContent);

      // Show feedback
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      copyButton.style.backgroundColor = '#16a34a';
      copyButton.style.color = 'white';

      setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.style.backgroundColor = '';
        copyButton.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = output.textContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    }
  }

  getTaskTagStyle(task) {
    const taskColorMapping = {
      'text-generation': 'bg-green-100 text-green-800',
      'text-embedding': 'bg-blue-100 text-blue-800',
      'text-rerank': 'bg-purple-100 text-purple-800',
      'image-generation': 'bg-pink-100 text-pink-800',
      'image-classification': 'bg-yellow-100 text-yellow-800',
      'audio-classification': 'bg-orange-100 text-orange-800',
      'speech-recognition': 'bg-indigo-100 text-indigo-800',
    };

    return taskColorMapping[task] || 'bg-gray-100 text-gray-800';
  }

  formatTaskName(task) {
    return task.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.add('hidden');
  }

  showError(message) {
    const loading = document.getElementById('loading');
    loading.innerHTML = `
            <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
                    <svg class="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-medium mb-2 text-destructive">Error</h3>
                <p class="text-muted-foreground">${message}</p>
            </div>
        `;
  }
}

// Initialize the application
const app = new ModelCatalogApp();
