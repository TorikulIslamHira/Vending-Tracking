import { readFileSync } from 'fs';
import { resolve } from 'path';

async function verifyMobileRefactor() {
  console.log('=== VERIFYING MOBILE-FIRST UI REFACTOR ===\n');

  const routes = [
    { name: 'inventory-logs', path: 'apps/web/src/app/(mobile)/inventory-logs/page.tsx' },
    { name: 'packets', path: 'apps/web/src/app/(mobile)/packets/page.tsx' },
    { name: 'machines', path: 'apps/web/src/app/(mobile)/machines/page.tsx' },
    { name: 'cash', path: 'apps/web/src/app/(mobile)/cash/page.tsx' },
  ];

  let allPassed = true;

  for (const route of routes) {
    const filePath = resolve(route.path);
    const content = readFileSync(filePath, 'utf-8');

    const hasBackNav = content.includes('ArrowLeft');
    const usesDrawer = content.includes('Drawer') && content.includes('DrawerContent');
    const noWideTable = !content.includes('<Table>') && !content.includes('<TableCell>');
    const hasCardLayout = content.includes('<Card') && content.includes('<CardContent');
    const hasActiveScale = content.includes('active:scale');

    console.log(`[ROUTE] /${route.name}`);
    console.log(`  - Back Navigation (<ArrowLeft />): ${hasBackNav ? 'PASS' : 'FAIL'}`);
    console.log(`  - Vaul Bottom Drawer (<Drawer />): ${usesDrawer ? 'PASS' : 'FAIL'}`);
    console.log(`  - Zero Wide Desktop Tables (<Table>): ${noWideTable ? 'PASS' : 'FAIL'}`);
    console.log(`  - Mobile Card Stack (<CardContent>): ${hasCardLayout ? 'PASS' : 'FAIL'}`);
    console.log(`  - Emil Kowalski Micro-interactions (active:scale): ${hasActiveScale ? 'PASS' : 'FAIL'}\n`);

    if (!hasBackNav || !usesDrawer || !noWideTable || !hasCardLayout || !hasActiveScale) {
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('🎉 ALL 4 PAGES STRICTLY CONFORM TO MOBILE-FIRST UI REQUIREMENTS!');
  } else {
    console.error('❌ SOME CHECKS FAILED');
    process.exit(1);
  }
}

verifyMobileRefactor();
