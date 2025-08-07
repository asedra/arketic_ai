/**
 * Advanced test coverage reporting and analysis
 * Generates comprehensive coverage reports with trend analysis and quality gates
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Coverage configuration and thresholds
const COVERAGE_CONFIG = {
  // Global coverage thresholds
  globalThresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  },

  // Per-directory thresholds (more stringent for critical code)
  directoryThresholds: {
    'app/': { statements: 85, branches: 80, functions: 85, lines: 85 },
    'components/': { statements: 90, branches: 85, functions: 90, lines: 90 },
    'lib/': { statements: 85, branches: 80, functions: 85, lines: 85 },
    'hooks/': { statements: 90, branches: 85, functions: 90, lines: 90 },
    'tests/': { statements: 100, branches: 100, functions: 100, lines: 100 }
  },

  // Critical files requiring higher coverage
  criticalFiles: [
    'lib/auth*',
    'lib/security*',
    'lib/validation*',
    'components/ui/button*',
    'app/layout*'
  ],

  // Files to exclude from coverage requirements
  excludePatterns: [
    '**/*.stories.*',
    '**/*.config.*',
    '**/mock/**',
    '**/__mocks__/**',
    '**/types/**',
    '**/*.d.ts'
  ],

  // Quality gate settings
  qualityGates: {
    minimumCoverage: 70,
    coverageDecrease: 5, // Maximum allowed decrease in %
    newCodeCoverage: 85  // Minimum coverage for new/changed code
  }
}

class CoverageAnalyzer {
  constructor() {
    this.coverageData = null
    this.previousCoverage = null
    this.results = {
      summary: {},
      details: {},
      trends: {},
      qualityGate: { passed: true, issues: [] },
      recommendations: []
    }
  }

  // Load coverage data from Jest output
  loadCoverageData() {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')
    
    if (!fs.existsSync(coveragePath)) {
      throw new Error('Coverage data not found. Run "npm run test:coverage" first.')
    }

    this.coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
    console.log('✅ Coverage data loaded successfully')
  }

  // Load previous coverage for trend analysis
  loadPreviousCoverage() {
    const previousPath = path.join(process.cwd(), 'coverage', 'previous-coverage.json')
    
    if (fs.existsSync(previousPath)) {
      this.previousCoverage = JSON.parse(fs.readFileSync(previousPath, 'utf8'))
      console.log('✅ Previous coverage data loaded for trend analysis')
    } else {
      console.log('ℹ️  No previous coverage data found - first run')
    }
  }

  // Analyze global coverage metrics
  analyzeGlobalCoverage() {
    const total = this.coverageData.total
    const summary = {
      statements: total.statements.pct,
      branches: total.branches.pct,
      functions: total.functions.pct,
      lines: total.lines.pct
    }

    this.results.summary = summary

    // Check against global thresholds
    Object.entries(COVERAGE_CONFIG.globalThresholds).forEach(([metric, threshold]) => {
      if (summary[metric] < threshold) {
        this.results.qualityGate.passed = false
        this.results.qualityGate.issues.push({
          type: 'GLOBAL_THRESHOLD',
          metric,
          actual: summary[metric],
          expected: threshold,
          severity: 'HIGH'
        })
      }
    })

    console.log('📊 Global Coverage Analysis:')
    console.log(`   Statements: ${summary.statements}% (threshold: ${COVERAGE_CONFIG.globalThresholds.statements}%)`)
    console.log(`   Branches: ${summary.branches}% (threshold: ${COVERAGE_CONFIG.globalThresholds.branches}%)`)
    console.log(`   Functions: ${summary.functions}% (threshold: ${COVERAGE_CONFIG.globalThresholds.functions}%)`)
    console.log(`   Lines: ${summary.lines}% (threshold: ${COVERAGE_CONFIG.globalThresholds.lines}%)`)
  }

