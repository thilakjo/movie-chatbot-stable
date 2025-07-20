// test-deployment.js
// Run this script to test the deployment

const BASE_URL = "https://movies.thilakjo.com"; // Replace with your actual domain

async function testEndpoints() {
  console.log("🧪 Testing Movie Chatbot Deployment...\n");

  const tests = [
    {
      name: "Basic API Test",
      url: `${BASE_URL}/api/test`,
      method: "GET",
    },
    {
      name: "Gemini API Test",
      url: `${BASE_URL}/api/test-gemini`,
      method: "GET",
    },
    {
      name: "Debug Gemini Test",
      url: `${BASE_URL}/api/debug-gemini`,
      method: "GET",
    },
  ];

  for (const test of tests) {
    try {
      console.log(`📋 Testing: ${test.name}`);
      console.log(`🔗 URL: ${test.url}`);

      const response = await fetch(test.url, { method: test.method });
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ SUCCESS: ${test.name}`);
        console.log(`📊 Status: ${data.status || "ok"}`);
        if (data.debug) {
          console.log(`🔍 Debug Info:`, data.debug);
        }
      } else {
        console.log(`❌ FAILED: ${test.name}`);
        console.log(`🚨 Error: ${data.error || "Unknown error"}`);
        if (data.debug) {
          console.log(`🔍 Debug Info:`, data.debug);
        }
      }
    } catch (error) {
      console.log(`💥 ERROR: ${test.name}`);
      console.log(`🚨 Error: ${error.message}`);
    }
    console.log("---\n");
  }
}

// Run the tests
testEndpoints()
  .then(() => {
    console.log("🎉 Testing complete!");
  })
  .catch((error) => {
    console.error("💥 Test script failed:", error);
  });
