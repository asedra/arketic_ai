#!/usr/bin/env python3
"""
Test Integration Script

This script integrates new endpoint tests into the main test files
after they have been successfully tested in isolation.

Author: Claude
Created: 2025-01-10
"""

import json
import os
import shutil
from datetime import datetime


def check_test_report(report_file: str) -> bool:
    """Check if test report shows all tests passed"""
    if not os.path.exists(report_file):
        print(f"❌ Test report not found: {report_file}")
        return False
    
    with open(report_file, "r") as f:
        report = json.load(f)
    
    if report["summary"]["failed"] > 0:
        print(f"❌ Tests have failures: {report['summary']['failed']} failed")
        return False
    
    print(f"✅ All {report['summary']['total_tests']} tests passed")
    return True


def integrate_multi_file_upload_tests():
    """Integrate multi-file upload tests into knowledge_test.py"""
    
    # Check if tests passed
    report_file = "/home/ali/arketic/apps/api/docs/multi_file_upload_test_report.json"
    if not check_test_report(report_file):
        print("⚠️ Cannot integrate tests with failures")
        return False
    
    # Read the new test methods from multi_file_upload_test.py
    new_test_file = "/home/ali/arketic/apps/api/docs/multi_file_upload_test.py"
    main_test_file = "/home/ali/arketic/apps/api/docs/knowledge_test.py"
    
    # Backup main test file
    backup_file = f"{main_test_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(main_test_file, backup_file)
    print(f"📦 Created backup: {backup_file}")
    
    # Read main test file
    with open(main_test_file, "r") as f:
        main_content = f.read()
    
    # Check if multi-file upload tests already integrated
    if "test_multi_file_upload" in main_content:
        print("ℹ️ Multi-file upload tests already integrated")
        return True
    
    # Find the insertion point (before run_all_tests method)
    insertion_marker = "def run_all_tests(self)"
    insertion_index = main_content.find(insertion_marker)
    
    if insertion_index == -1:
        print("❌ Could not find insertion point in main test file")
        return False
    
    # Add the new test methods
    new_methods = '''
    def test_multi_file_upload(self) -> List[TestResult]:
        """Test multi-file upload endpoint"""
        results = []
        
        # Create test files
        test_files = []
        test_dir = "/tmp/test_multi_upload"
        os.makedirs(test_dir, exist_ok=True)
        
        try:
            # Create test files
            txt_file = f"{test_dir}/test.txt"
            with open(txt_file, "w") as f:
                f.write("Test text content for multi-file upload")
            test_files.append(txt_file)
            
            md_file = f"{test_dir}/test.md"
            with open(md_file, "w") as f:
                f.write("# Test Markdown\\n\\nContent for testing")
            test_files.append(md_file)
            
            # Test single file upload
            for file_path in test_files:
                result = self._make_request(
                    endpoint="/knowledge/upload/files",
                    method="POST",
                    files=[("files", (os.path.basename(file_path), open(file_path, "rb"), "application/octet-stream"))],
                    test_type="SINGLE_FILE_UPLOAD"
                )
                results.append(result)
                
                if result.success and result.response_body:
                    for doc in result.response_body.get("documents", []):
                        self.created_resources["documents"].append(doc["id"])
            
            # Test multi-file upload
            files = []
            for file_path in test_files:
                with open(file_path, "rb") as f:
                    content = f.read()
                    files.append(("files", (os.path.basename(file_path), content, "application/octet-stream")))
            
            result = self._make_request(
                endpoint="/knowledge/upload/files",
                method="POST",
                files=files,
                test_type="MULTI_FILE_UPLOAD"
            )
            results.append(result)
            
            if result.success and result.response_body:
                for doc in result.response_body.get("documents", []):
                    self.created_resources["documents"].append(doc["id"])
            
        finally:
            # Cleanup
            import shutil
            if os.path.exists(test_dir):
                shutil.rmtree(test_dir)
        
        return results

'''
    
    # Insert the new methods before run_all_tests
    new_content = main_content[:insertion_index] + new_methods + "\n    " + main_content[insertion_index:]
    
    # Also update run_all_tests to include the new tests
    run_all_marker = "# Knowledge Base Management Tests"
    run_all_index = new_content.find(run_all_marker)
    
    if run_all_index != -1:
        # Find the end of knowledge tests section
        next_section_marker = "# Search and RAG Tests"
        next_index = new_content.find(next_section_marker, run_all_index)
        
        if next_index != -1:
            # Add multi-file upload test call
            new_test_call = '''
        
        # Multi-file Upload Tests
        print("\\n📝 Testing Multi-file Upload...")
        multi_file_results = self.test_multi_file_upload()
        all_results.extend(multi_file_results)
        for result in multi_file_results:
            if result.success:
                print(f"  ✅ {result.test_type}: {result.response_status}")
            else:
                print(f"  ❌ {result.test_type}: {result.error_message}")
'''
            new_content = new_content[:next_index] + new_test_call + "\n        " + new_content[next_index:]
    
    # Write updated content
    with open(main_test_file, "w") as f:
        f.write(new_content)
    
    print(f"✅ Successfully integrated multi-file upload tests into {main_test_file}")
    
    # Archive the standalone test file
    archive_dir = "/home/ali/arketic/apps/api/docs/archived_tests"
    os.makedirs(archive_dir, exist_ok=True)
    archive_file = f"{archive_dir}/multi_file_upload_test_{datetime.now().strftime('%Y%m%d')}.py"
    shutil.move(new_test_file, archive_file)
    print(f"📁 Archived standalone test to: {archive_file}")
    
    return True


def main():
    """Main integration process"""
    print("="*60)
    print("🔧 TEST INTEGRATION TOOL")
    print("="*60)
    print("\nThis tool integrates successfully tested endpoints into main test files.\n")
    
    # Check for available test reports
    test_reports = [
        ("multi_file_upload_test_report.json", integrate_multi_file_upload_tests),
        # Add more test reports and their integration functions here
    ]
    
    for report_file, integration_func in test_reports:
        report_path = f"/home/ali/arketic/apps/api/docs/{report_file}"
        if os.path.exists(report_path):
            print(f"\n📋 Found test report: {report_file}")
            
            with open(report_path, "r") as f:
                report = json.load(f)
            
            print(f"   Test Suite: {report.get('test_suite', 'Unknown')}")
            print(f"   Total Tests: {report['summary']['total_tests']}")
            print(f"   Success Rate: {report['summary']['success_rate']}")
            
            if report["summary"]["failed"] == 0:
                response = input("\n   Integrate these tests? (y/n): ")
                if response.lower() == 'y':
                    if integration_func():
                        print("   ✅ Integration successful!")
                    else:
                        print("   ❌ Integration failed!")
            else:
                print("   ⚠️ Cannot integrate - tests have failures")
    
    print("\n" + "="*60)
    print("Integration process complete!")


if __name__ == "__main__":
    main()