/**
 * GitHub Pages Repository File Browser - Modern ES6+ JavaScript
 * Handles file listing, internationalization, and user interactions
 */

class GitHubPagesBrowser {
    constructor(config) {
        this.config = {
            repo: config.repo || '',
            hostedUrl: config.hostedUrl || '',
            translations: config.translations || {},
            ...config
        };

        this.currentLanguage = this.detectLanguage();
        this.elements = this.getElements();

        this.init();
    }

    /**
     * Detect user's preferred language
     */
    detectLanguage() {
        try {
            const stored = localStorage.getItem('github_pages_lang');
            if (stored && this.config.translations[stored]) {
                return stored;
            }

            const browserLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
            return this.config.translations[browserLang] ? browserLang : 'en';
        } catch (error) {
            console.warn('Language detection failed:', error);
            return 'en';
        }
    }

    /**
     * Get DOM elements
     */
    getElements() {
        return {
            filesList: document.getElementById('files-list'),
            loadingState: document.getElementById('loading-state'),
            errorState: document.getElementById('error-state'),
            emptyState: document.getElementById('empty-state'),
            languageSelect: document.getElementById('language-select'),
            uploadAction: document.getElementById('action-upload'),
            refreshAction: document.getElementById('action-refresh'),
            settingsAction: document.getElementById('action-settings')
        };
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.setupLanguageSelector();
            this.setupActionHandlers();
            this.applyTranslations();
            await this.loadFiles();
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Failed to initialize application');
        }
    }

    /**
     * Setup language selector
     */
    setupLanguageSelector() {
        const { languageSelect } = this.elements;

        if (!languageSelect) return;

        languageSelect.value = this.currentLanguage;
        languageSelect.addEventListener('change', (event) => {
            this.changeLanguage(event.target.value);
        });
    }

    /**
     * Setup action button handlers
     */
    setupActionHandlers() {
        const { uploadAction, refreshAction, settingsAction } = this.elements;

        if (uploadAction) {
            uploadAction.addEventListener('click', () => this.handleUploadAction());
            uploadAction.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleUploadAction();
                }
            });
        }

        if (refreshAction) {
            refreshAction.addEventListener('click', () => this.handleRefreshAction());
            refreshAction.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleRefreshAction();
                }
            });
        }

        if (settingsAction) {
            settingsAction.addEventListener('click', () => this.handleSettingsAction());
            settingsAction.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleSettingsAction();
                }
            });
        }
    }

    /**
     * Change language
     */
    changeLanguage(language) {
        if (!this.config.translations[language]) return;

        this.currentLanguage = language;
        localStorage.setItem('github_pages_lang', language);
        this.applyTranslations();
    }

    /**
     * Apply translations to the page
     */
    applyTranslations() {
        const translations = this.config.translations[this.currentLanguage] ||
            this.config.translations['en'] || {};

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const vars = this.parseI18nVars(element.getAttribute('data-i18n-vars'));
            const translated = this.translate(key, vars, translations);

            if (translated) {
                element.textContent = translated;
            }
        });
    }

    /**
     * Parse i18n variables
     */
    parseI18nVars(varsString) {
        try {
            return varsString ? JSON.parse(varsString) : {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Translate a key with variable substitution
     */
    translate(key, vars = {}, translations = null) {
        const dict = translations || this.config.translations[this.currentLanguage] ||
            this.config.translations['en'] || {};

        let text = dict[key] || key;

        // Variable substitution
        Object.keys(vars).forEach(varKey => {
            text = text.replace(new RegExp(`{${varKey}}`, 'g'), vars[varKey]);
        });

        return text;
    }

    /**
     * Load files from GitHub API
     */
    async loadFiles() {
        if (!this.config.repo) {
            this.showError('No repository configured');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`https://api.github.com/repos/${this.config.repo}/contents`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const files = await response.json();
            this.renderFiles(files);
        } catch (error) {
            console.error('Failed to load files:', error);
            this.showError(`Failed to load repository contents: ${error.message}`);
        }
    }

    /**
     * Render files list
     */
    renderFiles(files) {
        const { filesList } = this.elements;

        if (!filesList) return;

        if (!files || files.length === 0) {
            this.showEmpty();
            return;
        }

        // Sort files: directories first, then by name
        const sortedFiles = files.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'dir' ? -1 : 1;
        });

        const listItems = sortedFiles.map(file => this.createFileItem(file));

        filesList.innerHTML = '';
        filesList.append(...listItems);

        this.hideAllStates();
    }

    /**
     * Create a file list item
     */
    createFileItem(file) {
        const listItem = document.createElement('li');
        listItem.className = 'file-item';

        const link = document.createElement('a');
        link.className = 'file-link';
        link.href = this.getFileUrl(file);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const icon = this.createFileIcon(file);
        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = file.name + (file.type === 'dir' ? '/' : '');

        link.appendChild(icon);
        link.appendChild(name);

        const meta = document.createElement('div');
        meta.className = 'file-meta';
        meta.textContent = this.getFileMeta(file);

        listItem.appendChild(link);
        listItem.appendChild(meta);

        return listItem;
    }

    /**
     * Create file icon based on type
     */
    createFileIcon(file) {
        const icon = document.createElement('div');
        icon.className = 'file-icon';

        if (file.type === 'dir') {
            icon.innerHTML = 'DIR';
            icon.setAttribute('aria-label', 'Directory');
        } else {
            const extension = file.name.split('.').pop()?.toLowerCase();
            icon.innerHTML = this.getFileIconByExtension(extension);
            icon.setAttribute('aria-label', 'File');
        }

        return icon;
    }

    /**
     * Get file icon by extension
     */
    getFileIconByExtension(extension) {
        const iconMap = {
            // Images
            'jpg': 'IMG', 'jpeg': 'IMG', 'png': 'IMG', 'gif': 'IMG', 'svg': 'IMG', 'webp': 'IMG',
            // Documents  
            'pdf': 'PDF', 'doc': 'DOC', 'docx': 'DOC', 'txt': 'TXT', 'md': 'MD', 'readme': 'MD',
            // Code
            'js': 'JS', 'ts': 'TS', 'jsx': 'JSX', 'tsx': 'TSX', 'html': 'HTM', 'css': 'CSS', 'scss': 'CSS',
            'py': 'PY', 'java': 'JAV', 'cpp': 'CPP', 'c': 'C', 'php': 'PHP', 'rb': 'RB',
            // Config
            'json': 'CFG', 'xml': 'CFG', 'yml': 'CFG', 'yaml': 'CFG', 'toml': 'CFG', 'ini': 'CFG',
            // Archives
            'zip': 'ZIP', 'tar': 'TAR', 'gz': 'GZ', 'rar': 'RAR', '7z': '7Z',
            // Default
            'default': 'FILE'
        };

        return iconMap[extension] || iconMap.default;
    }

    /**
     * Get file URL for GitHub Pages
     */
    getFileUrl(file) {
        if (file.type === 'dir') {
            return file.html_url;
        }

        try {
            const [owner, repoName] = this.config.repo.split('/');
            const isUserPage = repoName.toLowerCase() === `${owner.toLowerCase()}.github.io`;

            if (isUserPage) {
                return `https://${owner}.github.io/${encodeURIComponent(file.name)}`;
            } else {
                return `https://${owner}.github.io/${encodeURIComponent(repoName)}/${encodeURIComponent(file.name)}`;
            }
        } catch (error) {
            console.warn('Failed to generate Pages URL, falling back to GitHub URL:', error);
            return file.html_url;
        }
    }

    /**
     * Get file metadata string
     */
    getFileMeta(file) {
        if (file.type === 'dir') {
            return 'Directory';
        }

        if (file.size) {
            return this.formatFileSize(file.size);
        }

        return 'File';
    }

    /**
     * Format file size in human readable format
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Action handlers
     */
    handleUploadAction() {
        if (this.config.hostedUrl) {
            window.open(this.config.hostedUrl, '_blank');
        }
    }

    handleRefreshAction() {
        this.loadFiles();
    }

    handleSettingsAction() {
        if (!this.config.repo) return;

        try {
            const [owner, repoName] = this.config.repo.split('/');
            const settingsUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/settings/pages`;
            window.open(settingsUrl, '_blank');
        } catch (error) {
            console.error('Failed to open settings:', error);
        }
    }

    /**
     * State management
     */
    showLoading() {
        this.hideAllStates();
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = 'block';
        }
    }

    showError(message) {
        this.hideAllStates();
        if (this.elements.errorState) {
            this.elements.errorState.style.display = 'block';
            this.elements.errorState.textContent = message;
        }
    }

    showEmpty() {
        this.hideAllStates();
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'block';
        }
    }

    hideAllStates() {
        ['loadingState', 'errorState', 'emptyState'].forEach(state => {
            if (this.elements[state]) {
                this.elements[state].style.display = 'none';
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme system
    initializeTheme();

    // Configuration will be injected by the server
    const config = window.GITHUB_PAGES_CONFIG || {};

    if (config.repo) {
        new GitHubPagesBrowser(config);
    } else {
        console.error('GitHub Pages Browser: No repository configuration found');
    }
});

// Theme management functions
function setTheme(theme, isManual = false) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('girly-theme', theme);

    if (isManual) {
        // Mark that user has manually chosen a theme
        localStorage.setItem('girly-theme-manual', 'true');
    } else {
        // This is following system preference
        localStorage.removeItem('girly-theme-manual');
    }

    // Add cute animation when changing themes
    document.body.style.transition = 'all 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme, true); // Mark as manual choice
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            themeToggle.style.transform = '';
        }, 300);
    }
}

function initializeTheme() {
    // Check if user has manually set a theme preference
    const manualTheme = localStorage.getItem('girly-theme-manual');
    const savedTheme = localStorage.getItem('girly-theme');

    if (manualTheme) {
        // User has manually chosen a theme, use that
        setTheme(savedTheme || 'light', true);
    } else {
        // Follow system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemPrefersDark ? 'dark' : 'light', false);
    }

    // Set up theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Always listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only follow system changes if user hasn't manually set a preference
        if (!localStorage.getItem('girly-theme-manual')) {
            setTheme(e.matches ? 'dark' : 'light', false);
        }
    });
}

// Export for potential use in other scripts
window.GitHubPagesBrowser = GitHubPagesBrowser;
window.themeUtils = { setTheme, toggleTheme };