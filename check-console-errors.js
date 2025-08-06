const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    // Only log errors and warnings
    if (type === 'error' || type === 'warning') {
      console.log(`[${type.toUpperCase()}] ${msg.text()}`);
      console.log('Stack:', msg.location().url);
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log('Stack:', error.stack);
  });

  // Listen for unhandled promise rejections
  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED] ${request.failure().errorText} ${request.url()}`);
  });

  // Navigate to the website
  console.log('Navigating to http://localhost:3030...');
  await page.goto('http://localhost:3030');
  
  // Wait for a bit to catch any delayed errors
  await page.waitForTimeout(5000);
  
  console.log('Checking for console errors...');
  
  // Check for any unhandled exceptions in the browser
  const unhandledExceptions = await page.evaluate(() => {
    return window.__unhandledRejections || [];
  });
  
  if (unhandledExceptions.length > 0) {
    console.log('\nUnhandled promise rejections:');
    unhandledExceptions.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }
  
  await browser.close();
  console.log('\nConsole error check completed.');
})();
