const http = require("http");

async function testEndpoint(path, userAgent = "desktop") {
  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: "GET",
      headers: {
        "User-Agent":
          userAgent === "mobile"
            ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
            : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          path,
          statusCode: res.statusCode,
          headers: res.headers,
          size: data.length,
          hasDoctype: data.includes("<!DOCTYPE html>"),
          hasThemeTokens: data.includes("48 96% 53%") || data.includes("--primary"),
          hasShadcnElements:
            data.includes("button") ||
            data.includes("table") ||
            data.includes("dialog") ||
            data.includes("card"),
          hasLayout:
            path.startsWith("/scan") || path.startsWith("/machine")
              ? data.includes("Field Agent Mode") || data.includes("Scan QR")
              : data.includes("Multi-Tenant Vending") || data.includes("Fleet Operations"),
          htmlSnippet: data.substring(0, 300).replace(/\r?\n|\r/g, " "),
        });
      });
    });

    req.on("error", (e) => {
      resolve({ path, error: e.message });
    });

    req.end();
  });
}

async function runAudit() {
  console.log("=================================================");
  console.log("       NEXT.JS E2E ROUTING & UI AUDIT REPORT     ");
  console.log("=================================================\n");

  const adminRoutes = [
    { path: "/", label: "Admin Overview / Dashboard" },
    { path: "/machines", label: "Machine Fleet Management" },
    { path: "/packets", label: "Packet Master Configuration" },
    { path: "/inventory-logs", label: "Inventory Audit Trail" },
    { path: "/login", label: "Dedicated Auth/Login Page" },
    { path: "/settings", label: "Settings & Branding" },
    { path: "/cash", label: "Dedicated Cash Tracking Page" },
  ];

  const agentRoutes = [
    { path: "/scan", label: "Mobile QR Scanner" },
    { path: "/machine/VM-NY-010", label: "Machine Operations (Live Serial)" },
    { path: "/machine/test-id", label: "Machine Operations (Dynamic Param)" },
  ];

  const results = {
    admin: [],
    agent: [],
  };

  console.log("--- 🖥️ 1. ADMIN JOURNEY (Desktop Viewport) ---");
  for (const r of adminRoutes) {
    const res = await testEndpoint(r.path, "desktop");
    results.admin.push({ ...r, ...res });
    const statusTag =
      res.statusCode === 200
        ? "[200 OK]"
        : res.statusCode === 404
        ? "[404 Not Found]"
        : `[HTTP ${res.statusCode}]`;
    console.log(`${statusTag.padEnd(16)} ${r.path.padEnd(20)} (${r.label})`);
  }

  console.log("\n--- 📱 2. FIELD AGENT JOURNEY (Mobile Viewport) ---");
  for (const r of agentRoutes) {
    const res = await testEndpoint(r.path, "mobile");
    results.agent.push({ ...r, ...res });
    const statusTag =
      res.statusCode === 200
        ? "[200 OK]"
        : res.statusCode === 404
        ? "[404 Not Found]"
        : `[HTTP ${res.statusCode}]`;
    console.log(`${statusTag.padEnd(16)} ${r.path.padEnd(25)} (${r.label})`);
  }

  console.log("\nAudit execution completed.");
}

runAudit();
