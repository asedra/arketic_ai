#!/usr/bin/env python3
"""
Multi-File Upload Testing Script for Arketic Knowledge Management Service

This script tests the new multi-file upload endpoint (/api/v1/knowledge/upload/files)
including document processing for PDF, TXT, MD, and DOCX formats.

Author: Claude
Created: 2025-01-10
Updated: 2025-01-10 (Multi-file upload endpoint testing)

Note: This is a standalone test file for the new endpoint. After successful testing,
these tests will be integrated into the main knowledge_test.py file.
"""

import json
import requests
import time
import uuid
import os
import base64
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass
class TestResult:
    """Structure for individual test results"""
    endpoint: str
    method: str
    files: Optional[List[str]]
    headers: Dict[str, str]
    response_status: int
    response_body: Optional[Dict[str, Any]]
    response_text: str
    timestamp: str
    duration_ms: float
    success: bool
    error_message: Optional[str]
    test_type: str = "MULTI_FILE_UPLOAD"


class MultiFileUploadTester:
    """Test framework for multi-file upload endpoint"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.api_prefix = "/api/v1"
        self.token = None
        self.test_results: List[TestResult] = []
        self.test_files_dir = "/tmp/test_files"
        self.created_document_ids: List[str] = []
        
    def setup_test_files(self) -> Dict[str, str]:
        """Create test files in different formats"""
        os.makedirs(self.test_files_dir, exist_ok=True)
        
        test_files = {}
        
        # Create TXT file
        txt_path = f"{self.test_files_dir}/test_document.txt"
        with open(txt_path, "w") as f:
            f.write("This is a test document in plain text format.\n")
            f.write("It contains multiple lines for testing.\n")
            f.write("Knowledge base testing with embeddings.")
        test_files["txt"] = txt_path
        
        # Create MD file
        md_path = f"{self.test_files_dir}/test_document.md"
        with open(md_path, "w") as f:
            f.write("# Test Markdown Document\n\n")
            f.write("## Section 1\n")
            f.write("This is a **markdown** document with *formatting*.\n\n")
            f.write("- Bullet point 1\n")
            f.write("- Bullet point 2\n\n")
            f.write("```python\n")
            f.write("def test():\n")
            f.write("    return 'code block'\n")
            f.write("```\n")
        test_files["md"] = md_path
        
        # Create simple HTML file (as fallback test)
        html_path = f"{self.test_files_dir}/test_document.html"
        with open(html_path, "w") as f:
            f.write("<html><body>")
            f.write("<h1>Test HTML Document</h1>")
            f.write("<p>This is a paragraph in HTML.</p>")
            f.write("</body></html>")
        test_files["html"] = html_path
        
        print(f"✅ Created {len(test_files)} test files in {self.test_files_dir}")
        return test_files
    
    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        try:
            response = requests.post(
                f"{self.base_url}{self.api_prefix}/auth/login",
                json={"email": "test@arketic.com", "password": "testpass123"}
            )
            
            if response.status_code == 200:
                self.token = response.json()["access_token"]
                print("✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def test_single_file_upload(self, file_path: str, file_type: str) -> TestResult:
        """Test uploading a single file"""
        start_time = time.time()
        
        try:
            with open(file_path, "rb") as f:
                files = [("files", (os.path.basename(file_path), f, "application/octet-stream"))]
                
                response = requests.post(
                    f"{self.base_url}{self.api_prefix}/knowledge/upload/files",
                    files=files,
                    headers={"Authorization": f"Bearer {self.token}"}
                )
            
            duration_ms = (time.time() - start_time) * 1000
            
            # Handle both single document and array response
            response_body = None
            if response.status_code == 200:
                try:
                    response_body = response.json()
                except:
                    pass
            
            result = TestResult(
                endpoint="/api/v1/knowledge/upload/files",
                method="POST",
                files=[os.path.basename(file_path)],
                headers={"Authorization": "Bearer ***"},
                response_status=response.status_code,
                response_body=response_body,
                response_text=response.text,
                timestamp=datetime.now().isoformat(),
                duration_ms=duration_ms,
                success=response.status_code == 200,
                error_message=None if response.status_code == 200 else None,
                test_type=f"SINGLE_FILE_UPLOAD_{file_type.upper()}"
            )
            
            if result.success and result.response_body:
                # Handle both array and single document response
                if isinstance(result.response_body, list):
                    for doc in result.response_body:
                        if doc.get("document_id"):
                            self.created_document_ids.append(doc["document_id"])
                elif result.response_body.get("documents"):
                    for doc in result.response_body["documents"]:
                        self.created_document_ids.append(doc["id"])
                elif result.response_body.get("document_id"):
                    self.created_document_ids.append(result.response_body["document_id"])
            
            return result
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return TestResult(
                endpoint="/api/v1/knowledge/upload/files",
                method="POST",
                files=[os.path.basename(file_path)],
                headers={"Authorization": "Bearer ***"},
                response_status=0,
                response_body=None,
                response_text=str(e),
                timestamp=datetime.now().isoformat(),
                duration_ms=duration_ms,
                success=False,
                error_message=str(e),
                test_type=f"SINGLE_FILE_UPLOAD_{file_type.upper()}"
            )
    
    def test_multi_file_upload(self, file_paths: List[str]) -> TestResult:
        """Test uploading multiple files at once"""
        start_time = time.time()
        
        try:
            files = []
            for file_path in file_paths:
                with open(file_path, "rb") as f:
                    content = f.read()
                    files.append(("files", (os.path.basename(file_path), content, "application/octet-stream")))
            
            response = requests.post(
                f"{self.base_url}{self.api_prefix}/knowledge/upload/files",
                files=files,
                headers={"Authorization": f"Bearer {self.token}"}
            )
            
            duration_ms = (time.time() - start_time) * 1000
            
            # Handle both single document and array response
            response_body = None
            if response.status_code == 200:
                try:
                    response_body = response.json()
                except:
                    pass
            
            result = TestResult(
                endpoint="/api/v1/knowledge/upload/files",
                method="POST",
                files=[os.path.basename(fp) for fp in file_paths],
                headers={"Authorization": "Bearer ***"},
                response_status=response.status_code,
                response_body=response_body,
                response_text=response.text,
                timestamp=datetime.now().isoformat(),
                duration_ms=duration_ms,
                success=response.status_code == 200,
                error_message=None if response.status_code == 200 else None,
                test_type="MULTI_FILE_UPLOAD"
            )
            
            if result.success and result.response_body:
                # Handle both array and single document response
                if isinstance(result.response_body, list):
                    for doc in result.response_body:
                        if doc.get("document_id"):
                            self.created_document_ids.append(doc["document_id"])
                elif result.response_body.get("documents"):
                    for doc in result.response_body["documents"]:
                        self.created_document_ids.append(doc["id"])
                elif result.response_body.get("document_id"):
                    self.created_document_ids.append(result.response_body["document_id"])
            
            return result
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return TestResult(
                endpoint="/api/v1/knowledge/upload/files",
                method="POST",
                files=[os.path.basename(fp) for fp in file_paths],
                headers={"Authorization": "Bearer ***"},
                response_status=0,
                response_body=None,
                response_text=str(e),
                timestamp=datetime.now().isoformat(),
                duration_ms=duration_ms,
                success=False,
                error_message=str(e),
                test_type="MULTI_FILE_UPLOAD"
            )
    
    def test_search_uploaded_content(self, query: str) -> TestResult:
        """Test searching in uploaded documents"""
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.base_url}{self.api_prefix}/knowledge/search",
                json={"query": query, "limit": 5},
                headers={"Authorization": f"Bearer {self.token}"}
            )
            
            duration_ms = (time.time() - start_time) * 1000
            
            result = TestResult(
                endpoint="/api/v1/knowledge/search",
                method="POST",
                files=None,
                headers={"Authorization": "Bearer ***"},
                response_status=response.status_code,
                response_body=response.json() if response.status_code == 200 else None,
                response_text=response.text,
                timestamp=datetime.now().isoformat(),
                duration_ms=duration_ms,
                success=response.status_code == 200,
                error_message=None if response.status_code == 200 else response.text,
                test_type="SEARCH_AFTER_UPLOAD"
            )
            
            return result
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return TestResult(
                endpoint="/api/v1/knowledge/search",
                method="POST",
                files=None,
                headers={"Authorization": "Bearer ***"},
                response_status=0,
                response_body=None,
                response_text=str(e),
                timestamp=datetime.now().isoformat(),
                duration_ms=duration_ms,
                success=False,
                error_message=str(e),
                test_type="SEARCH_AFTER_UPLOAD"
            )
    
    def cleanup_test_documents(self):
        """Delete all created test documents"""
        for doc_id in self.created_document_ids:
            try:
                response = requests.delete(
                    f"{self.base_url}{self.api_prefix}/knowledge/documents/{doc_id}",
                    headers={"Authorization": f"Bearer {self.token}"}
                )
                if response.status_code == 200:
                    print(f"✅ Deleted test document: {doc_id}")
                else:
                    print(f"⚠️ Failed to delete document {doc_id}: {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting document {doc_id}: {str(e)}")
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive test suite"""
        print("\n" + "="*60)
        print("🧪 MULTI-FILE UPLOAD TEST SUITE")
        print("="*60)
        
        # Setup
        if not self.authenticate():
            return {"error": "Authentication failed"}
        
        test_files = self.setup_test_files()
        
        # Test 1: Single file uploads
        print("\n📝 Test 1: Single File Uploads")
        print("-" * 40)
        
        for file_type, file_path in test_files.items():
            print(f"\n  Testing {file_type.upper()} file upload...")
            result = self.test_single_file_upload(file_path, file_type)
            self.test_results.append(result)
            
            if result.success:
                print(f"  ✅ {file_type.upper()} upload successful")
                if result.response_body:
                    # Handle both array and single document response
                    if isinstance(result.response_body, list):
                        for doc in result.response_body:
                            print(f"     - Document ID: {doc.get('document_id', 'Unknown')}")
                            print(f"     - Chunks: {doc.get('chunk_count', 0)}")
                    elif result.response_body.get("documents"):
                        docs = result.response_body["documents"]
                        for doc in docs:
                            print(f"     - Document ID: {doc['id']}")
                            print(f"     - Chunks: {doc.get('chunk_count', 0)}")
            else:
                print(f"  ❌ {file_type.upper()} upload failed: {result.error_message}")
        
        # Test 2: Multi-file upload
        print("\n📝 Test 2: Multi-File Upload (All at Once)")
        print("-" * 40)
        
        all_files = list(test_files.values())
        print(f"\n  Uploading {len(all_files)} files simultaneously...")
        result = self.test_multi_file_upload(all_files)
        self.test_results.append(result)
        
        if result.success:
            print(f"  ✅ Multi-file upload successful")
            if result.response_body:
                # Handle both array and single document response  
                if isinstance(result.response_body, list):
                    print(f"  📊 Uploaded {len(result.response_body)} documents:")
                    for doc in result.response_body:
                        filename = doc.get('file_info', {}).get('filename', 'Unknown')
                        print(f"     - {filename}: {doc.get('chunk_count', 0)} chunks")
                elif result.response_body.get("documents"):
                    docs = result.response_body["documents"]
                    print(f"  📊 Uploaded {len(docs)} documents:")
                    for doc in docs:
                        print(f"     - {doc['filename']}: {doc.get('chunk_count', 0)} chunks")
        else:
            print(f"  ❌ Multi-file upload failed: {result.error_message}")
        
        # Test 3: Search uploaded content
        print("\n📝 Test 3: Search Uploaded Content")
        print("-" * 40)
        
        search_queries = [
            "test document",
            "markdown formatting",
            "knowledge base"
        ]
        
        for query in search_queries:
            print(f"\n  Searching for: '{query}'...")
            result = self.test_search_uploaded_content(query)
            self.test_results.append(result)
            
            if result.success:
                results = result.response_body.get("results", [])
                print(f"  ✅ Found {len(results)} results")
                for idx, res in enumerate(results[:2], 1):
                    print(f"     {idx}. Score: {res.get('similarity_score', 0):.3f}")
            else:
                print(f"  ❌ Search failed: {result.error_message}")
        
        # Generate report
        report = self.generate_report()
        
        # Cleanup
        print("\n🧹 Cleaning up test documents...")
        self.cleanup_test_documents()
        
        # Clean up test files
        import shutil
        if os.path.exists(self.test_files_dir):
            shutil.rmtree(self.test_files_dir)
            print("✅ Test files cleaned up")
        
        return report
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        successful_tests = sum(1 for r in self.test_results if r.success)
        failed_tests = total_tests - successful_tests
        
        avg_duration = sum(r.duration_ms for r in self.test_results) / total_tests if total_tests > 0 else 0
        
        test_summary_by_type = {}
        for result in self.test_results:
            test_type = result.test_type
            if test_type not in test_summary_by_type:
                test_summary_by_type[test_type] = {"total": 0, "success": 0, "failed": 0}
            
            test_summary_by_type[test_type]["total"] += 1
            if result.success:
                test_summary_by_type[test_type]["success"] += 1
            else:
                test_summary_by_type[test_type]["failed"] += 1
        
        report = {
            "test_suite": "Multi-File Upload Tests",
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "successful": successful_tests,
                "failed": failed_tests,
                "success_rate": f"{(successful_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%",
                "average_duration_ms": round(avg_duration, 2)
            },
            "test_types": test_summary_by_type,
            "detailed_results": [asdict(r) for r in self.test_results]
        }
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Successful: {successful_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {report['summary']['success_rate']}")
        print(f"Average Duration: {avg_duration:.2f}ms")
        
        print("\n📋 Test Types:")
        for test_type, stats in test_summary_by_type.items():
            print(f"  {test_type}:")
            print(f"    - Total: {stats['total']}")
            print(f"    - Success: {stats['success']}")
            print(f"    - Failed: {stats['failed']}")
        
        return report


def main():
    """Main test execution"""
    tester = MultiFileUploadTester()
    
    # Run tests
    report = tester.run_all_tests()
    
    # Save report
    report_file = "multi_file_upload_test_report.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Test report saved to: {report_file}")
    
    # Determine if tests should be added to main suite
    if report["summary"]["failed"] == 0:
        print("\n✅ All tests passed! These tests are ready to be integrated into knowledge_test.py")
        print("   Run: python3 /home/ali/arketic_ai/apps/api/docs/integrate_tests.py")
    else:
        print("\n⚠️ Some tests failed. Please fix the issues before integrating into main test suite.")
    
    return 0 if report["summary"]["failed"] == 0 else 1


if __name__ == "__main__":
    exit(main())