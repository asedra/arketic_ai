#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

/**
 * Performance testing and analysis script for Arketic frontend
 * Analyzes Lighthouse reports and provides optimization recommendations
 */

class PerformanceAnalyzer {
  constructor() {
    this.lighthouseReportPath = path.join(process.cwd(), 'reports', 'lighthouse-report.json')
    this.thresholds = {
      performance: 90,
      accessibility: 95,
      bestPractices: 90,
      seo: 90,
      fcp: 1800, // First Contentful Paint (ms)
      lcp: 2500, // Largest Contentful Paint (ms)
      cls: 0.1,  // Cumulative Layout Shift
      fid: 100,  // First Input Delay (ms)
      tti: 3900, // Time to Interactive (ms)
    }
  }

  async analyzeLighthouseReport() {
    try {
      if (!fs.existsSync(this.lighthouseReportPath)) {
        console.log('❌ Lighthouse report not found. Run lighthouse first.')
        return false
      }

      const report = JSON.parse(fs.readFileSync(this.lighthouseReportPath, 'utf8'))
      const categories = report.categories
      const audits = report.audits

      console.log('\n🚀 Arketic Performance Analysis Report')
      console.log('=====================================\n')

      // Overall scores
      this.analyzeOverallScores(categories)
      
      // Core Web Vitals
      this.analyzeCoreWebVitals(audits)
      
      // Bundle analysis
      this.analyzeBundleSize(audits)
      
      // Performance opportunities
      this.analyzeOpportunities(audits)
      
      // Accessibility issues
      this.analyzeAccessibility(audits)
      
      // Recommendations
      this.generateRecommendations(categories, audits)

      return true
    } catch (error) {
      console.error('❌ Error analyzing Lighthouse report:', error.message)
      return false
    }
  }

  analyzeOverallScores(categories) {
    console.log('📊 Overall Scores:')
    console.log('------------------')
    
    Object.entries(categories).forEach(([key, category]) => {
      const score = Math.round(category.score * 100)
      const threshold = this.thresholds[key] || 80
      const status = score >= threshold ? '✅' : '❌'
      const trend = score >= threshold ? 'GOOD' : 'NEEDS IMPROVEMENT'
      
      console.log(`${status} ${category.title}: ${score}/100 (${trend})`)
    })
    console.log()
  }

  analyzeCoreWebVitals(audits) {
    console.log('⚡ Core Web Vitals:')
    console.log('-------------------')
    
    const vitals = [
      { key: 'first-contentful-paint', name: 'First Contentful Paint', threshold: this.thresholds.fcp },
      { key: 'largest-contentful-paint', name: 'Largest Contentful Paint', threshold: this.thresholds.lcp },
      { key: 'cumulative-layout-shift', name: 'Cumulative Layout Shift', threshold: this.thresholds.cls },
      { key: 'first-input-delay', name: 'First Input Delay', threshold: this.thresholds.fid },
      { key: 'interactive', name: 'Time to Interactive', threshold: this.thresholds.tti },
    ]

    vitals.forEach(({ key, name, threshold }) => {
      if (audits[key]) {
        const value = audits[key].numericValue
        const displayValue = audits[key].displayValue
        const isGood = key === 'cumulative-layout-shift' 
          ? value <= threshold 
          : value <= threshold
        const status = isGood ? '✅' : '❌'
        
        console.log(`${status} ${name}: ${displayValue}`)
      }
    })
    console.log()
  }

  analyzeBundleSize(audits) {
    console.log('📦 Bundle Analysis:')
    console.log('-------------------')
    
    if (audits['total-byte-weight']) {
      const totalSize = Math.round(audits['total-byte-weight'].numericValue / 1024)
      const isGoodSize = totalSize <= 500 // 500KB threshold
      console.log(`${isGoodSize ? '✅' : '❌'} Total Bundle Size: ${totalSize}KB`)
    }

    if (audits['unused-javascript']) {
      const unusedJS = Math.round(audits['unused-javascript'].details?.overallSavingsBytes / 1024 || 0)
      if (unusedJS > 0) {
        console.log(`⚠️  Unused JavaScript: ${unusedJS}KB can be removed`)
      }
    }

    if (audits['unused-css-rules']) {
      const unusedCSS = Math.round(audits['unused-css-rules'].details?.overallSavingsBytes / 1024 || 0)
      if (unusedCSS > 0) {
        console.log(`⚠️  Unused CSS: ${unusedCSS}KB can be removed`)
      }
    }
    console.log()
  }

