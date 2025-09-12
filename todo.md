# WTF Shopify Theme - Issues and Tasks

## Current Status Assessment
- ✅ Site is loading and displaying correctly
- ✅ Product ordering interface is functional (Kratom Teas page)
- ✅ Price updates work when selecting different sizes
- ✅ Variant selection system appears to be working
- ✅ Cart system works (has existing item: White Rabbit Mangoberry $8.00)
- ❌ Add to Cart functionality not working from custom pages
- ❌ Cart count display issues ("Cart: items" instead of count)
- ❌ Multiple Liquid errors in theme
- ❌ Kava Drinks page has different layout but same functionality issues

## Production-Ready Improvements Completed
- ✅ Fixed font_url Liquid errors with proper conditionals
- ✅ Restored announcement-bar and footer sections in theme.liquid
- ✅ Removed duplicate section calls from page templates
- ✅ Added product handle configuration for custom pages
- ✅ Enhanced cart count update functionality
- ✅ Added fallback product structure for custom drinks
- ✅ Improved error handling in AJAX cart system
- ✅ Created comprehensive CSS styling system
- ✅ Added mobile responsiveness and accessibility features
- ✅ Implemented loading states and error handling
- ✅ Added print styles and high contrast support

### 1. Liquid Template Errors
- ❌ Fix "announcement-bar is not a valid section type" error (line 254)
- ❌ Fix "footer is not a valid section type" error (line 260)
- ❌ Fix font_url Liquid errors (lines 222, 225)

### 2. JavaScript/Cart Functionality
- ❌ Investigate Add to Cart button not working
- ❌ Fix cart count not updating after adding items
- ❌ Check wtf_ajax_cart.js for proper implementation
- ❌ Verify variant persistence and AJAX functionality

### 3. Missing Sections
- ❌ Create or restore announcement-bar section
- ❌ Create or restore footer section

### 4. Theme Structure Issues
- ❌ Fix script loading order in theme.liquid
- ❌ Ensure all WTF custom scripts load properly
- ❌ Remove any duplicate script tags

### 5. Additional Pages to Test
- ❌ Test Kava Drinks page functionality
- ❌ Test other product category pages
- ❌ Verify cart drawer functionality
- ❌ Test checkout process

## Files to Examine/Fix
- layout/theme.liquid (main template issues)
- assets/wtf_ajax_cart.js (cart functionality)
- sections/announcement-bar.liquid (missing)
- sections/footer.liquid (missing)
- snippets/wtf-cart-drawer.liquid (cart UI)
- templates/page.kava-drinks.liquid (page parity)

## Production Readiness Tasks
- ❌ Fix all console errors
- ❌ Optimize loading performance
- ❌ Test mobile responsiveness
- ❌ Verify all product categories work
- ❌ Test complete checkout flow
- ❌ Create new git branch for stable release