  // Analyze per-file coverage
  analyzeFileCoverage() {
    const fileDetails = {}
    const uncoveredFiles = []
    const poorCoverageFiles = []

    Object.entries(this.coverageData).forEach(([filePath, coverage]) => {
      if (filePath === 'total') return

      const relativePath = path.relative(process.cwd(), filePath)
      
      // Skip excluded patterns
      if (this.isExcluded(relativePath)) return

      const fileAnalysis = {
        path: relativePath,
        statements: coverage.statements.pct,
        branches: coverage.branches.pct,
        functions: coverage.functions.pct,
        lines: coverage.lines.pct,
        uncoveredLines: coverage.lines.total - coverage.lines.covered
      }

      fileDetails[relativePath] = fileAnalysis

      // Identify uncovered files
      if (coverage.statements.pct === 0) {
        uncoveredFiles.push(relativePath)
      }

      // Identify files with poor coverage
      if (coverage.statements.pct < 50) {
        poorCoverageFiles.push({
          path: relativePath,
          coverage: coverage.statements.pct
        })
      }

      // Check critical files
      if (this.isCriticalFile(relativePath)) {
        const criticalThreshold = 90
        if (coverage.statements.pct < criticalThreshold) {
          this.results.qualityGate.passed = false
          this.results.qualityGate.issues.push({
            type: 'CRITICAL_FILE',
            file: relativePath,
            actual: coverage.statements.pct,
            expected: criticalThreshold,
            severity: 'CRITICAL'
          })
        }
      }
    })

    this.results.details = {
      fileDetails,
      uncoveredFiles,
      poorCoverageFiles: poorCoverageFiles.sort((a, b) => a.coverage - b.coverage)
    }

    console.log(`\\n📁 File Coverage Analysis:`)
    console.log(`   Total files analyzed: ${Object.keys(fileDetails).length}`)
    console.log(`   Uncovered files: ${uncoveredFiles.length}`)
    console.log(`   Files with <50% coverage: ${poorCoverageFiles.length}`)
  }

  // Analyze directory-level coverage
  analyzeDirectoryCoverage() {
    const directoryStats = {}

    Object.entries(this.results.details.fileDetails).forEach(([filePath, coverage]) => {
      const directory = this.getDirectoryFromPath(filePath)
      
      if (!directoryStats[directory]) {
        directoryStats[directory] = {
          files: 0,
          totalStatements: 0,
          totalBranches: 0,
          totalFunctions: 0,
          totalLines: 0
        }
      }

      directoryStats[directory].files++
      directoryStats[directory].totalStatements += coverage.statements
      directoryStats[directory].totalBranches += coverage.branches
      directoryStats[directory].totalFunctions += coverage.functions
      directoryStats[directory].totalLines += coverage.lines
    })

    // Calculate averages and check thresholds
    Object.entries(directoryStats).forEach(([directory, stats]) => {
      const avgCoverage = {
        statements: stats.totalStatements / stats.files,
        branches: stats.totalBranches / stats.files,
        functions: stats.totalFunctions / stats.files,
        lines: stats.totalLines / stats.files
      }

      directoryStats[directory].average = avgCoverage

      // Check directory thresholds
      const thresholds = COVERAGE_CONFIG.directoryThresholds[directory + '/']
      if (thresholds) {
        Object.entries(thresholds).forEach(([metric, threshold]) => {
          if (avgCoverage[metric] < threshold) {
            this.results.qualityGate.passed = false
            this.results.qualityGate.issues.push({
              type: 'DIRECTORY_THRESHOLD',
              directory,
              metric,
              actual: avgCoverage[metric],
              expected: threshold,
              severity: 'MEDIUM'
            })
          }
        })
      }
    })

    this.results.directoryStats = directoryStats

    console.log(`\\n📂 Directory Coverage Analysis:`)
    Object.entries(directoryStats).forEach(([dir, stats]) => {
      console.log(`   ${dir}: ${stats.average.statements.toFixed(1)}% avg (${stats.files} files)`)
    })
  }

