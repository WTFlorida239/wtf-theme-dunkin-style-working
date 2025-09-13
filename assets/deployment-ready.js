/**
 * WTF Deployment Ready Script
 * Final production checks and optimizations
 */

(function() {
  'use strict';

  const DeploymentChecker = {
    // Check all critical functionality
    runProductionChecks: function() {
      const checks = [
        this.checkVariantMapping,
        this.checkCartFunctionality,
        this.checkFormValidation,
        this.checkImageLoading,
        this.checkAnalyticsTracking,
        this.checkAccessibility,
        this.checkPerformance,
        this.checkMobileResponsiveness
      ];

      const results = checks.map(check => {
        try {
          return check.call(this);
        } catch (error) {
          return {
            name: check.name,
            status: 'error',
            message: error.message
          };
        }
      });

      this.reportResults(results);
      return results;
    },

    // Check variant mapping functionality
    checkVariantMapping: function() {
      const sizeSelectors = document.querySelectorAll('.size-selector');
      const variantInput = document.querySelector('input[name="id"]');
      
      if (sizeSelectors.length === 0) {
        return { name: 'Variant Mapping', status: 'warning', message: 'No size selectors found' };
      }
      
      if (!variantInput) {
        return { name: 'Variant Mapping', status: 'error', message: 'Variant input field missing' };
      }

      // Test variant mapping
      let mappingWorks = true;
      sizeSelectors.forEach(selector => {
        if (!selector.dataset.value || !selector.dataset.option) {
          mappingWorks = false;
        }
      });

      return {
        name: 'Variant Mapping',
        status: mappingWorks ? 'success' : 'error',
        message: mappingWorks ? 'Variant mapping configured correctly' : 'Variant mapping configuration issues'
      };
    },

    // Check cart functionality
    checkCartFunctionality: function() {
      const cartForm = document.querySelector('form[data-wtf-ajax]');
      const cartDrawer = document.querySelector('.wtf-cart-drawer');
      const cartCount = document.querySelector('[data-cart-count-target]');

      const issues = [];
      if (!cartForm) issues.push('AJAX cart form missing');
      if (!cartDrawer) issues.push('Cart drawer missing');
      if (!cartCount) issues.push('Cart count element missing');

      return {
        name: 'Cart Functionality',
        status: issues.length === 0 ? 'success' : 'error',
        message: issues.length === 0 ? 'Cart functionality complete' : issues.join(', ')
      };
    },

    // Check form validation
    checkFormValidation: function() {
      const forms = document.querySelectorAll('form[data-wtf-ajax]');
      let validationWorks = true;

      forms.forEach(form => {
        const requiredFields = form.querySelectorAll('[required]');
        const hiddenInputs = form.querySelectorAll('input[type="hidden"][name*="properties"]');
        
        if (requiredFields.length === 0 && hiddenInputs.length === 0) {
          validationWorks = false;
        }
      });

      return {
        name: 'Form Validation',
        status: validationWorks ? 'success' : 'warning',
        message: validationWorks ? 'Form validation configured' : 'Form validation may need attention'
      };
    },

    // Check image loading optimization
    checkImageLoading: function() {
      const images = document.querySelectorAll('img');
      let optimizedCount = 0;
      let totalCount = images.length;

      images.forEach(img => {
        if (img.loading === 'lazy' || img.loading === 'eager') {
          optimizedCount++;
        }
        if (img.decoding === 'async') {
          optimizedCount += 0.5;
        }
      });

      const optimizationRatio = optimizedCount / (totalCount * 1.5);

      return {
        name: 'Image Loading',
        status: optimizationRatio > 0.8 ? 'success' : 'warning',
        message: `${Math.round(optimizationRatio * 100)}% of images optimized`
      };
    },

    // Check analytics tracking
    checkAnalyticsTracking: function() {
      const analyticsPresent = {
        gtag: typeof gtag !== 'undefined',
        fbq: typeof fbq !== 'undefined',
        ttq: typeof ttq !== 'undefined',
        wtfAnalytics: typeof window.WTFAnalytics !== 'undefined'
      };

      const activeTrackers = Object.values(analyticsPresent).filter(Boolean).length;

      return {
        name: 'Analytics Tracking',
        status: activeTrackers >= 2 ? 'success' : 'warning',
        message: `${activeTrackers} analytics platforms active`
      };
    },

    // Check accessibility features
    checkAccessibility: function() {
      const accessibilityFeatures = {
        ariaLabels: document.querySelectorAll('[aria-label]').length,
        ariaDescribed: document.querySelectorAll('[aria-describedby]').length,
        focusVisible: document.querySelectorAll('[tabindex]').length,
        altTexts: document.querySelectorAll('img[alt]').length,
        headingStructure: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
      };

      const totalFeatures = Object.values(accessibilityFeatures).reduce((sum, count) => sum + count, 0);

      return {
        name: 'Accessibility',
        status: totalFeatures > 10 ? 'success' : 'warning',
        message: `${totalFeatures} accessibility features implemented`
      };
    },

    // Check performance metrics
    checkPerformance: function() {
      if (!('performance' in window)) {
        return { name: 'Performance', status: 'warning', message: 'Performance API not available' };
      }

      const navigation = performance.getEntriesByType('navigation')[0];
      if (!navigation) {
        return { name: 'Performance', status: 'warning', message: 'Navigation timing not available' };
      }

      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;

      return {
        name: 'Performance',
        status: loadTime < 3000 ? 'success' : 'warning',
        message: `Load time: ${Math.round(loadTime)}ms, DOM ready: ${Math.round(domContentLoaded)}ms`
      };
    },

    // Check mobile responsiveness
    checkMobileResponsiveness: function() {
      const viewport = document.querySelector('meta[name="viewport"]');
      const mobileCSS = document.querySelectorAll('style, link[rel="stylesheet"]');
      
      let hasMobileOptimization = false;
      mobileCSS.forEach(element => {
        if (element.textContent && element.textContent.includes('@media')) {
          hasMobileOptimization = true;
        }
      });

      return {
        name: 'Mobile Responsiveness',
        status: viewport && hasMobileOptimization ? 'success' : 'warning',
        message: viewport && hasMobileOptimization ? 'Mobile optimization present' : 'Mobile optimization may need attention'
      };
    },

    // Report check results
    reportResults: function(results) {
      const successCount = results.filter(r => r.status === 'success').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      console.group('🚀 WTF Deployment Readiness Check');
      console.log(`✅ Success: ${successCount}`);
      console.log(`⚠️ Warnings: ${warningCount}`);
      console.log(`❌ Errors: ${errorCount}`);
      console.log('');

      results.forEach(result => {
        const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${result.name}: ${result.message}`);
      });

      if (errorCount === 0 && warningCount <= 2) {
        console.log('');
        console.log('🎉 Site is ready for production deployment!');
      } else if (errorCount === 0) {
        console.log('');
        console.log('⚡ Site is mostly ready - address warnings for optimal performance');
      } else {
        console.log('');
        console.log('🔧 Please fix errors before deploying to production');
      }

      console.groupEnd();

      // Store results for external access
      window.WTF_DEPLOYMENT_CHECK = {
        timestamp: new Date().toISOString(),
        results: results,
        summary: { successCount, warningCount, errorCount },
        ready: errorCount === 0 && warningCount <= 2
      };
    },

    // Initialize production optimizations
    initProductionOptimizations: function() {
      // Optimize images on the fly
      this.optimizeImages();
      
      // Initialize service worker if available
      this.initServiceWorker();
      
      // Set up error reporting
      this.initErrorReporting();
      
      // Optimize third-party scripts
      this.optimizeThirdPartyScripts();
    },

    // Optimize images
    optimizeImages: function() {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        // Add loading optimization if missing
        if (!img.loading) {
          const rect = img.getBoundingClientRect();
          const isAboveFold = rect.top < window.innerHeight;
          img.loading = isAboveFold ? 'eager' : 'lazy';
        }
        
        // Add decoding optimization
        if (!img.decoding) {
          img.decoding = 'async';
        }
        
        // Add error handling
        img.addEventListener('error', function() {
          this.style.display = 'none';
          console.warn('Failed to load image:', this.src);
        });
      });
    },

    // Initialize service worker
    initServiceWorker: function() {
      if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registered:', registration);
          })
          .catch(error => {
            console.log('Service Worker registration failed:', error);
          });
      }
    },

    // Initialize error reporting
    initErrorReporting: function() {
      window.addEventListener('error', (event) => {
        // Report critical errors
        if (typeof gtag !== 'undefined') {
          gtag('event', 'exception', {
            description: event.message,
            fatal: false
          });
        }
      });

      window.addEventListener('unhandledrejection', (event) => {
        // Report unhandled promise rejections
        if (typeof gtag !== 'undefined') {
          gtag('event', 'exception', {
            description: 'Unhandled Promise Rejection: ' + event.reason,
            fatal: false
          });
        }
      });
    },

    // Optimize third-party scripts
    optimizeThirdPartyScripts: function() {
      // Delay non-critical third-party scripts
      const delayedScripts = document.querySelectorAll('script[data-delay]');
      
      let userInteracted = false;
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      function loadDelayedScripts() {
        if (userInteracted) return;
        userInteracted = true;
        
        events.forEach(event => {
          document.removeEventListener(event, loadDelayedScripts);
        });
        
        delayedScripts.forEach(script => {
          const newScript = document.createElement('script');
          if (script.src) newScript.src = script.src;
          else newScript.textContent = script.textContent;
          script.parentNode.replaceChild(newScript, script);
        });
      }
      
      events.forEach(event => {
        document.addEventListener(event, loadDelayedScripts, { passive: true });
      });
      
      // Fallback: load after 5 seconds
      setTimeout(loadDelayedScripts, 5000);
    }
  };

  // Initialize when DOM is ready
  function init() {
    // Run production checks
    DeploymentChecker.runProductionChecks();
    
    // Initialize optimizations
    DeploymentChecker.initProductionOptimizations();
    
    // Set up periodic health checks
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        DeploymentChecker.runProductionChecks();
      }
    }, 300000); // Every 5 minutes
  }

  // Start when page is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose deployment checker globally
  window.WTFDeployment = DeploymentChecker;

})();

