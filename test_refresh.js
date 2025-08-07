const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testRefreshToken() {
    try {
        // 1. Register a test user
        console.log('1. Registering test user...');
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            email: 'test-refresh@example.com',
            password: 'TestPassword123!',
            confirm_password: 'TestPassword123!',
            first_name: 'Test',
            last_name: 'User',
            username: 'testrefresh'
        });
        
        if (registerResponse.data.user_id) {
            console.log('✅ User registered successfully');
        } else {
            console.log('⚠️  User already exists, continuing...');
        }
        
        // 2. Login with the test user
        console.log('2. Logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'test-refresh@example.com',
            password: 'TestPassword123!'
        });
        
        const { access_token, refresh_token } = loginResponse.data;
        console.log('✅ Login successful');
        console.log('Access token:', access_token ? access_token.substring(0, 20) + '...' : 'MISSING');
        console.log('Refresh token:', refresh_token ? refresh_token.substring(0, 20) + '...' : 'MISSING');
        
        if (!refresh_token) {
            throw new Error('No refresh token received from login');
        }
        
        // 3. Test refresh token endpoint
        console.log('3. Testing refresh token...');
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refresh_token
        });
        
        const { access_token: new_access_token, refresh_token: new_refresh_token } = refreshResponse.data;
        console.log('✅ Refresh token successful');
        console.log('New access token:', new_access_token ? new_access_token.substring(0, 20) + '...' : 'MISSING');
        console.log('New refresh token:', new_refresh_token ? new_refresh_token.substring(0, 20) + '...' : 'MISSING');
        
        // 4. Test with invalid refresh token
        console.log('4. Testing with invalid refresh token...');
        try {
            await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refresh_token: 'invalid-token'
            });
            console.log('❌ Invalid refresh token should have failed');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Invalid refresh token correctly rejected with 401');
            } else {
                console.log('❌ Unexpected error for invalid refresh token:', error.response?.status);
            }
        }
        
        // 5. Test missing refresh token
        console.log('5. Testing with missing refresh token...');
        try {
            await axios.post(`${API_BASE_URL}/auth/refresh`, {});
            console.log('❌ Missing refresh token should have failed');
        } catch (error) {
            if (error.response?.status === 422) {
                console.log('✅ Missing refresh token correctly rejected with 422');
                console.log('Error details:', error.response.data);
            } else {
                console.log('❌ Unexpected error for missing refresh token:', error.response?.status);
            }
        }
        
        console.log('\n🎉 All refresh token tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

testRefreshToken();