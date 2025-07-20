// test-full-flow.js
// Test the complete recommendation flow with fallbacks

const BASE_URL = "https://movies.thilakjo.com";

async function testFullFlow() {
  console.log("🧪 Testing Complete Movie Recommendation Flow...\n");

  // Test 1: Check if the main page loads
  console.log("📋 Test 1: Main page accessibility");
  try {
    const response = await fetch(`${BASE_URL}/`);
    if (response.ok) {
      console.log("✅ Main page loads successfully");
    } else {
      console.log("❌ Main page failed to load");
    }
  } catch (error) {
    console.log("💥 Main page error:", error.message);
  }
  console.log("---\n");

  // Test 2: Check recommendation API (this should work with fallbacks)
  console.log("📋 Test 2: Recommendation API with fallbacks");
  try {
    const response = await fetch(`${BASE_URL}/api/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Recommendation API works!");
      console.log(
        `📊 Recommendations count: ${data.recommendations?.length || 0}`
      );
      console.log(`📊 User movies count: ${data.userMovies?.length || 0}`);

      if (data.recommendations && data.recommendations.length > 0) {
        console.log("🎬 Sample recommendations:");
        data.recommendations.slice(0, 3).forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec.title}`);
        });
      }
    } else {
      console.log("❌ Recommendation API failed");
      console.log(`🚨 Error: ${data.error}`);
    }
  } catch (error) {
    console.log("💥 Recommendation API error:", error.message);
  }
  console.log("---\n");

  // Test 3: Check survey API
  console.log("📋 Test 3: Survey API with fallbacks");
  try {
    const response = await fetch(`${BASE_URL}/api/survey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        favoriteGenre: "Action",
        favoriteDirector: "Christopher Nolan",
        mood: "Excited",
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Survey API works!");
      console.log(`📊 Movies generated: ${data.movies?.length || 0}`);

      if (data.movies && data.movies.length > 0) {
        console.log("🎬 Sample survey movies:");
        data.movies.slice(0, 3).forEach((movie, i) => {
          console.log(`   ${i + 1}. ${movie}`);
        });
      }
    } else {
      console.log("❌ Survey API failed");
      console.log(`🚨 Error: ${data.error}`);
    }
  } catch (error) {
    console.log("💥 Survey API error:", error.message);
  }
  console.log("---\n");

  // Test 4: Check user movies API
  console.log("📋 Test 4: User movies API");
  try {
    const response = await fetch(`${BASE_URL}/api/user-movies`);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ User movies API works!");
      console.log(`📊 Movies count: ${data.movies?.length || 0}`);
    } else {
      console.log("❌ User movies API failed");
    }
  } catch (error) {
    console.log("💥 User movies API error:", error.message);
  }
  console.log("---\n");

  console.log("🎉 Full flow testing complete!");
  console.log("\n📝 Summary:");
  console.log(
    "• The app should now work even when Gemini API quota is exceeded"
  );
  console.log(
    "• Fallback movies will be provided instead of AI-generated ones"
  );
  console.log("• User data will be preserved in all scenarios");
  console.log(
    '• The "Get New Recommendations" button should work without errors'
  );
}

// Run the tests
testFullFlow().catch((error) => {
  console.error("💥 Test script failed:", error);
});
