/**
 * WTF Advanced Analytics Enhancements
 * Enhanced tracking for better conversion insights and performance monitoring
 */

(function() {
  'use strict';

  // Enhanced ecommerce tracking
  const AnalyticsEnhancer = {
    // Track product builder interactions
    trackBuilderInteraction: function(action, data) {
      // Google Analytics 4
      if (typeof gtag !== 'undefined') {
        gtag('event', action, {
          event_category: 'Product Builder',
          event_label: data.product || 'Unknown Product',
          custom_parameters: {
            strain: data.strain || '',
            size: data.size || '',
            flavors: data.flavors || '',
            mix: data.mix || 'No'
          }
        });
      }

      // Meta Pixel
      if (typeof fbq !== 'undefined') {
        fbq('trackCustom', action, {
          content_name: data.product || 'Product Builder',
          content_category: 'Beverages',
          strain: data.strain || '',
          size: data.size || '',
          flavors: data.flavors || ''
        });
      }

      // TikTok Pixel
      if (typeof ttq !== 'undefined') {
        ttq.track(action, {
          content_name: data.product || 'Product Builder',
          content_category: 'Beverages',
          content_type: 'product'
        });
      }
    },

    // Track cart events with enhanced data
    trackCartEvent: function(action, items) {
      const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Google Analytics 4 Enhanced Ecommerce
      if (typeof gtag !== 'undefined') {
        gtag('event', action, {
          currency: 'USD',
          value: totalValue / 100, // Convert cents to dollars
          items: items.map(item => ({
            item_id: item.variant_id,
            item_name: item.title,
            category: 'Beverages',
            quantity: item.quantity,
            price: item.price / 100,
            item_variant: item.size || '',
            custom_parameters: {
              strain: item.strain || '',
              flavors: item.flavors || '',
              mix: item.mix || 'No'
            }
          }))
        });
      }

      // Meta Pixel Enhanced Events
      if (typeof fbq !== 'undefined') {
        fbq('track', action === 'add_to_cart' ? 'AddToCart' : 'Purchase', {
          value: totalValue / 100,
          currency: 'USD',
          content_type: 'product',
          contents: items.map(item => ({
            id: item.variant_id,
            quantity: item.quantity,
            item_price: item.price / 100
          }))
        });
      }

      // Snapchat Pixel
      if (typeof snaptr !== 'undefined') {
        snaptr('track', action === 'add_to_cart' ? 'ADD_CART' : 'PURCHASE', {
          price: totalValue / 100,
          currency: 'USD',
          item_category: 'Beverages'
        });
      }
    },

    // Track user journey and funnel steps
    trackFunnelStep: function(step, data = {}) {
      const funnelSteps = {
        'page_view': 1,
        'product_view': 2,
        'size_selected': 3,
        'strain_selected': 4,
        'flavors_selected': 5,
        'add_to_cart': 6,
        'checkout_started': 7,
        'purchase': 8
      };

      const stepNumber = funnelSteps[step] || 0;

      // Google Analytics 4
      if (typeof gtag !== 'undefined') {
        gtag('event', 'funnel_step', {
          funnel_name: 'Product Customization',
          step_number: stepNumber,
          step_name: step,
          ...data
        });
      }

      // Custom analytics for internal tracking
      this.sendCustomEvent('funnel_progression', {
        step: step,
        step_number: stepNumber,
        timestamp: Date.now(),
        ...data
      });
    },

    // Track user preferences for personalization
    trackUserPreferences: function() {
      const preferences = {
        popular_strains: this.getPopularSelections('strain'),
        popular_flavors: this.getPopularSelections('flavor'),
        popular_sizes: this.getPopularSelections('size'),
        session_duration: this.getSessionDuration(),
        pages_visited: this.getPagesVisited()
      };

      // Store in localStorage for future sessions
      localStorage.setItem('wtf_user_preferences', JSON.stringify(preferences));

      // Send to analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'user_preferences_updated', {
          event_category: 'User Behavior',
          custom_parameters: preferences
        });
      }
    },

    // A/B testing support
    initABTesting: function() {
      // Simple A/B test framework
      const tests = {
        'flavor_layout': ['grid', 'list'],
        'size_display': ['cards', 'buttons'],
        'strain_order': ['alphabetical', 'popularity']
      };

      Object.keys(tests).forEach(testName => {
        if (!localStorage.getItem(`ab_test_${testName}`)) {
          const variants = tests[testName];
          const selectedVariant = variants[Math.floor(Math.random() * variants.length)];
          localStorage.setItem(`ab_test_${testName}`, selectedVariant);
          
          // Track test assignment
          if (typeof gtag !== 'undefined') {
            gtag('event', 'ab_test_assigned', {
              test_name: testName,
              variant: selectedVariant
            });
          }
        }
      });
    },

    // Performance monitoring
    trackPerformance: function() {
      if ('PerformanceObserver' in window) {
        // Core Web Vitals tracking
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (typeof gtag !== 'undefined') {
              gtag('event', 'web_vitals', {
                event_category: 'Performance',
                metric_name: entry.entryType,
                metric_value: Math.round(entry.startTime),
                metric_id: entry.name
              });
            }
          });
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      }

      // Page load time
      window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        if (typeof gtag !== 'undefined') {
          gtag('event', 'page_load_time', {
            event_category: 'Performance',
            value: loadTime
          });
        }
      });
    },

    // Error tracking
    trackErrors: function() {
      window.addEventListener('error', (event) => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'javascript_error', {
            event_category: 'Error',
            event_label: event.message,
            value: 1
          });
        }
      });

      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'promise_rejection', {
            event_category: 'Error',
            event_label: event.reason.toString(),
            value: 1
          });
        }
      });
    },

    // Custom event sender
    sendCustomEvent: function(eventName, data) {
      // Send to custom analytics endpoint if available
      if (window.WTF_ANALYTICS_ENDPOINT) {
        fetch(window.WTF_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event: eventName,
            data: data,
            timestamp: Date.now(),
            session_id: this.getSessionId(),
            user_agent: navigator.userAgent,
            url: window.location.href
          })
        }).catch(err => console.warn('Analytics endpoint error:', err));
      }
    },

    // Helper functions
    getPopularSelections: function(type) {
      const key = `wtf_selections_${type}`;
      const selections = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.keys(selections)
        .sort((a, b) => selections[b] - selections[a])
        .slice(0, 3);
    },

    getSessionDuration: function() {
      const sessionStart = sessionStorage.getItem('wtf_session_start');
      if (!sessionStart) {
        sessionStorage.setItem('wtf_session_start', Date.now().toString());
        return 0;
      }
      return Date.now() - parseInt(sessionStart);
    },

    getPagesVisited: function() {
      const pages = JSON.parse(sessionStorage.getItem('wtf_pages_visited') || '[]');
      if (!pages.includes(window.location.pathname)) {
        pages.push(window.location.pathname);
        sessionStorage.setItem('wtf_pages_visited', JSON.stringify(pages));
      }
      return pages.length;
    },

    getSessionId: function() {
      let sessionId = sessionStorage.getItem('wtf_session_id');
      if (!sessionId) {
        sessionId = 'wtf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('wtf_session_id', sessionId);
      }
      return sessionId;
    },

    // Record user selections for analytics
    recordSelection: function(type, value) {
      const key = `wtf_selections_${type}`;
      const selections = JSON.parse(localStorage.getItem(key) || '{}');
      selections[value] = (selections[value] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(selections));
    }
  };

  // Initialize analytics enhancements
  function init() {
    // Initialize A/B testing
    AnalyticsEnhancer.initABTesting();
    
    // Start performance monitoring
    AnalyticsEnhancer.trackPerformance();
    
    // Start error tracking
    AnalyticsEnhancer.trackErrors();
    
    // Track initial page view
    AnalyticsEnhancer.trackFunnelStep('page_view', {
      page_type: document.body.dataset.template || 'unknown',
      page_url: window.location.pathname
    });

    // Set up event listeners for product builder
    document.addEventListener('click', function(e) {
      // Track size selections
      if (e.target.matches('.size-selector')) {
        const size = e.target.dataset.value;
        AnalyticsEnhancer.recordSelection('size', size);
        AnalyticsEnhancer.trackBuilderInteraction('size_selected', { size: size });
        AnalyticsEnhancer.trackFunnelStep('size_selected', { size: size });
      }
      
      // Track strain selections
      if (e.target.matches('.strain-selector')) {
        const strain = e.target.dataset.value;
        AnalyticsEnhancer.recordSelection('strain', strain);
        AnalyticsEnhancer.trackBuilderInteraction('strain_selected', { strain: strain });
        AnalyticsEnhancer.trackFunnelStep('strain_selected', { strain: strain });
      }
      
      // Track flavor selections
      if (e.target.matches('.wtf-flavor-chip')) {
        const flavor = e.target.textContent.trim();
        AnalyticsEnhancer.recordSelection('flavor', flavor);
        AnalyticsEnhancer.trackBuilderInteraction('flavor_selected', { flavor: flavor });
      }
    });

    // Track when user completes flavor selection
    document.addEventListener('change', function(e) {
      if (e.target.matches('[name*="Flavors"]')) {
        AnalyticsEnhancer.trackFunnelStep('flavors_selected');
      }
    });

    // Track cart events
    document.addEventListener('wtf:cart:add', function(e) {
      const items = e.detail.items || [];
      AnalyticsEnhancer.trackCartEvent('add_to_cart', items);
      AnalyticsEnhancer.trackFunnelStep('add_to_cart');
    });

    // Track user preferences periodically
    setInterval(() => {
      AnalyticsEnhancer.trackUserPreferences();
    }, 60000); // Every minute

    // Track session end
    window.addEventListener('beforeunload', () => {
      AnalyticsEnhancer.trackUserPreferences();
      AnalyticsEnhancer.sendCustomEvent('session_end', {
        duration: AnalyticsEnhancer.getSessionDuration(),
        pages_visited: AnalyticsEnhancer.getPagesVisited()
      });
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose analytics enhancer globally
  window.WTFAnalytics = AnalyticsEnhancer;

})();