  analyzeOpportunities(audits) {
    console.log('🎯 Performance Opportunities:')
    console.log('------------------------------')
    
    const opportunities = [
      'render-blocking-resources',
      'unused-javascript',
      'unused-css-rules',
      'offscreen-images',
      'total-byte-weight',
      'uses-text-compression',
      'uses-optimized-images',
      'modern-image-formats',
      'efficiently-encode-images'
    ]

    let hasOpportunities = false
    opportunities.forEach(key => {
      if (audits[key] && audits[key].score < 0.9) {
        hasOpportunities = true
        const audit = audits[key]
        const savings = audit.details?.overallSavingsMs 
          ? `(${Math.round(audit.details.overallSavingsMs)}ms savings)`
          : ''
        console.log(`⚠️  ${audit.title} ${savings}`)
      }
    })

    if (!hasOpportunities) {
      console.log('✅ No major performance opportunities found!')
    }
    console.log()
  }

  analyzeAccessibility(audits) {
    console.log('♿ Accessibility Issues:')
    console.log('------------------------')
    
    const a11yAudits = Object.keys(audits).filter(key => 
      audits[key].scoreDisplayMode === 'binary' && 
      audits[key].score === 0 &&
      key.includes('aria') || key.includes('color') || key.includes('focus')
    )

    if (a11yAudits.length === 0) {
      console.log('✅ No accessibility issues found!')
    } else {
      a11yAudits.forEach(key => {
        console.log(`❌ ${audits[key].title}`)
      })
    }
    console.log()
  }

  generateRecommendations(categories, audits) {
    console.log('💡 Optimization Recommendations:')
    console.log('---------------------------------')
    
    const recommendations = []
    
    // Performance recommendations
    if (categories.performance.score < 0.9) {
      if (audits['unused-javascript']?.score < 0.9) {
        recommendations.push('• Remove unused JavaScript code using tree shaking')
        recommendations.push('• Implement code splitting for better bundle optimization')
      }
      
      if (audits['render-blocking-resources']?.score < 0.9) {
        recommendations.push('• Eliminate render-blocking resources')
        recommendations.push('• Use async/defer for non-critical scripts')
      }
      
      if (audits['offscreen-images']?.score < 0.9) {
        recommendations.push('• Implement lazy loading for images')
        recommendations.push('• Use intersection observer for better performance')
      }
    }

    // React-specific recommendations
    recommendations.push('• Use React.memo for expensive components')
    recommendations.push('• Implement virtualization for large lists')
    recommendations.push('• Add error boundaries to critical components')
    recommendations.push('• Use debounced callbacks for search inputs')
    recommendations.push('• Cache expensive computations with useMemo')

    // Bundle optimization
    recommendations.push('• Split large libraries into separate chunks')
    recommendations.push('• Use dynamic imports for route-based code splitting')
    recommendations.push('• Optimize images with next/image component')

    recommendations.forEach(rec => console.log(rec))
    console.log()
  }

  async generateReport() {
    const success = await this.analyzeLighthouseReport()
    
    if (success) {
      console.log('📈 Performance Analysis Complete!')
      console.log('View the detailed Lighthouse report at: reports/lighthouse-report.html')
    }
    
    return success
  }
}

// Bundle size analyzer
class BundleSizeAnalyzer {
  constructor() {
    this.buildDir = path.join(process.cwd(), '.next')
  }

  analyzeBundleSize() {
    console.log('\n📦 Bundle Size Analysis:')
    console.log('========================\n')

    try {
      const buildManifest = path.join(this.buildDir, 'build-manifest.json')
      if (fs.existsSync(buildManifest)) {
        const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'))
        
        console.log('JavaScript Bundles:')
        Object.entries(manifest.pages).forEach(([page, files]) => {
          const jsFiles = files.filter(file => file.endsWith('.js'))
          console.log(`  ${page}: ${jsFiles.length} files`)
        })
      }

      // Check for large dependencies
      const packageJson = path.join(process.cwd(), 'package.json')
      if (fs.existsSync(packageJson)) {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'))
        const largeDeps = []
        
        // Known large dependencies to watch
        const watchList = ['d3', 'recharts', 'moment', 'lodash']
        watchList.forEach(dep => {
          if (pkg.dependencies[dep]) {
            largeDeps.push(dep)
          }
        })

        if (largeDeps.length > 0) {
          console.log('\n⚠️  Large Dependencies Detected:')
          largeDeps.forEach(dep => {
            console.log(`  • ${dep} - Consider lazy loading or tree shaking`)
          })
        }
      }

    } catch (error) {
      console.error('Error analyzing bundle size:', error.message)
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Arketic Performance Analysis...\n')
  
  const analyzer = new PerformanceAnalyzer()
  const bundleAnalyzer = new BundleSizeAnalyzer()
  
  // Run analyses
  await analyzer.generateReport()
  bundleAnalyzer.analyzeBundleSize()
  
  console.log('\n✨ Analysis complete! Check the recommendations above.')
  console.log('💡 Pro tip: Run `npm run lighthouse` to generate a fresh report.')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { PerformanceAnalyzer, BundleSizeAnalyzer }