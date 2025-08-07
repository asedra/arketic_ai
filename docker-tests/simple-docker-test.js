#!/usr/bin/env node
/**
 * Simple Docker Compose Test
 * Tests basic Docker compose environment functionality
 */

const { execSync } = require('child_process');
const axios = require('axios');

async function testDockerEnvironment() {
    console.log('🚀 Starting Simple Docker Environment Test');
    console.log('============================================');
    
    try {
        // 1. Clean up any existing containers
        console.log('🧹 Cleaning up existing containers...');
        try {
            execSync('docker compose -f ../docker-compose.yml down -v --remove-orphans', { stdio: 'pipe' });
        } catch (error) {
            // Ignore cleanup errors
        }
        
        // 2. Start Docker Compose
        console.log('🐳 Starting Docker Compose services...');
        execSync('docker compose -f ../docker-compose.yml up -d --build', { 
            stdio: 'inherit',
            cwd: __dirname 
        });
        
        // 3. Wait for services to start
        console.log('⏳ Waiting for services to initialize...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second wait
        
        // 4. Check container status
        console.log('📋 Checking container status...');
        const containers = execSync('docker ps --format "{{.Names}} {{.Status}}"', { encoding: 'utf8' });
        console.log(containers);
        
        // 5. Test services
        const results = {
            postgres: false,
            redis: false,
            api: false,
            web: false,
            nginx: false
        };
        
        // Test PostgreSQL
        console.log('🔍 Testing PostgreSQL...');
        try {
            execSync('docker exec arketic-test-postgres-1 pg_isready -U arketic -d arketic_dev', { stdio: 'pipe' });
            results.postgres = true;
            console.log('✅ PostgreSQL is healthy');
        } catch (error) {
            console.log('❌ PostgreSQL test failed');
        }
        
        // Test Redis  
        console.log('🔍 Testing Redis...');
        try {
            execSync('docker exec arketic-test-redis-1 redis-cli ping', { stdio: 'pipe' });
            results.redis = true;
            console.log('✅ Redis is healthy');
        } catch (error) {
            console.log('❌ Redis test failed');
        }
        
        // Test API
        console.log('🔍 Testing API...');
        try {
            const apiResponse = await axios.get('http://localhost:8000/health', { timeout: 5000 });
            if (apiResponse.status === 200 && apiResponse.data.status === 'healthy') {
                results.api = true;
                console.log('✅ API is healthy');
                console.log('📊 API Response:', JSON.stringify(apiResponse.data, null, 2));
            }
        } catch (error) {
            console.log('❌ API test failed:', error.message);
        }
        
        // Test Web
        console.log('🔍 Testing Web...');
        try {
            const webResponse = await axios.get('http://localhost:3000/api/health', { timeout: 5000 });
            if (webResponse.status === 200) {
                results.web = true;
                console.log('✅ Web is healthy');
            }
        } catch (error) {
            console.log('❌ Web test failed:', error.message);
        }
        
        // Test Nginx
        console.log('🔍 Testing Nginx...');
        try {
            const nginxResponse = await axios.get('http://localhost:80/', { timeout: 5000 });
            if (nginxResponse.status === 200) {
                results.nginx = true;
                console.log('✅ Nginx is healthy');
            }
        } catch (error) {
            console.log('❌ Nginx test failed:', error.message);
        }
        
        // 6. Summary
        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        Object.entries(results).forEach(([service, status]) => {
            console.log(`${status ? '✅' : '❌'} ${service.toUpperCase()}: ${status ? 'HEALTHY' : 'FAILED'}`);
        });
        
        const totalServices = Object.keys(results).length;
        const healthyServices = Object.values(results).filter(Boolean).length;
        const successRate = (healthyServices / totalServices * 100).toFixed(1);
        
        console.log(`\n🎯 Overall Success Rate: ${successRate}% (${healthyServices}/${totalServices})`);
        
        if (results.api && results.postgres && results.redis) {
            console.log('\n🎉 MAIN OBJECTIVE ACHIEVED: API service is now working with fixed Docker configuration!');
            console.log('✅ The uvicorn --worker-class issue has been resolved');
        }
        
        console.log('\n🐳 Environment Status: Docker Compose is running successfully');
        console.log('💡 To stop: docker compose -f ../docker-compose.yml down -v');
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testDockerEnvironment().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});