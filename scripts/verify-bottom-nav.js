import { readFileSync } from 'fs';
import { resolve } from 'path';

async function verifyBottomNav() {
  console.log('=== VERIFYING BOTTOM NAVIGATION BAR VISIBILITY ===\n');

  const layoutPath = resolve('apps/web/src/app/(mobile)/layout.tsx');
  const layoutContent = readFileSync(layoutPath, 'utf-8');

  const requiredRoutes = [
    '/assignments',
    '/machines',
    '/inventory-logs',
    '/cash',
    '/packets',
    '/users',
    '/dashboard',
    '/locations',
    '/reports',
    '/settings',
  ];

  let allPassed = true;

  for (const route of requiredRoutes) {
    const isIncluded = layoutContent.includes(`"${route}"`);
    console.log(`[ROUTE] ${route} -> Included in bottomNavRoutes: ${isIncluded ? 'PASS' : 'FAIL'}`);
    if (!isIncluded) allPassed = false;
  }

  const hasBottomPadding = layoutContent.includes('pb-24');
  console.log(`\n- Bottom padding (pb-24 applied on container when showBottomNav is true): ${hasBottomPadding ? 'PASS' : 'FAIL'}`);

  if (allPassed && hasBottomPadding) {
    console.log('\n🎉 ALL ROUTES CONFIGURED FOR FIXED BOTTOM NAVIGATION BAR VISIBILITY!');
  } else {
    console.error('\n❌ VERIFICATION FAILED');
    process.exit(1);
  }
}

verifyBottomNav();
