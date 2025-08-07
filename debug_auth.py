#!/usr/bin/env python3
"""
Debug authentication issues
"""

import sys
import os
sys.path.insert(0, '/home/ali/arketic/apps/api')

async def debug_auth():
    """Debug authentication system"""
    from core.config import settings
    from core.security import SecurityManager
    
    print("🔍 Debugging Authentication System")
    print("=" * 50)
    
    # Check settings
    print(f"SECRET_KEY length: {len(settings.SECRET_KEY)}")
    print(f"JWT_ALGORITHM: {settings.JWT_ALGORITHM}")
    print(f"JWT_EXPIRE_MINUTES: {settings.JWT_EXPIRE_MINUTES}")
    
    # Test token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGFya2V0aWMuY29tIiwidXNlcl9pZCI6IjQyYzlhNjg4LWUyNGEtNGNkNi1iNWUyLTRlNzdmMTg5NGE2YiIsImVtYWlsIjoidGVzdEBhcmtldGljLmNvbSIsInVzZXJuYW1lIjpudWxsLCJyb2xlcyI6WyJ1c2VyIl0sInBlcm1pc3Npb25zIjpbInJlYWQiLCJ3cml0ZSIsInByb2ZpbGU6dXBkYXRlIiwicHJlZmVyZW5jZXM6dXBkYXRlIl0sImV4cCI6MTc1NDQ5ODgwOH0.oCE8kE4iropHegoLeeT5rDilRDq_lDgoksSz99nT5yA"
    
    try:
        security_manager = SecurityManager()
        print("✅ SecurityManager created successfully")
        
        # Try to verify token
        print("🔍 Trying to verify token...")
        token_data = security_manager.verify_token(token)
        print(f"✅ Token verified successfully: {token_data}")
        
    except Exception as e:
        print(f"❌ Token verification failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Now test if the global security manager is initialized
    try:
        from core.dependencies import security_manager as global_sm
        print(f"🔍 Global security manager status: {global_sm is not None}")
        
        if global_sm is None:
            print("❌ Global security manager is None!")
            
            # Try to initialize it manually
            from core.dependencies import initialize_dependencies
            sm = SecurityManager()
            await sm.initialize()
            initialize_dependencies(sm)
            
            from core.dependencies import security_manager as updated_sm
            print(f"🔧 After manual initialization: {updated_sm is not None}")
            
    except Exception as e:
        print(f"❌ Global security manager check failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    asyncio.run(debug_auth())