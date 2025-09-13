/**
 * WTF Performance Enhancements
 * Optimizations for faster loading and better user experience
 */

(function() {
  'use strict';

  // Preload critical resources
  function preloadCriticalResources() {
    // Preload fonts
    const fontPreloads = [
      { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', as: 'style' }
    ];

    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font.href;
      link.as = font.as;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Preconnect to external domains
    const preconnects = [
      'https://cdn.shopify.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    preconnects.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // Lazy load images with intersection observer
  function initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
              img.removeAttribute('data-srcset');
            }
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // Optimize third-party scripts
  function optimizeThirdPartyScripts() {
    // Delay non-critical scripts until user interaction
    let userInteracted = false;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    function triggerDelayedScripts() {
      if (userInteracted) return;
      userInteracted = true;
      
      // Remove event listeners
      events.forEach(event => {
        document.removeEventListener(event, triggerDelayedScripts, { passive: true });
      });

      // Load delayed scripts
      const delayedScripts = document.querySelectorAll('script[data-delay]');
      delayedScripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        script.parentNode.replaceChild(newScript, script);
      });
    }

    // Add event listeners for user interaction
    events.forEach(event => {
      document.addEventListener(event, triggerDelayedScripts, { passive: true });
    });

    // Fallback: load after 5 seconds
    setTimeout(triggerDelayedScripts, 5000);
  }

  // Optimize cart operations
  function optimizeCartOperations() {
    // Debounce cart updates
    let cartUpdateTimeout;
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options) {
      if (url.includes('/cart/') && options && options.method === 'POST') {
        clearTimeout(cartUpdateTimeout);
        return new Promise((resolve, reject) => {
          cartUpdateTimeout = setTimeout(() => {
            originalFetch.apply(this, arguments).then(resolve).catch(reject);
          }, 300);
        });
      }
      return originalFetch.apply(this, arguments);
    };
  }

  // Optimize animations for performance
  function optimizeAnimations() {
    // Reduce animations on low-end devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
    }

    // Pause animations when tab is not visible
    document.addEventListener('visibilitychange', () => {
      const animatedElements = document.querySelectorAll('[style*="animation"], [class*="animate"]');
      animatedElements.forEach(el => {
        if (document.hidden) {
          el.style.animationPlayState = 'paused';
        } else {
          el.style.animationPlayState = 'running';
        }
      });
    });
  }

  // Memory management
  function optimizeMemoryUsage() {
    // Clean up event listeners on page unload
    window.addEventListener('beforeunload', () => {
      // Remove all custom event listeners
      document.querySelectorAll('[data-event-cleanup]').forEach(el => {
        const events = el.dataset.eventCleanup.split(',');
        events.forEach(event => {
          el.removeEventListener(event.trim(), null);
        });
      });
    });

    // Limit DOM nodes for large lists
    const maxNodes = 1000;
    document.querySelectorAll('[data-virtual-scroll]').forEach(container => {
      const items = container.children;
      if (items.length > maxNodes) {
        // Implement virtual scrolling for large lists
        console.warn(`Large list detected (${items.length} items). Consider implementing virtual scrolling.`);
      }
    });
  }

  // Network optimization
  function optimizeNetworkRequests() {
    // Batch API requests
    const requestQueue = [];
    let batchTimeout;

    function batchRequests(url, options) {
      return new Promise((resolve, reject) => {
        requestQueue.push({ url, options, resolve, reject });
        
        clearTimeout(batchTimeout);
        batchTimeout = setTimeout(() => {
          if (requestQueue.length === 1) {
            // Single request, execute immediately
            const { url, options, resolve, reject } = requestQueue.shift();
            fetch(url, options).then(resolve).catch(reject);
          } else {
            // Multiple requests, could be batched if API supports it
            requestQueue.forEach(({ url, options, resolve, reject }) => {
              fetch(url, options).then(resolve).catch(reject);
            });
            requestQueue.length = 0;
          }
        }, 50);
      });
    }

    // Override fetch for cart operations
    const originalCartFetch = window.fetch;
    window.fetch = function(url, options) {
      if (url.includes('/cart.js') || url.includes('/cart/add.js')) {
        return batchRequests(url, options);
      }
      return originalCartFetch.apply(this, arguments);
    };
  }

  // Performance monitoring
  function initPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      // Monitor Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitor First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Monitor Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  // Service Worker registration for caching
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }

  // Initialize all optimizations
  function init() {
    // Run immediately
    preloadCriticalResources();
    optimizeThirdPartyScripts();
    optimizeCartOperations();
    optimizeAnimations();
    optimizeMemoryUsage();
    optimizeNetworkRequests();

    // Run after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initLazyLoading();
        initPerformanceMonitoring();
      });
    } else {
      initLazyLoading();
      initPerformanceMonitoring();
    }

    // Run after page load
    window.addEventListener('load', () => {
      registerServiceWorker();
    });
  }

  // Start optimizations
  init();

  // Expose performance utilities globally
  window.WTFPerformance = {
    preloadResource: (href, as = 'script') => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      document.head.appendChild(link);
    },
    
    measurePerformance: (name, fn) => {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      console.log(`${name} took ${end - start} milliseconds`);
      return result;
    },
    
    debounce: (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  };

})();

