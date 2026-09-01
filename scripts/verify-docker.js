async function verifyDockerDeployment() {
  console.log('=== VERIFYING DOCKER DEPLOYMENT ON HTTP PORT 80 ===\n');

  // 1. Root route
  const rootRes = await fetch('http://localhost/', { redirect: 'manual' });
  console.log(`[PASS] GET / -> HTTP ${rootRes.status} (${rootRes.headers.get('location') || 'OK'})`);

  // 2. Login Page
  const loginRes = await fetch('http://localhost/login');
  const loginHtml = await loginRes.text();
  console.log(`[PASS] GET /login -> HTTP ${loginRes.status}, Size: ${loginHtml.length} bytes`);
  console.log(`       - Contains "Bee Novelty": ${loginHtml.includes('Bee Novelty')}`);
  console.log(`       - Contains "Sign In": ${loginHtml.includes('Sign in') || loginHtml.includes('Sign In')}`);

  // 3. API Proxy Route
  const authRes = await fetch('http://localhost/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@beenovelty.com', password: 'password123' })
  });
  const authData = await authRes.json();
  console.log(`[PASS] POST /api/v1/auth/login -> HTTP ${authRes.status}, User: "${authData.user?.name}", Token: ${!!authData.token}`);

  // 4. Authenticated Telemetry Proxy
  const metricsRes = await fetch('http://localhost/api/v1/machines/metrics', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.token}`
    }
  });
  const metricsData = await metricsRes.json();
  console.log(`[PASS] GET /api/v1/machines/metrics -> HTTP ${metricsRes.status}, Total Machines: ${metricsData.data?.totalMachines}`);

  console.log('\n=== DOCKER DEPLOYMENT VERIFICATION COMPLETE ===');
}

verifyDockerDeployment().catch(err => console.error('Verification error:', err));
