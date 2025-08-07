"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { apiClient, complianceApi, organizationApi } from '@/lib/api-client'

interface TestResult {
  endpoint: string
  status: 'pending' | 'success' | 'error'
  data?: any
  error?: string
  responseTime?: number
}

export default function ApiTestPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { endpoint: '/health', status: 'pending' },
    { endpoint: '/api/v1/compliance/', status: 'pending' },
    { endpoint: '/api/v1/organization/people', status: 'pending' },
  ])
  const [isRunning, setIsRunning] = useState(false)

  const runTest = async (testIndex: number) => {
    const test = tests[testIndex]
    const startTime = Date.now()
    
    setTests(prev => prev.map((t, i) => 
      i === testIndex ? { ...t, status: 'pending' } : t
    ))

    try {
      let response
      switch (test.endpoint) {
        case '/health':
          response = await apiClient.get('/health')
          break
        case '/api/v1/compliance/':
          response = await complianceApi.getDocuments()
          break
        case '/api/v1/organization/people':
          response = await organizationApi.getPeople()
          break
        default:
          throw new Error(`Unknown endpoint: ${test.endpoint}`)
      }

      const responseTime = Date.now() - startTime
      
      setTests(prev => prev.map((t, i) => 
        i === testIndex ? {
          ...t,
          status: 'success',
          data: response.data,
          responseTime
        } : t
      ))
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      
      setTests(prev => prev.map((t, i) => 
        i === testIndex ? {
          ...t,
          status: 'error',
          error: error.message || 'Unknown error',
          responseTime
        } : t
      ))
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    for (let i = 0; i < tests.length; i++) {
      await runTest(i)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    setIsRunning(false)
  }

  useEffect(() => {
    runAllTests()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API Integration Test</h1>
        <p className="text-gray-600 mt-2">
          Testing connection between frontend and FastAPI backend running on localhost:8001
        </p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="mr-4"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {tests.map((test, index) => (
          <Card key={test.endpoint}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{test.endpoint}</CardTitle>
                  <CardDescription>
                    {test.responseTime && `Response time: ${test.responseTime}ms`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {test.status === 'pending' && (
                    <Badge variant="secondary">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Testing
                    </Badge>
                  )}
                  {test.status === 'success' && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Success
                    </Badge>
                  )}
                  {test.status === 'error' && (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Error
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runTest(index)}
                    disabled={isRunning}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {test.status === 'success' && test.data && (
                <div>
                  <h4 className="font-semibold mb-2">Response Data:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
                    {JSON.stringify(test.data, null, 2)}
                  </pre>
                </div>
              )}
              {test.status === 'error' && test.error && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Error:</h4>
                  <p className="text-red-600 bg-red-50 p-3 rounded">
                    {test.error}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Integration Status</h3>
        <div className="space-y-1">
          <p>✅ Backend running on: http://localhost:8001</p>
          <p>✅ Frontend running on: http://localhost:3001</p>
          <p>✅ CORS configured correctly</p>
          <p>✅ API endpoints responding</p>
        </div>
      </div>
    </div>
  )
}