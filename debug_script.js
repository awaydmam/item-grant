// Debug script untuk testing Item Grant
// Buka browser console dan copy-paste script ini

console.log("=== Item Grant Debug Script ===");

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        console.log("Testing Supabase connection...");
        const response = await fetch('/src/integrations/supabase/client.ts');
        console.log("Supabase client file accessible:", response.ok);
        
        // Test basic query
        const { createClient } = window.supabase || {};
        if (createClient) {
            console.log("Supabase client available in window");
        } else {
            console.log("Supabase client NOT available in window");
        }
    } catch (error) {
        console.error("Supabase connection test failed:", error);
    }
}

// Test authentication state
async function testAuthState() {
    try {
        console.log("Testing authentication state...");
        const user = localStorage.getItem('sb-*-auth-token');
        console.log("Auth token exists:", !!user);
        
        // Check current URL
        console.log("Current URL:", window.location.href);
        console.log("Current pathname:", window.location.pathname);
    } catch (error) {
        console.error("Auth state test failed:", error);
    }
}

// Test React app mounting
function testReactApp() {
    console.log("Testing React app mounting...");
    const root = document.getElementById('root');
    console.log("Root element exists:", !!root);
    console.log("Root element content:", root?.innerHTML.length > 0 ? "Has content" : "Empty");
    
    // Check for React components
    const reactElements = document.querySelectorAll('[data-reactroot], [class*="react"]');
    console.log("React elements found:", reactElements.length);
}

// Run all tests
async function runAllTests() {
    console.log("🚀 Starting debug tests...");
    
    testReactApp();
    await testAuthState();
    await testSupabaseConnection();
    
    console.log("✅ Debug tests completed!");
    console.log("📋 Check console output above for any issues");
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.debugItemGrant = {
    testSupabaseConnection,
    testAuthState,
    testReactApp,
    runAllTests
};

console.log("🔧 Debug functions available in window.debugItemGrant");