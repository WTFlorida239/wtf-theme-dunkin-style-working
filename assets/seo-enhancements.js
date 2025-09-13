/**
 * WTF SEO Enhancements
 * Improves search engine visibility and user experience
 */

(function() {
  'use strict';

  // Dynamic meta tag updates
  function updateMetaTags() {
    // Update page title based on current selection
    const productTitle = document.querySelector('.wtf-page-hero h1');
    const sizeSelector = document.querySelector('.size-selector.active');
    const strainSelector = document.querySelector('.strain-selector.active');
    
    if (productTitle && sizeSelector) {
      const baseTitle = productTitle.textContent;
      const size = sizeSelector.dataset.value;
      const strain = strainSelector ? strainSelector.dataset.value : '';
      
      let newTitle = `${baseTitle}`;
      if (size) newTitle += ` - ${size}`;
      if (strain && strain !== 'Mix') newTitle += ` ${strain}`;
      
      document.title = `${newTitle} | WTF | Welcome To Florida`;
    }
  }

  // Breadcrumb generation
  function generateBreadcrumbs() {
    const breadcrumbContainer = document.querySelector('[data-breadcrumbs]');
    if (!breadcrumbContainer) return;

    const pathSegments = window.location.pathname.split('/').filter(segment => segment);
    const breadcrumbs = [
      { name: 'Home', url: '/' }
    ];

    // Build breadcrumb trail
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += '/' + segment;
      
      let name = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Custom names for specific pages
      const customNames = {
        'kratom-teas': 'Kratom Teas',
        'kava-drinks': 'Kava Drinks',
        'thc-drinks': 'THC Drinks',
        'pages': 'Menu'
      };
      
      if (customNames[segment]) {
        name = customNames[segment];
      }
      
      breadcrumbs.push({
        name: name,
        url: currentPath,
        current: index === pathSegments.length - 1
      });
    });

    // Generate breadcrumb HTML
    const breadcrumbHTML = breadcrumbs.map((crumb, index) => {
      if (crumb.current) {
        return `<span class="breadcrumb-current" aria-current="page">${crumb.name}</span>`;
      } else {
        return `<a href="${crumb.url}" class="breadcrumb-link">${crumb.name}</a>`;
      }
    }).join('<span class="breadcrumb-separator" aria-hidden="true"> › </span>');

    breadcrumbContainer.innerHTML = `
      <nav aria-label="Breadcrumb" class="breadcrumb-nav">
        ${breadcrumbHTML}
      </nav>
    `;

    // Add structured data for breadcrumbs
    const breadcrumbStructuredData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": window.location.origin + crumb.url
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(breadcrumbStructuredData);
    document.head.appendChild(script);
  }

  // Product schema generation for builder pages
  function generateProductSchema() {
    const productTitle = document.querySelector('.wtf-page-hero h1');
    const productImage = document.querySelector('.wtf-page-hero img');
    const priceElement = document.querySelector('[data-price]');
    
    if (!productTitle) return;

    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": productTitle.textContent,
      "description": "Customize your perfect kratom tea or kava drink with our premium selection of strains and flavors.",
      "brand": {
        "@type": "Brand",
        "name": "WTF | Welcome To Florida"
      },
      "category": "Beverages",
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "USD",
        "lowPrice": "9.00",
        "highPrice": "100.00",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "WTF | Welcome To Florida"
        }
      }
    };

    if (productImage) {
      productSchema.image = [productImage.src];
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(productSchema);
    document.head.appendChild(script);
  }

  // Local business schema for location pages
  function generateLocalBusinessSchema() {
    if (!window.location.pathname.includes('location')) return;

    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "WTF | Welcome To Florida",
      "description": "Premium kava, kratom, and cannabis products in Cape Coral, Florida",
      "url": window.location.origin,
      "telephone": "+1-239-XXX-XXXX", // Replace with actual phone
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Cape Coral",
        "addressLocality": "Cape Coral",
        "addressRegion": "FL",
        "postalCode": "33904",
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "26.5629",
        "longitude": "-81.9495"
      },
      "openingHours": [
        "Mo-Su 08:00-22:00"
      ],
      "servesCuisine": ["Kava", "Kratom", "Cannabis Products", "Beverages"],
      "priceRange": "$",
      "paymentAccepted": ["Cash", "Credit Card"],
      "currenciesAccepted": "USD"
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(localBusinessSchema);
    document.head.appendChild(script);
  }

  // FAQ schema for product pages
  function generateFAQSchema() {
    const faqs = [
      {
        question: "What is kratom tea?",
        answer: "Kratom tea is a beverage made from the leaves of the Mitragyna speciosa tree, known for its unique properties and various strain options."
      },
      {
        question: "What sizes are available?",
        answer: "We offer kratom teas and kava drinks in Medium (12 oz), Large (16 oz), and Gallon sizes to suit your needs."
      },
      {
        question: "Can I customize my drink?",
        answer: "Yes! You can choose your strain (Green, Red, White, Yellow, or Mix), select flavors, and add custom notes to personalize your drink."
      },
      {
        question: "What is the Mix option?",
        answer: "The Mix option allows you to combine two different strains in a 50/50 ratio for a balanced experience."
      }
    ];

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(faqSchema);
    document.head.appendChild(script);
  }

  // Canonical URL management
  function updateCanonicalURL() {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    
    // Remove query parameters for cleaner canonical URLs
    const cleanURL = window.location.origin + window.location.pathname;
    canonical.href = cleanURL;
  }

  // Open Graph updates for social sharing
  function updateOpenGraphTags() {
    const title = document.title;
    const description = document.querySelector('meta[name="description"]')?.content || 
                      'Customize your perfect kratom tea or kava drink at WTF | Welcome To Florida';
    const image = document.querySelector('.wtf-page-hero img')?.src || 
                  '/assets/wtf-logo.png';

    // Update or create OG tags
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { property: 'og:url', content: window.location.href },
      { property: 'og:type', content: 'website' }
    ];

    ogTags.forEach(tag => {
      let meta = document.querySelector(`meta[property="${tag.property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', tag.property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', tag.content);
    });
  }

  // Search functionality enhancement
  function enhanceSearch() {
    const searchInput = document.querySelector('[data-search]');
    if (!searchInput) return;

    // Add search suggestions
    const searchSuggestions = [
      'Kratom Tea',
      'Kava Drink',
      'Green Strain',
      'Red Strain',
      'White Strain',
      'Yellow Strain',
      'Mango Flavor',
      'Coconut Flavor',
      'Strawberry Flavor'
    ];

    searchInput.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      if (query.length < 2) return;

      const matches = searchSuggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(query)
      );

      // Display suggestions (implement UI as needed)
      console.log('Search suggestions:', matches);
    });
  }

  // Page speed optimization
  function optimizePageSpeed() {
    // Preload next likely page
    const categoryLinks = document.querySelectorAll('.wtf-category-card a');
    categoryLinks.forEach(link => {
      link.addEventListener('mouseenter', function() {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = this.href;
        document.head.appendChild(prefetchLink);
      }, { once: true });
    });

    // Optimize images
    const images = document.querySelectorAll('img[loading="lazy"]');
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            // Add fade-in effect
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s';
            img.onload = () => {
              img.style.opacity = '1';
            };
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  // Analytics enhancement for SEO
  function enhanceSEOAnalytics() {
    // Track user interactions for SEO insights
    const interactions = {
      strainSelections: {},
      flavorSelections: {},
      sizeSelections: {}
    };

    // Track strain selections
    document.addEventListener('click', function(e) {
      if (e.target.matches('.strain-selector')) {
        const strain = e.target.dataset.value;
        interactions.strainSelections[strain] = (interactions.strainSelections[strain] || 0) + 1;
      }
      
      if (e.target.matches('.wtf-flavor-chip')) {
        const flavor = e.target.textContent.trim();
        interactions.flavorSelections[flavor] = (interactions.flavorSelections[flavor] || 0) + 1;
      }
      
      if (e.target.matches('.size-selector')) {
        const size = e.target.dataset.value;
        interactions.sizeSelections[size] = (interactions.sizeSelections[size] || 0) + 1;
      }
    });

    // Send analytics data periodically
    setInterval(() => {
      if (window.gtag) {
        window.gtag('event', 'user_preferences', {
          custom_parameters: {
            popular_strains: Object.keys(interactions.strainSelections).slice(0, 3),
            popular_flavors: Object.keys(interactions.flavorSelections).slice(0, 5),
            popular_sizes: Object.keys(interactions.sizeSelections).slice(0, 2)
          }
        });
      }
    }, 30000); // Every 30 seconds
  }

  // Initialize all SEO enhancements
  function init() {
    // Run immediately
    updateCanonicalURL();
    updateOpenGraphTags();
    generateBreadcrumbs();
    generateProductSchema();
    generateLocalBusinessSchema();
    generateFAQSchema();
    enhanceSearch();
    optimizePageSpeed();
    enhanceSEOAnalytics();

    // Update meta tags when user makes selections
    document.addEventListener('click', function(e) {
      if (e.target.matches('.size-selector, .strain-selector')) {
        setTimeout(updateMetaTags, 100);
        setTimeout(updateOpenGraphTags, 100);
      }
    });

    // Update on page navigation
    window.addEventListener('popstate', function() {
      setTimeout(() => {
        updateCanonicalURL();
        updateOpenGraphTags();
        generateBreadcrumbs();
      }, 100);
    });
  }

  // Start SEO enhancements
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose SEO utilities globally
  window.WTFSEO = {
    updateMetaTags,
    generateBreadcrumbs,
    updateCanonicalURL,
    updateOpenGraphTags
  };

})();