  // Analyze coverage trends
  analyzeTrends() {
    if (!this.previousCoverage) {
      console.log('\\n📈 Trend Analysis: No previous data available')
      return
    }

    const currentTotal = this.coverageData.total
    const previousTotal = this.previousCoverage.total

    const trends = {
      statements: currentTotal.statements.pct - previousTotal.statements.pct,
      branches: currentTotal.branches.pct - previousTotal.branches.pct,
      functions: currentTotal.functions.pct - previousTotal.functions.pct,
      lines: currentTotal.lines.pct - previousTotal.lines.pct
    }

    this.results.trends = trends

    // Check for significant decreases
    Object.entries(trends).forEach(([metric, change]) => {
      if (change < -COVERAGE_CONFIG.qualityGates.coverageDecrease) {
        this.results.qualityGate.passed = false
        this.results.qualityGate.issues.push({
          type: 'COVERAGE_DECREASE',
          metric,
          change,
          threshold: -COVERAGE_CONFIG.qualityGates.coverageDecrease,
          severity: 'HIGH'
        })
      }
    })

    console.log(`\\n📈 Coverage Trends:`)
    Object.entries(trends).forEach(([metric, change]) => {
      const direction = change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️'
      const sign = change > 0 ? '+' : ''
      console.log(`   ${metric}: ${direction} ${sign}${change.toFixed(2)}%`)
    })
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = []

    // Global coverage recommendations
    if (this.results.summary.statements < COVERAGE_CONFIG.globalThresholds.statements) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Coverage',
        message: `Increase overall statement coverage to ${COVERAGE_CONFIG.globalThresholds.statements}%`,
        action: 'Add unit tests for uncovered code paths'
      })
    }

    // Uncovered files
    if (this.results.details.uncoveredFiles.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Uncovered Files',
        message: `${this.results.details.uncoveredFiles.length} files have no test coverage`,
        action: 'Create test files for: ' + this.results.details.uncoveredFiles.slice(0, 3).join(', ')
      })
    }

    // Poor coverage files
    if (this.results.details.poorCoverageFiles.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Low Coverage',
        message: `${this.results.details.poorCoverageFiles.length} files have <50% coverage`,
        action: 'Improve tests for files with lowest coverage'
      })
    }

    // Branch coverage
    if (this.results.summary.branches < this.results.summary.statements - 10) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Branch Coverage',
        message: 'Branch coverage significantly lower than statement coverage',
        action: 'Add tests for conditional logic and error handling paths'
      })
    }

    // Function coverage
    if (this.results.summary.functions < 90) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Function Coverage',
        message: 'Some functions are not tested',
        action: 'Ensure all exported functions have corresponding tests'
      })
    }

    // Critical files
    const criticalIssues = this.results.qualityGate.issues.filter(issue => issue.type === 'CRITICAL_FILE')
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Critical Files',
        message: 'Critical files have insufficient coverage',
        action: `Prioritize testing for: ${criticalIssues.map(i => i.file).join(', ')}`
      })
    }

    this.results.recommendations = recommendations

    console.log(`\\n💡 Recommendations:`)
    recommendations.forEach((rec, index) => {
      const icon = rec.priority === 'CRITICAL' ? '🚨' : rec.priority === 'HIGH' ? '⚠️' : 'ℹ️'
      console.log(`   ${index + 1}. ${icon} [${rec.priority}] ${rec.message}`)
      console.log(`      Action: ${rec.action}`)
    })
  }

  // Generate HTML report
  generateHTMLReport() {
    const reportDir = path.join(process.cwd(), 'coverage-reports')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arketic Test Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #1f2937; margin: 0; }
        .header .subtitle { color: #6b7280; margin-top: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #3b82f6; }
        .metric-card.good { border-left-color: #10b981; }
        .metric-card.warning { border-left-color: #f59e0b; }
        .metric-card.danger { border-left-color: #ef4444; }
        .metric-value { font-size: 2em; font-weight: bold; color: #1f2937; }
        .metric-label { color: #6b7280; font-size: 0.9em; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1f2937; border-bottom: 1px solid #e1e5e9; padding-bottom: 10px; }
        .quality-gate { padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .quality-gate.passed { background-color: #d1fae5; border: 1px solid #10b981; color: #065f46; }
        .quality-gate.failed { background-color: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        .file-list { max-height: 400px; overflow-y: auto; }
        .file-item { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .file-item:hover { background-color: #f9fafb; }
        .coverage-bar { width: 100px; height: 20px; background-color: #e5e7eb; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; border-radius: 10px; }
        .recommendations { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; }
        .recommendation { margin-bottom: 15px; }
        .recommendation .priority { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; margin-right: 10px; }
        .priority.critical { background-color: #ef4444; color: white; }
        .priority.high { background-color: #f59e0b; color: white; }
        .priority.medium { background-color: #3b82f6; color: white; }
        .trends { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .trend-item { text-align: center; padding: 15px; background-color: #f8fafc; border-radius: 8px; }
        .trend-value { font-size: 1.5em; font-weight: bold; }
        .trend-value.positive { color: #10b981; }
        .trend-value.negative { color: #ef4444; }
        .trend-value.neutral { color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Arketic Test Coverage Report</h1>
            <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
        </div>

        <div class="section">
            <div class="quality-gate ${this.results.qualityGate.passed ? 'passed' : 'failed'}">
                <strong>${this.results.qualityGate.passed ? '✅ Quality Gate: PASSED' : '❌ Quality Gate: FAILED'}</strong>
                ${this.results.qualityGate.issues.length > 0 ? 
                  `<div style="margin-top: 10px;">${this.results.qualityGate.issues.length} issue(s) detected</div>` : 
                  ''
                }
            </div>
        </div>

        <div class="section">
            <h2>📊 Coverage Metrics</h2>
            <div class="metrics">
                ${Object.entries(this.results.summary).map(([metric, value]) => `
                    <div class="metric-card ${value >= 80 ? 'good' : value >= 60 ? 'warning' : 'danger'}">
                        <div class="metric-value">${value.toFixed(1)}%</div>
                        <div class="metric-label">${metric.charAt(0).toUpperCase() + metric.slice(1)}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        ${this.previousCoverage ? `
        <div class="section">
            <h2>📈 Coverage Trends</h2>
            <div class="trends">
                ${Object.entries(this.results.trends).map(([metric, change]) => `
                    <div class="trend-item">
                        <div class="trend-value ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}">
                            ${change > 0 ? '+' : ''}${change.toFixed(2)}%
                        </div>
                        <div class="metric-label">${metric.charAt(0).toUpperCase() + metric.slice(1)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>📁 Files Requiring Attention</h2>
            <div class="file-list">
                ${this.results.details.poorCoverageFiles.slice(0, 20).map(file => `
                    <div class="file-item">
                        <span>${file.path}</span>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span>${file.coverage.toFixed(1)}%</span>
                            <div class="coverage-bar">
                                <div class="coverage-fill" style="width: ${file.coverage}%; background-color: ${file.coverage >= 80 ? '#10b981' : file.coverage >= 60 ? '#f59e0b' : '#ef4444'};"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${this.results.recommendations.map(rec => `
                    <div class="recommendation">
                        <span class="priority ${rec.priority.toLowerCase()}">${rec.priority}</span>
                        <strong>${rec.message}</strong>
                        <div style="margin-top: 5px; color: #6b7280;">Action: ${rec.action}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`

    const reportPath = path.join(reportDir, `coverage-report-${Date.now()}.html`)
    fs.writeFileSync(reportPath, html)
    
    console.log(`\\n📄 HTML report generated: ${reportPath}`)
    return reportPath
  }

  // Save current coverage as previous for next run
  saveCoverageHistory() {
    const historyPath = path.join(process.cwd(), 'coverage', 'previous-coverage.json')
    fs.writeFileSync(historyPath, JSON.stringify(this.coverageData, null, 2))
    console.log('💾 Coverage data saved for trend analysis')
  }

  // Helper methods
  isExcluded(filePath) {
    return COVERAGE_CONFIG.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
      return regex.test(filePath)
    })
  }

  isCriticalFile(filePath) {
    return COVERAGE_CONFIG.criticalFiles.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return regex.test(filePath)
    })
  }

  getDirectoryFromPath(filePath) {
    const parts = filePath.split('/')
    return parts.length > 1 ? parts[0] : 'root'
  }

  // Generate JSON report for CI/CD
  generateJSONReport() {
    const reportDir = path.join(process.cwd(), 'coverage-reports')
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      qualityGate: this.results.qualityGate,
      trends: this.results.trends,
      recommendations: this.results.recommendations,
      details: {
        totalFiles: Object.keys(this.results.details.fileDetails).length,
        uncoveredFiles: this.results.details.uncoveredFiles.length,
        poorCoverageFiles: this.results.details.poorCoverageFiles.length
      }
    }

    const jsonPath = path.join(reportDir, 'coverage-analysis.json')
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2))
    
    return jsonPath
  }

  // Main analysis function
  async runAnalysis() {
    console.log('🔍 Starting comprehensive coverage analysis...')
    
    try {
      this.loadCoverageData()
      this.loadPreviousCoverage()
      this.analyzeGlobalCoverage()
      this.analyzeFileCoverage()
      this.analyzeDirectoryCoverage()
      this.analyzeTrends()
      this.generateRecommendations()
      
      const htmlReport = this.generateHTMLReport()
      const jsonReport = this.generateJSONReport()
      this.saveCoverageHistory()
      
      console.log(`\\n${this.results.qualityGate.passed ? '✅' : '❌'} Coverage Analysis Complete`)
      console.log(`   Quality Gate: ${this.results.qualityGate.passed ? 'PASSED' : 'FAILED'}`)
      console.log(`   HTML Report: ${htmlReport}`)
      console.log(`   JSON Report: ${jsonReport}`)
      
      if (!this.results.qualityGate.passed) {
        console.log(`\\n🚨 Quality Gate Issues:`)
        this.results.qualityGate.issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. [${issue.severity}] ${issue.type}: ${issue.message || 'See details above'}`)
        })
        
        if (process.env.CI === 'true') {
          process.exit(1)
        }
      }
      
    } catch (error) {
      console.error('❌ Coverage analysis failed:', error.message)
      process.exit(1)
    }
  }
}

// Run coverage analysis if called directly
if (require.main === module) {
  const analyzer = new CoverageAnalyzer()
  analyzer.runAnalysis()
}

module.exports = { CoverageAnalyzer, COVERAGE_CONFIG }