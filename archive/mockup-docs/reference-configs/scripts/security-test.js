/**
 * Security testing script for Arketic platform
 * Tests for common security vulnerabilities and compliance issues
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Security test configuration
const SECURITY_CONFIG = {
  // Content Security Policy checks
  csp: {
    required: true,
    directives: [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'connect-src',
      'font-src',
      'object-src',
      'media-src',
      'frame-src'
    ]
  },
  
  // Security headers that should be present
  securityHeaders: [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Referrer-Policy'
  ],
  
  // Sensitive patterns to check for in code
  sensitivePatterns: [
    { pattern: /password\s*=\s*['""][^'"]+['""]/gi, severity: 'HIGH', description: 'Hardcoded password' },
    { pattern: /api[_-]?key\s*=\s*['""][^'"]+['""]/gi, severity: 'HIGH', description: 'Hardcoded API key' },
    { pattern: /secret\s*=\s*['""][^'"]+['""]/gi, severity: 'HIGH', description: 'Hardcoded secret' },
    { pattern: /token\s*=\s*['""][^'"]+['""]/gi, severity: 'MEDIUM', description: 'Hardcoded token' },
    { pattern: /eval\s*\(/gi, severity: 'HIGH', description: 'Use of eval() - potential XSS' },
    { pattern: /innerHTML\s*=/gi, severity: 'MEDIUM', description: 'innerHTML usage - potential XSS' },
    { pattern: /document\.write\s*\(/gi, severity: 'HIGH', description: 'document.write() - potential XSS' },
    { pattern: /dangerouslySetInnerHTML/gi, severity: 'MEDIUM', description: 'dangerouslySetInnerHTML usage' },
    { pattern: /localStorage\.setItem\s*\(\s*['""][^'"]*password/gi, severity: 'HIGH', description: 'Storing password in localStorage' },
    { pattern: /sessionStorage\.setItem\s*\(\s*['""][^'"]*password/gi, severity: 'HIGH', description: 'Storing password in sessionStorage' }
  ],
  
  // File extensions to scan
  scanExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  
  // Directories to exclude from scanning
  excludeDirs: ['node_modules', '.next', 'coverage', 'dist', 'build', '.git']
}

class SecurityScanner {
  constructor() {
    this.results = {
      vulnerabilities: [],
      warnings: [],
      info: [],
      summary: {
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      }
    }
  }

  // Scan for hardcoded secrets and sensitive patterns
  scanSensitivePatterns(directory = process.cwd()) {
    console.log('🔍 Scanning for sensitive patterns...')
    
    const files = this.getFilesToScan(directory)
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(process.cwd(), filePath)
      
      SECURITY_CONFIG.sensitivePatterns.forEach(({ pattern, severity, description }) => {
        const matches = content.match(pattern)
        if (matches) {
          matches.forEach(match => {
            const lineNumber = this.getLineNumber(content, match)
            
            const vulnerability = {
              type: 'SENSITIVE_PATTERN',
              severity,
              description,
              file: relativePath,
              line: lineNumber,
              match: match.substring(0, 100) + (match.length > 100 ? '...' : ''),
              recommendation: this.getRecommendation(description)
            }
            
            if (severity === 'HIGH') {
              this.results.vulnerabilities.push(vulnerability)
              this.results.summary.high++
            } else if (severity === 'MEDIUM') {
              this.results.warnings.push(vulnerability)
              this.results.summary.medium++
            } else {
              this.results.info.push(vulnerability)
              this.results.summary.low++
            }
            
            this.results.summary.total++
          })
        }
      })
    })
  }

  // Check for insecure dependencies
  checkDependencies() {
    console.log('📦 Checking dependencies for vulnerabilities...')
    
    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { 
        encoding: 'utf8',
        cwd: process.cwd()
      })
      
      const audit = JSON.parse(auditResult)
      
      if (audit.vulnerabilities) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
          const severity = vuln.severity.toUpperCase()
          
          const vulnerability = {
            type: 'DEPENDENCY',
            severity,
            description: `Vulnerable dependency: ${pkg}`,
            package: pkg,
            title: vuln.title || 'Unknown vulnerability',
            recommendation: `Update ${pkg} to a secure version`,
            cwe: vuln.cwe || [],
            cvss: vuln.cvss || {}
          }
          
          if (severity === 'HIGH' || severity === 'CRITICAL') {
            this.results.vulnerabilities.push(vulnerability)
            this.results.summary.high++
          } else if (severity === 'MODERATE') {
            this.results.warnings.push(vulnerability)
            this.results.summary.medium++
          } else {
            this.results.info.push(vulnerability)
            this.results.summary.low++
          }
          
          this.results.summary.total++
        })
      }
    } catch (error) {
      console.warn('⚠️  Could not run npm audit:', error.message)
    }
  }

  // Check Next.js security configuration
  checkNextJsConfig() {
    console.log('⚙️  Checking Next.js security configuration...')
    
    const configPath = path.join(process.cwd(), 'next.config.mjs')
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8')
      
      // Check for security headers
      if (!configContent.includes('headers')) {
        this.results.warnings.push({
          type: 'CONFIGURATION',
          severity: 'MEDIUM',
          description: 'Missing security headers configuration in Next.js',
          file: 'next.config.mjs',
          recommendation: 'Add security headers to Next.js configuration'
        })
        this.results.summary.medium++
        this.results.summary.total++
      }
      
      // Check for CSP configuration
      if (!configContent.includes('Content-Security-Policy') && !configContent.includes('contentSecurityPolicy')) {
        this.results.warnings.push({
          type: 'CONFIGURATION',
          severity: 'MEDIUM',
          description: 'Missing Content Security Policy configuration',
          file: 'next.config.mjs',
          recommendation: 'Implement Content Security Policy headers'
        })
        this.results.summary.medium++
        this.results.summary.total++
      }
      
      // Check if TypeScript errors are ignored
      if (configContent.includes('ignoreBuildErrors: true')) {
        this.results.warnings.push({
          type: 'CONFIGURATION',
          severity: 'LOW',
          description: 'TypeScript build errors are being ignored',
          file: 'next.config.mjs',
          recommendation: 'Fix TypeScript errors instead of ignoring them'
        })
        this.results.summary.low++
        this.results.summary.total++
      }
    }
  }

  // Check for proper input validation patterns
  checkInputValidation() {
    console.log('🛡️  Checking input validation patterns...')
    
    const files = this.getFilesToScan(process.cwd())
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(process.cwd(), filePath)
      
      // Check for form inputs without validation
      const formInputPattern = /<input[^>]*type=['"](?:text|email|password)['"]/gi
      const zodPattern = /z\./g
      const validationPattern = /validate|validation|schema/gi
      
      const inputs = content.match(formInputPattern)
      const hasValidation = zodPattern.test(content) || validationPattern.test(content)
      
      if (inputs && inputs.length > 0 && !hasValidation) {
        this.results.warnings.push({
          type: 'INPUT_VALIDATION',
          severity: 'MEDIUM',
          description: 'Form inputs found without apparent validation',
          file: relativePath,
          recommendation: 'Implement input validation using Zod or similar library'
        })
        this.results.summary.medium++
        this.results.summary.total++
      }
    })
  }

  // Check for authentication and authorization patterns
  checkAuthPatterns() {
    console.log('🔐 Checking authentication patterns...')
    
    const files = this.getFilesToScan(process.cwd())
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(process.cwd(), filePath)
      
      // Check for unprotected API routes
      if (relativePath.includes('/api/') && relativePath.endsWith('.ts')) {
        const hasAuth = /auth|authenticate|authorize|jwt|token/gi.test(content)
        const isPublic = /public|health|ping/gi.test(relativePath)
        
        if (!hasAuth && !isPublic) {
          this.results.warnings.push({
            type: 'AUTHENTICATION',
            severity: 'HIGH',
            description: 'Potentially unprotected API route',
            file: relativePath,
            recommendation: 'Add authentication/authorization to API routes'
          })
          this.results.summary.high++
          this.results.summary.total++
        }
      }
      
      // Check for client-side auth logic
      if (relativePath.includes('components/') || relativePath.includes('pages/')) {
        const hasClientAuth = /localStorage\.getItem.*token|sessionStorage\.getItem.*token/gi.test(content)
        
        if (hasClientAuth) {
          this.results.info.push({
            type: 'AUTHENTICATION',
            severity: 'LOW',
            description: 'Client-side authentication logic detected',
            file: relativePath,
            recommendation: 'Ensure server-side validation of authentication'
          })
          this.results.summary.low++
          this.results.summary.total++
        }
      }
    })
  }

  // Check environment variable usage
  checkEnvironmentVariables() {
    console.log('🌍 Checking environment variable usage...')
    
    const files = this.getFilesToScan(process.cwd())
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(process.cwd(), filePath)
      
      // Check for exposed environment variables on client-side
      const clientEnvPattern = /process\.env\.(?!NEXT_PUBLIC_)[A-Z_]+/g
      const matches = content.match(clientEnvPattern)
      
      if (matches && (relativePath.includes('components/') || relativePath.includes('pages/') || relativePath.includes('app/'))) {
        matches.forEach(match => {
          this.results.vulnerabilities.push({
            type: 'ENVIRONMENT',
            severity: 'HIGH',
            description: 'Server-side environment variable exposed to client',
            file: relativePath,
            match,
            recommendation: 'Use NEXT_PUBLIC_ prefix for client-safe environment variables'
          })
          this.results.summary.high++
          this.results.summary.total++
        })
      }
    })
  }

  // Generate security report
  generateReport() {
    const timestamp = new Date().toISOString()
    const reportDir = path.join(process.cwd(), 'security-reports')
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }
    
    const report = {
      timestamp,
      summary: this.results.summary,
      vulnerabilities: this.results.vulnerabilities,
      warnings: this.results.warnings,
      info: this.results.info,
      recommendations: this.generateRecommendations()
    }
    
    const reportPath = path.join(reportDir, `security-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    return { reportPath, report }
  }

  // Helper methods
  getFilesToScan(directory) {
    const files = []
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir)
      
      items.forEach(item => {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory() && !SECURITY_CONFIG.excludeDirs.includes(item)) {
          scanDir(fullPath)
        } else if (stat.isFile() && SECURITY_CONFIG.scanExtensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath)
        }
      })
    }
    
    scanDir(directory)
    return files
  }

  getLineNumber(content, match) {
    const lines = content.substring(0, content.indexOf(match)).split('\\n')
    return lines.length
  }

  getRecommendation(description) {
    const recommendations = {
      'Hardcoded password': 'Use environment variables for passwords',
      'Hardcoded API key': 'Use environment variables for API keys',
      'Hardcoded secret': 'Use environment variables for secrets',
      'Hardcoded token': 'Use environment variables for tokens',
      'Use of eval() - potential XSS': 'Avoid eval(), use safer alternatives',
      'innerHTML usage - potential XSS': 'Use textContent or sanitize HTML',
      'document.write() - potential XSS': 'Use modern DOM manipulation methods',
      'dangerouslySetInnerHTML usage': 'Sanitize HTML content before rendering',
      'Storing password in localStorage': 'Never store passwords in browser storage',
      'Storing password in sessionStorage': 'Never store passwords in browser storage'
    }
    
    return recommendations[description] || 'Review and fix security issue'
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.results.summary.high > 0) {
      recommendations.push('🚨 Address high-severity vulnerabilities immediately')
      recommendations.push('🔧 Implement proper secret management')
      recommendations.push('🛡️  Add input validation and sanitization')
    }
    
    if (this.results.summary.medium > 0) {
      recommendations.push('⚠️  Review medium-severity warnings')
      recommendations.push('🔒 Implement security headers')
      recommendations.push('📋 Add Content Security Policy')
    }
    
    recommendations.push('🔍 Set up automated security scanning in CI/CD')
    recommendations.push('📚 Train team on secure coding practices')
    recommendations.push('🧪 Include security testing in development workflow')
    
    return recommendations
  }

  printResults() {
    console.log('\\n🔒 Arketic Security Scan Results')
    console.log('==================================')
    console.log(`📊 Total Issues: ${this.results.summary.total}`)
    console.log(`🚨 High Severity: ${this.results.summary.high}`)
    console.log(`⚠️  Medium Severity: ${this.results.summary.medium}`)
    console.log(`ℹ️  Low Severity: ${this.results.summary.low}`)
    console.log('')
    
    if (this.results.vulnerabilities.length > 0) {
      console.log('🚨 HIGH SEVERITY VULNERABILITIES:')
      this.results.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. ${vuln.description}`)
        console.log(`   File: ${vuln.file}${vuln.line ? `:${vuln.line}` : ''}`)
        console.log(`   Recommendation: ${vuln.recommendation}`)
        if (vuln.match) console.log(`   Found: ${vuln.match}`)
        console.log('')
      })
    }
    
    if (this.results.warnings.length > 0) {
      console.log('⚠️  MEDIUM SEVERITY WARNINGS:')
      this.results.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.description}`)
        console.log(`   File: ${warning.file}${warning.line ? `:${warning.line}` : ''}`)
        console.log(`   Recommendation: ${warning.recommendation}`)
        console.log('')
      })
    }
    
    const overallStatus = this.results.summary.high === 0 ? 'PASS' : 'FAIL'
    console.log(`\\n🛡️  Overall Security Status: ${overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}`)
    
    return overallStatus
  }
}

// Run security scan
async function runSecurityScan() {
  console.log('🔒 Starting Arketic Security Scan...')
  
  const scanner = new SecurityScanner()
  
  // Run all security checks
  scanner.scanSensitivePatterns()
  scanner.checkDependencies()
  scanner.checkNextJsConfig()
  scanner.checkInputValidation()
  scanner.checkAuthPatterns()
  scanner.checkEnvironmentVariables()
  
  // Generate and save report
  const { reportPath } = scanner.generateReport()
  
  // Print results
  const status = scanner.printResults()
  
  console.log(`\\n📄 Detailed report saved to: ${reportPath}`)
  
  // Exit with error code if high-severity issues found
  if (status === 'FAIL') {
    process.exit(1)
  }
}

// Export for testing
module.exports = {
  SecurityScanner,
  runSecurityScan,
  SECURITY_CONFIG
}

// Run if called directly
if (require.main === module) {
  runSecurityScan().catch(error => {
    console.error('❌ Security scan failed:', error)
    process.exit(1)
  })
}