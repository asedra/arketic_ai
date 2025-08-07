#!/usr/bin/env node

/**
 * People API Test Suite
 * Tests the People management endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000';

async function testPeopleAPI() {
    console.log('🧪 Testing People API...\n');
    
    try {
        // Step 1: Login to get auth token
        console.log('Step 1: Login...');
        const loginResponse = await axios.post(`${API_BASE}/api/v1/auth/login`, {
            username: "admin@arketic.com",
            password: "admin123"
        });
        
        if (!loginResponse.data.access_token) {
            throw new Error('Login failed - no access token');
        }
        
        const token = loginResponse.data.access_token;
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('✅ Login successful');
        
        // Step 2: Create test person
        console.log('\nStep 2: Create Person...');
        const personData = {
            first_name: "John",
            last_name: "Doe", 
            email: "john.doe@company.com",
            phone: "+1-555-123-4567",
            job_title: "Software Engineer",
            department: "Engineering",
            site: "Head Office",
            role: "User",
            hire_date: "2024-01-15T00:00:00Z",
            manager_id: null,
            location: "San Francisco",
            employee_id: "EMP001"
        };
        
        const createResponse = await axios.post(
            `${API_BASE}/api/v1/organization/people/`,
            personData,
            { headers }
        );
        
        if (createResponse.status !== 201) {
            throw new Error(`Create person failed with status: ${createResponse.status}`);
        }
        
        const createdPerson = createResponse.data;
        console.log('✅ Person created:', createdPerson.full_name);
        console.log(`   ID: ${createdPerson.id}`);
        console.log(`   Email: ${createdPerson.email}`);
        
        // Step 3: Get person by ID
        console.log('\nStep 3: Get Person by ID...');
        const getResponse = await axios.get(
            `${API_BASE}/api/v1/organization/people/${createdPerson.id}`,
            { headers }
        );
        
        console.log('✅ Person retrieved:', getResponse.data.full_name);
        
        // Step 4: List people
        console.log('\nStep 4: List People...');
        const listResponse = await axios.get(
            `${API_BASE}/api/v1/organization/people/`,
            { headers }
        );
        
        console.log('✅ People list retrieved:');
        console.log(`   Total: ${listResponse.data.total}`);
        console.log(`   Page: ${listResponse.data.page}`);
        console.log(`   Page size: ${listResponse.data.page_size}`);
        
        // Step 5: Update person
        console.log('\nStep 5: Update Person...');
        const updateData = {
            job_title: "Senior Software Engineer",
            department: "Engineering",
            phone: "+1-555-123-9999"
        };
        
        const updateResponse = await axios.put(
            `${API_BASE}/api/v1/organization/people/${createdPerson.id}`,
            updateData,
            { headers }
        );
        
        console.log('✅ Person updated:', updateResponse.data.job_title);
        
        // Step 6: Search people
        console.log('\nStep 6: Search People...');
        const searchResponse = await axios.get(
            `${API_BASE}/api/v1/organization/people/?query=John&department=Engineering`,
            { headers }
        );
        
        console.log('✅ Search completed:', searchResponse.data.people.length, 'results');
        
        // Step 7: Get stats
        console.log('\nStep 7: Get People Stats...');
        const statsResponse = await axios.get(
            `${API_BASE}/api/v1/organization/people/stats/overview`,
            { headers }
        );
        
        console.log('✅ Stats retrieved:');
        console.log(`   Total people: ${statsResponse.data.total_people}`);
        console.log(`   Active people: ${statsResponse.data.active_people}`);
        console.log(`   Departments:`, statsResponse.data.departments);
        
        // Step 8: Get hierarchy
        console.log('\nStep 8: Get Organization Hierarchy...');
        const hierarchyResponse = await axios.get(
            `${API_BASE}/api/v1/organization/people/hierarchy`,
            { headers }
        );
        
        console.log('✅ Hierarchy retrieved:');
        console.log(`   Total people in hierarchy: ${hierarchyResponse.data.total_people}`);
        
        // Step 9: Create another person as manager
        console.log('\nStep 9: Create Manager Person...');
        const managerData = {
            first_name: "Jane",
            last_name: "Smith", 
            email: "jane.smith@company.com",
            job_title: "Engineering Manager",
            department: "Engineering",
            role: "Manager",
            employee_id: "EMP002"
        };
        
        const createManagerResponse = await axios.post(
            `${API_BASE}/api/v1/organization/people/`,
            managerData,
            { headers }
        );
        
        const createdManager = createManagerResponse.data;
        console.log('✅ Manager created:', createdManager.full_name);
        
        // Step 10: Update first person to have the manager
        console.log('\nStep 10: Assign Manager...');
        const assignManagerResponse = await axios.put(
            `${API_BASE}/api/v1/organization/people/${createdPerson.id}`,
            { manager_id: createdManager.id },
            { headers }
        );
        
        console.log('✅ Manager assigned successfully');
        
        // Step 11: Test bulk operations
        console.log('\nStep 11: Test Bulk Create...');
        const bulkData = {
            people: [
                {
                    first_name: "Alice",
                    last_name: "Johnson",
                    email: "alice.johnson@company.com",
                    department: "Marketing",
                    role: "User"
                },
                {
                    first_name: "Bob",
                    last_name: "Wilson",
                    email: "bob.wilson@company.com", 
                    department: "Sales",
                    role: "User"
                }
            ]
        };
        
        const bulkResponse = await axios.post(
            `${API_BASE}/api/v1/organization/people/bulk`,
            bulkData,
            { headers }
        );
        
        console.log('✅ Bulk create successful:', bulkResponse.data.length, 'people created');
        
        // Step 12: Final people count
        console.log('\nStep 12: Final People Count...');
        const finalListResponse = await axios.get(
            `${API_BASE}/api/v1/organization/people/`,
            { headers }
        );
        
        console.log('✅ Final people count:', finalListResponse.data.total);
        
        console.log('\n🎉 All People API tests passed!\n');
        
        return {
            success: true,
            totalPeople: finalListResponse.data.total,
            createdPeople: [createdPerson, createdManager, ...bulkResponse.data]
        };
        
    } catch (error) {
        console.error('❌ People API test failed:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Run test
if (require.main === module) {
    testPeopleAPI().then(result => {
        console.log('Test Result:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { testPeopleAPI };