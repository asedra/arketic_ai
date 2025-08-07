#!/usr/bin/env python3
"""
Comprehensive Chat System Test Runner
Runs all chat system tests and generates a detailed report
"""

import asyncio
import json
import os
import sys
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add tests directory to path
sys.path.insert(0, '/home/ali/arketic/tests')

# Import test suites
from chat_system_e2e_tests import ChatAPITestSuite
from openai_integration_tests import OpenAIIntegrationTestSuite  
from database_operations_tests import DatabaseOperationsTestSuite

class ComprehensiveChatTestRunner:
    """Comprehensive Chat System Test Runner"""
    
    def __init__(self):
        self.test_results: Dict[str, Any] = {
            "start_time": datetime.now(),
            "end_time": None,
            "test_suites": {},
            "overall_summary": {
                "total_tests": 0,
                "total_passed": 0,
                "total_failed": 0,
                "success_rate": 0.0
            },
            "environment_info": {},
            "issues_found": [],
            "recommendations": []
        }
        
        self.test_suites = [
            ("Chat API E2E Tests", ChatAPITestSuite),
            ("OpenAI Integration Tests", OpenAIIntegrationTestSuite),
            ("Database Operations Tests", DatabaseOperationsTestSuite)
        ]
    
    async def check_environment(self):
        """Check if the environment is ready for testing"""
        print("🔍 Checking test environment...")
        
        env_info = {
            "python_version": sys.version,
            "working_directory": os.getcwd(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Check if services are running
        services_status = {}
        
        try:
            # Check if backend is running
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                try:
                    response = await client.get("http://localhost:8000/health")
                    services_status["backend"] = {
                        "status": "running" if response.status_code == 200 else "error",
                        "status_code": response.status_code
                    }
                except Exception as e:
                    services_status["backend"] = {
                        "status": "not_running",
                        "error": str(e)
                    }
        except ImportError:
            services_status["backend"] = {
                "status": "unknown",
                "error": "httpx not available"
            }
        
        env_info["services"] = services_status
        self.test_results["environment_info"] = env_info
        
        if services_status.get("backend", {}).get("status") != "running":
            print("❌ Backend service is not running!")
            print("💡 Please start the backend service before running tests:")
            print("   cd /home/ali/arketic && docker-compose up -d")
            return False
        
        print("✅ Environment check passed")
        return True
    
    async def run_frontend_tests(self):
        """Run frontend Jest tests"""
        print("\n🧪 Running Frontend Tests...")
        
        frontend_dir = "/home/ali/arketic/apps/web"
        test_result = {
            "name": "Frontend Tests",
            "passed": 0,
            "failed": 0,
            "errors": [],
            "output": "",
            "duration": 0
        }
        
        try:
            start_time = datetime.now()
            
            # Change to frontend directory and run tests
            process = await asyncio.create_subprocess_exec(
                "npm", "test", "--", "--watchAll=false", "--coverage=false", "--verbose",
                cwd=frontend_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            
            stdout, _ = await process.communicate()
            output = stdout.decode() if stdout else ""
            
            end_time = datetime.now()
            test_result["duration"] = (end_time - start_time).total_seconds()
            test_result["output"] = output
            
            if process.returncode == 0:
                # Parse Jest output for test counts
                lines = output.split('\n')
                for line in lines:
                    if "Tests:" in line and "passed" in line:
                        # Extract test counts from Jest output
                        # Example: "Tests: 15 passed, 15 total"
                        parts = line.split(',')
                        for part in parts:
                            if 'passed' in part:
                                passed = int(''.join(filter(str.isdigit, part)))
                                test_result["passed"] = passed
                            elif 'failed' in part:
                                failed = int(''.join(filter(str.isdigit, part)))
                                test_result["failed"] = failed
                
                print(f"✅ Frontend tests completed: {test_result['passed']} passed")
            else:
                test_result["failed"] = 1
                test_result["errors"].append("Jest tests failed")
                print(f"❌ Frontend tests failed with return code: {process.returncode}")
        
        except Exception as e:
            test_result["failed"] = 1
            test_result["errors"].append(str(e))
            test_result["duration"] = 0
            print(f"❌ Frontend tests error: {e}")
        
        self.test_results["test_suites"]["Frontend Tests"] = test_result
    
    async def run_backend_test_suite(self, suite_name: str, suite_class):
        """Run a backend test suite"""
        print(f"\n🧪 Running {suite_name}...")
        
        suite_result = {
            "name": suite_name,
            "passed": 0,
            "failed": 0,
            "errors": [],
            "duration": 0
        }
        
        try:
            start_time = datetime.now()
            
            # Create and run test suite
            test_suite = suite_class()
            await test_suite.run_all_tests()
            results = test_suite.print_test_summary()
            
            end_time = datetime.now()
            suite_result["duration"] = (end_time - start_time).total_seconds()
            suite_result["passed"] = results["passed"]
            suite_result["failed"] = results["failed"]
            suite_result["errors"] = results["errors"]
            
        except Exception as e:
            suite_result["failed"] = 1
            suite_result["errors"] = [{"test": "Suite Execution", "error": str(e)}]
            print(f"❌ {suite_name} failed with error: {e}")
        
        self.test_results["test_suites"][suite_name] = suite_result
    
    async def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive Chat System Tests\n")
        print("="*80)
        
        # Check environment first
        if not await self.check_environment():
            print("\n❌ Environment check failed. Aborting tests.")
            return
        
        # Run frontend tests
        await self.run_frontend_tests()
        
        # Run backend test suites
        for suite_name, suite_class in self.test_suites:
            await self.run_backend_test_suite(suite_name, suite_class)
        
        self.test_results["end_time"] = datetime.now()
        
        # Calculate overall summary
        self.calculate_overall_summary()
        
        # Analyze results and generate recommendations
        self.analyze_results()
    
    def calculate_overall_summary(self):
        """Calculate overall test summary"""
        total_tests = 0
        total_passed = 0
        total_failed = 0
        
        for suite_name, suite_result in self.test_results["test_suites"].items():
            total_tests += suite_result["passed"] + suite_result["failed"]
            total_passed += suite_result["passed"]
            total_failed += suite_result["failed"]
        
        success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        
        self.test_results["overall_summary"] = {
            "total_tests": total_tests,
            "total_passed": total_passed,
            "total_failed": total_failed,
            "success_rate": success_rate,
            "duration": (self.test_results["end_time"] - self.test_results["start_time"]).total_seconds()
        }
    
    def analyze_results(self):
        """Analyze test results and generate issues/recommendations"""
        issues = []
        recommendations = []
        
        # Check backend service status
        backend_status = self.test_results["environment_info"]["services"]["backend"]["status"]
        if backend_status != "running":
            issues.append({
                "category": "Environment",
                "severity": "High",
                "description": "Backend service is not running properly",
                "recommendation": "Start the backend service using: docker-compose up -d"
            })
        
        # Analyze test suite results
        for suite_name, suite_result in self.test_results["test_suites"].items():
            if suite_result["failed"] > 0:
                # Categorize failures
                for error in suite_result.get("errors", []):
                    if isinstance(error, dict):
                        error_msg = error.get("error", "").lower()
                    else:
                        error_msg = str(error).lower()
                    
                    if "connection" in error_msg or "timeout" in error_msg:
                        issues.append({
                            "category": "Connectivity",
                            "severity": "Medium",
                            "description": f"{suite_name}: {error.get('test', 'Unknown') if isinstance(error, dict) else 'Unknown'} - Connection issues",
                            "recommendation": "Check network connectivity and service health"
                        })
                    elif "authentication" in error_msg or "unauthorized" in error_msg:
                        issues.append({
                            "category": "Authentication",
                            "severity": "Medium", 
                            "description": f"{suite_name}: Authentication/authorization issues",
                            "recommendation": "Verify user credentials and authentication flow"
                        })
                    elif "openai" in error_msg or "api key" in error_msg:
                        issues.append({
                            "category": "AI Integration",
                            "severity": "Low",
                            "description": f"{suite_name}: OpenAI API key issues",
                            "recommendation": "Set up valid OpenAI API key for full AI functionality"
                        })
                    elif "database" in error_msg:
                        issues.append({
                            "category": "Database",
                            "severity": "High",
                            "description": f"{suite_name}: Database operation issues",
                            "recommendation": "Check database connectivity and schema"
                        })
        
        # Generate general recommendations
        overall_success_rate = self.test_results["overall_summary"]["success_rate"]
        
        if overall_success_rate >= 90:
            recommendations.append("🎉 Excellent! Chat system is highly functional with minimal issues.")
        elif overall_success_rate >= 75:
            recommendations.append("👍 Good! Chat system is mostly functional with some minor issues to address.")
        elif overall_success_rate >= 50:
            recommendations.append("⚠️ Chat system has moderate issues that should be addressed for full functionality.")
        else:
            recommendations.append("🚨 Chat system has significant issues that need immediate attention.")
        
        # Add specific recommendations
        if not any(issue["category"] == "AI Integration" for issue in issues):
            recommendations.append("✅ OpenAI integration appears to be working correctly.")
        
        if not any(issue["category"] == "Database" for issue in issues):
            recommendations.append("✅ Database operations are functioning properly.")
        
        if not any(issue["category"] == "Connectivity" for issue in issues):
            recommendations.append("✅ Network connectivity and WebSocket functionality are working well.")
        
        self.test_results["issues_found"] = issues
        self.test_results["recommendations"] = recommendations
    
    def print_comprehensive_report(self):
        """Print comprehensive test report"""
        results = self.test_results
        overall = results["overall_summary"]
        
        print("\n" + "="*100)
        print("🎯 COMPREHENSIVE CHAT SYSTEM TEST REPORT")
        print("="*100)
        
        # Environment Info
        print(f"\n📊 ENVIRONMENT INFO:")
        print(f"• Python Version: {results['environment_info']['python_version'].split()[0]}")
        print(f"• Working Directory: {results['environment_info']['working_directory']}")
        print(f"• Backend Status: {results['environment_info']['services']['backend']['status']}")
        print(f"• Test Started: {results['start_time'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"• Test Completed: {results['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"• Total Duration: {overall['duration']:.2f} seconds")
        
        # Overall Summary
        print(f"\n📈 OVERALL SUMMARY:")
        print(f"• Total Tests: {overall['total_tests']}")
        print(f"• Passed: {overall['total_passed']} ✅")
        print(f"• Failed: {overall['total_failed']} ❌")
        print(f"• Success Rate: {overall['success_rate']:.1f}%")
        
        # Test Suite Details
        print(f"\n📋 TEST SUITE DETAILS:")
        for suite_name, suite_result in results["test_suites"].items():
            total_suite_tests = suite_result["passed"] + suite_result["failed"]
            suite_success_rate = (suite_result["passed"] / total_suite_tests * 100) if total_suite_tests > 0 else 0
            
            print(f"\n• {suite_name}:")
            print(f"  - Tests: {total_suite_tests}")
            print(f"  - Passed: {suite_result['passed']} ✅")
            print(f"  - Failed: {suite_result['failed']} ❌") 
            print(f"  - Success Rate: {suite_success_rate:.1f}%")
            print(f"  - Duration: {suite_result['duration']:.2f}s")
            
            if suite_result["errors"]:
                print(f"  - Errors:")
                for error in suite_result["errors"][:3]:  # Show first 3 errors
                    if isinstance(error, dict):
                        test_name = error.get('test', 'Unknown')
                        error_msg = error.get('error', 'No details')[:100]
                        print(f"    * {test_name}: {error_msg}...")
                    else:
                        print(f"    * Unknown: {str(error)[:100]}...")
        
        # Issues Found
        if results["issues_found"]:
            print(f"\n🚨 ISSUES FOUND ({len(results['issues_found'])}):")
            for issue in results["issues_found"]:
                severity_emoji = {"High": "🔴", "Medium": "🟡", "Low": "🟢"}.get(issue["severity"], "⚪")
                print(f"{severity_emoji} [{issue['category']}] {issue['description']}")
                print(f"    💡 {issue['recommendation']}")
        else:
            print(f"\n✅ NO CRITICAL ISSUES FOUND!")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in results["recommendations"]:
            print(f"• {rec}")
        
        # Next Steps
        print(f"\n🎯 NEXT STEPS:")
        if overall["success_rate"] >= 90:
            print("• ✅ Chat system is ready for production!")
            print("• 🔧 Address any minor issues found")
            print("• 📈 Consider implementing additional monitoring")
        elif overall["success_rate"] >= 75:
            print("• 🔧 Address the identified issues")
            print("• 🧪 Re-run tests after fixes")
            print("• 📋 Consider additional integration testing")
        else:
            print("• 🚨 Critical issues need immediate attention")
            print("• 🔧 Fix high-priority issues first")
            print("• 🧪 Re-run tests frequently during fixes")
            print("• 📞 Consider getting additional development support")
        
        print("\n" + "="*100)
        
        return results
    
    def save_report_to_file(self):
        """Save test report to JSON file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"/home/ali/arketic/chat_system_test_report_{timestamp}.json"
        
        try:
            # Convert datetime objects to strings for JSON serialization
            report_data = json.loads(json.dumps(self.test_results, default=str))
            
            with open(filename, 'w') as f:
                json.dump(report_data, f, indent=2, default=str)
            
            print(f"📄 Full report saved to: {filename}")
            
        except Exception as e:
            print(f"⚠️ Could not save report to file: {e}")


async def main():
    """Main test runner function"""
    runner = ComprehensiveChatTestRunner()
    
    try:
        await runner.run_all_tests()
        results = runner.print_comprehensive_report()
        runner.save_report_to_file()
        
        # Exit with appropriate code
        exit_code = 0 if results["overall_summary"]["total_failed"] == 0 else 1
        return exit_code
        
    except KeyboardInterrupt:
        print("\n\n🛑 Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error during testing: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    import sys
    print("🧪 Chat System Comprehensive Test Suite")
    print("This will test all components of the chat system including:")
    print("• Backend API endpoints")  
    print("• Frontend components and state management")
    print("• WebSocket connections")
    print("• OpenAI integration")
    print("• Database operations")
    print("• Error handling and edge cases\n")
    
    exit_code = asyncio.run(main())
    sys.exit(exit_code)