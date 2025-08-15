/**
 * Dental SDK - JavaScript library for embedding dental exam viewer
 * Version: 1.0.0
 */

class DentalSDK {
  constructor() {
    this.config = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the SDK with configuration
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - API key for authentication
   * @param {string} config.baseUrl - Base URL of the dental app
   */
  init(config) {
    if (!config.apiKey || !config.baseUrl) {
      throw new Error('apiKey and baseUrl are required');
    }
    
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    };
    this.isInitialized = true;
    
    console.log('Dental SDK initialized successfully');
  }

  /**
   * Upload an exam file
   * @param {File} file - The image file to upload
   * @param {Object} metadata - Additional metadata for the exam
   * @returns {Promise<Object>} Upload result with exam ID
   */
  async uploadExam(file, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized. Call init() first.');
    }

    if (!file || !(file instanceof File)) {
      throw new Error('Valid file is required');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    try {
      const response = await fetch(`${this.config.baseUrl}/functions/v1/upload-exam-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Open the dental exam viewer
   * @param {string} examId - The ID of the exam to view
   * @param {Object} options - Viewer options
   * @param {string} options.containerId - ID of the container element (for iframe mode)
   * @param {number} options.width - Viewer width
   * @param {number} options.height - Viewer height
   * @param {string} options.mode - 'iframe' or 'component' (default: 'iframe')
   */
  openViewer(examId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized. Call init() first.');
    }

    if (!examId) {
      throw new Error('examId is required');
    }

    const defaultOptions = {
      width: 1200,
      height: 800,
      mode: 'iframe',
      containerId: 'dental-viewer-container'
    };

    const config = { ...defaultOptions, ...options };

    if (config.mode === 'iframe') {
      this._openIframeViewer(examId, config);
    } else if (config.mode === 'component') {
      this._openWebComponent(examId, config);
    } else {
      throw new Error('Invalid mode. Use "iframe" or "component"');
    }
  }

  /**
   * Open viewer in iframe mode
   * @private
   */
  _openIframeViewer(examId, config) {
    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container element with ID "${config.containerId}" not found`);
    }

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${this.config.baseUrl}/embed/viewer/${examId}?apiKey=${encodeURIComponent(this.config.apiKey)}`;
    iframe.width = config.width;
    iframe.height = config.height;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    iframe.allow = 'fullscreen';
    iframe.loading = 'lazy';

    // Clear container and add iframe
    container.innerHTML = '';
    container.appendChild(iframe);

    // Add message listener for iframe communication
    window.addEventListener('message', (event) => {
      if (event.origin !== new URL(this.config.baseUrl).origin) {
        return;
      }

      if (event.data.type === 'dental-viewer-ready') {
        console.log('Dental viewer is ready');
      } else if (event.data.type === 'dental-viewer-error') {
        console.error('Dental viewer error:', event.data.error);
      }
    });
  }

  /**
   * Open viewer as Web Component
   * @private
   */
  _openWebComponent(examId, config) {
    // Define the custom element if not already defined
    if (!customElements.get('dental-viewer')) {
      class DentalViewer extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
          const examId = this.getAttribute('exam-id');
          const apiKey = this.getAttribute('api-key');
          const baseUrl = this.getAttribute('base-url');
          const width = this.getAttribute('width') || '1200';
          const height = this.getAttribute('height') || '800';

          this.shadowRoot.innerHTML = `
            <style>
              :host {
                display: block;
                width: ${width}px;
                height: ${height}px;
              }
              iframe {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              }
            </style>
            <iframe 
              src="${baseUrl}/embed/viewer/${examId}?apiKey=${encodeURIComponent(apiKey)}"
              loading="lazy"
              allow="fullscreen">
            </iframe>
          `;
        }
      }

      customElements.define('dental-viewer', DentalViewer);
    }

    // Create and configure the custom element
    const viewer = document.createElement('dental-viewer');
    viewer.setAttribute('exam-id', examId);
    viewer.setAttribute('api-key', this.config.apiKey);
    viewer.setAttribute('base-url', this.config.baseUrl);
    viewer.setAttribute('width', config.width);
    viewer.setAttribute('height', config.height);

    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container element with ID "${config.containerId}" not found`);
    }

    container.innerHTML = '';
    container.appendChild(viewer);
  }

  /**
   * Close the viewer
   * @param {string} containerId - ID of the container element
   */
  closeViewer(containerId = 'dental-viewer-container') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Get SDK version
   * @returns {string} SDK version
   */
  getVersion() {
    return '1.0.0';
  }
}

// Create global instance
window.DentalSDK = new DentalSDK();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DentalSDK;
}