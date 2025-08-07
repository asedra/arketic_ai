# 🚀 Arketic Platform Demo

Complete demonstration of the Arketic AI-powered enterprise platform, showcasing integrated People Management, AI Services, Vector Search, Document Processing, and Settings Management.

## 🌟 Features Demonstrated

### 👥 People Management
- **Complete CRUD Operations**: Create, read, update, delete organization members
- **User Account Creation**: Generate login accounts for people
- **Advanced Filtering**: Search by name, department, role, status
- **Role Management**: Assign roles and permissions
- **Organizational Hierarchy**: Manager-subordinate relationships

### 🤖 AI Services  
- **OpenAI Integration**: Chat completions with multiple models (GPT-3.5, GPT-4)
- **Streaming Responses**: Real-time streaming chat completions
- **Cost Tracking**: Automatic usage logging and cost estimation
- **Model Selection**: Support for different OpenAI models
- **Configuration Management**: API key and parameter settings

### 🔍 Vector Search
- **Text Embeddings**: Generate embeddings using OpenAI's embedding models
- **Document Ingestion**: Process and store documents for semantic search
- **Similarity Search**: Find semantically similar content
- **Collection Management**: Organize documents into collections
- **Metadata Support**: Store and search document metadata

### 📄 Document Processing
- **Multi-Format Support**: PDF, DOCX, TXT, HTML, CSV files
- **Text Extraction**: Extract text content from various document formats
- **AI Analysis**: Automated analysis including:
  - Document summarization
  - Keyword extraction
  - Sentiment analysis
  - Topic identification
  - Named entity recognition
  - Language detection
  - Readability assessment

### ⚙️ Settings Management
- **OpenAI Configuration**: API key management and validation
- **Model Parameters**: Temperature, max tokens, model selection
- **Platform Preferences**: Theme, language, notifications
- **Secure Storage**: Encrypted settings with masked display

### 🔒 Authentication & Security
- **JWT Authentication**: Token-based authentication system
- **Role-Based Access**: Different permission levels
- **Audit Logging**: Track user actions and API usage
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Graceful error responses

## 🚀 Quick Start

### 1. Installation & Setup

```bash
# Clone or navigate to the backend directory
cd /home/ali/arketic/arketic_mockup/backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Check requirements
python run_demo.py check
```

### 2. Start the Demo

```bash
# Start the web server (recommended)
python run_demo.py server

# Or use the interactive CLI demo
python run_demo.py cli

# Or run all tests
python run_demo.py test
```

### 3. Access the Demo

Once the server is running, visit:

- **🌐 Web Interface**: http://localhost:8000
- **🖥️ Interactive Demo**: http://localhost:8000/demo
- **📚 API Documentation**: http://localhost:8000/api/docs
- **❤️ Health Check**: http://localhost:8000/health

## 🖥️ Demo Interfaces

### Web Interface
The web interface provides:
- **Interactive API Testing**: Test all endpoints directly in the browser
- **Settings Configuration**: Configure OpenAI API key and parameters
- **Real-time Results**: See API responses in real-time
- **Multi-tab Interface**: Organized by feature category

### CLI Demo
The command-line interface offers:
- **Interactive Menu**: Choose which features to test
- **Automated Testing**: Run all demos with `--all` flag
- **Detailed Output**: Color-coded results and JSON responses
- **Progress Tracking**: Real-time status updates

### API Documentation
FastAPI auto-generated documentation with:
- **Interactive Swagger UI**: Test endpoints directly
- **Request/Response Schemas**: Detailed API specifications
- **Authentication Testing**: JWT token support
- **Real-time Validation**: Input validation feedback

## 🧪 Testing

### Comprehensive Test Suite
```bash
# Run the full integration test suite
python run_demo.py test

# Or run directly
python integration_test_suite.py
```

The test suite covers:
- **Health Checks**: Server and component status
- **API Endpoints**: All REST endpoints
- **Error Handling**: Invalid inputs and edge cases
- **Performance**: Response times and throughput
- **Integration**: Component interaction testing
- **Data Flow**: End-to-end workflows

### Test Categories
1. **Health Check**: Server availability and status
2. **Settings API**: Configuration management
3. **AI Services**: Chat completion and cost estimation
4. **Vector Search**: Embeddings and similarity search
5. **Document Processing**: Upload, extraction, and analysis
6. **People Management**: CRUD operations and authentication
7. **API Integration**: Concurrent requests and data flow
8. **Error Handling**: Validation and error responses
9. **Performance**: Response times and resource usage

## 📊 Usage Examples

### Configure OpenAI Settings
```bash
curl -X POST "http://localhost:8000/api/v1/settings/openai" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-your-openai-api-key-here",
    "model": "gpt-3.5-turbo",
    "max_tokens": 1000,
    "temperature": 0.7
  }'
```

### Chat with AI
```bash
curl -X POST "http://localhost:8000/api/v1/ai/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explain the benefits of AI automation"}
    ]
  }'
```

### Upload and Analyze Document
```bash
# Upload document
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -F "file=@document.pdf" \
  -F "extract_text=true"

# Analyze document (use document_id from upload response)
curl -X POST "http://localhost:8000/api/v1/documents/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "abc123_1234567890",
    "analysis_types": ["summary", "keywords", "sentiment"]
  }'
```

### Vector Search
```bash
# Ingest documents
curl -X POST "http://localhost:8000/api/v1/vector/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "content": "AI automation improves efficiency...",
        "metadata": {"title": "AI Benefits", "category": "tech"}
      }
    ],
    "collection": "knowledge-base"
  }'

# Search for similar content
curl -X POST "http://localhost:8000/api/v1/vector/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence benefits",
    "collection": "knowledge-base",
    "limit": 5
  }'
```

## 🛠️ Configuration

### OpenAI API Key
For full functionality, configure a valid OpenAI API key:

1. **Via Web Interface**: Visit http://localhost:8000/demo → Settings tab
2. **Via API**: Use the `/api/v1/settings/openai` endpoint
3. **Environment Variable**: Set `OPENAI_API_KEY` environment variable

### Database
The demo uses SQLite by default:
- **Database File**: `arketic_demo.db`
- **Vector Store**: `vector_store.db`
- **Document Storage**: `document_storage/` directory

### Environment Variables
```bash
export SECRET_KEY="your-secret-key-here"
export DATABASE_URL="sqlite:///./arketic_demo.db"
export ENVIRONMENT="development"
export DEBUG="true"
export OPENAI_API_KEY="sk-your-key-here"  # Optional
```

## 📁 File Structure

```
backend/
├── demo_server.py              # Unified demo server
├── demo_cli.py                 # Interactive CLI demo
├── integration_test_suite.py   # Comprehensive test suite
├── run_demo.py                 # Easy startup script
├── settings_api.py             # Settings management
├── routers/
│   ├── people.py              # People management API
│   ├── ai_assistant.py        # AI chat completion
│   ├── vector_search.py       # Vector embeddings & search
│   ├── document_processing.py # Document upload & analysis
│   ├── auth.py                # Authentication
│   └── health.py              # Health monitoring
├── models/                    # Database models
├── core/                      # Core functionality
├── middleware/                # Request middleware
└── tests/                     # Test files
```

## 🔧 Troubleshooting

### Common Issues

**Server won't start:**
- Check if port 8000 is available
- Verify all dependencies are installed
- Check for Python version compatibility (3.8+)

**OpenAI API errors:**
- Verify API key is valid and has credits
- Check API key format (starts with 'sk-')
- Ensure proper model permissions

**Database errors:**
- Delete database files to reset: `arketic_demo.db`, `vector_store.db`
- Check file permissions in the backend directory
- Verify SQLite is available

**Import errors:**
- Install missing packages: `pip install -r requirements.txt`
- Check Python path configuration
- Verify virtual environment activation

### Performance Optimization

**For better performance:**
- Use SSD storage for database files
- Increase available RAM for vector operations
- Configure proper OpenAI rate limits
- Enable request caching for repeated queries

### Security Considerations

**For production use:**
- Change default SECRET_KEY
- Use environment variables for sensitive data
- Enable HTTPS/TLS encryption
- Implement proper authentication
- Configure CORS origins appropriately
- Set up proper logging and monitoring

## 📈 Monitoring & Logging

### Usage Tracking
The demo automatically logs:
- **API Usage**: Token consumption and costs in `api_usage.log`
- **Request Logs**: HTTP requests and responses
- **Error Logs**: Detailed error information
- **Performance Metrics**: Response times and resource usage

### Health Monitoring
Monitor system health via:
- **Health Endpoint**: `/health` for basic status
- **Component Status**: Individual service health checks
- **Integration Tests**: Automated testing results
- **Performance Metrics**: Response time monitoring

## 🚧 Development & Extension

### Adding New Features
1. Create new router in `routers/` directory
2. Add route to `demo_server.py`
3. Update test suite in `integration_test_suite.py`
4. Add CLI demo functionality to `demo_cli.py`
5. Update documentation

### Database Changes
1. Update models in `models/` directory
2. Create Alembic migration if needed
3. Update test data and fixtures
4. Test with fresh database

### API Extensions
1. Follow FastAPI patterns for new endpoints
2. Add proper request/response models
3. Include authentication where needed
4. Add comprehensive error handling
5. Update API documentation

## 📞 Support & Resources

### Documentation
- **FastAPI**: https://fastapi.tiangolo.com/
- **OpenAI API**: https://platform.openai.com/docs
- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **Pydantic**: https://pydantic-docs.helpmanual.io/

### Getting Help
- Check the API documentation at `/api/docs`
- Review test results for component status
- Check log files for detailed error information
- Use the CLI demo for interactive testing

## 🎯 Next Steps

### Enhancements to Consider
1. **Real-time Features**: WebSocket support for live updates
2. **Advanced Analytics**: Usage dashboards and insights
3. **Multi-tenant Support**: Organization isolation
4. **Enhanced Security**: OAuth, 2FA, audit trails
5. **Scalability**: Redis caching, database optimization
6. **Mobile Support**: React Native or Progressive Web App
7. **Integration**: Third-party service connectors

### Production Deployment
1. **Container Setup**: Docker and Kubernetes configurations
2. **Load Balancing**: Multiple server instances
3. **Database Migration**: PostgreSQL or MySQL
4. **Monitoring**: Prometheus, Grafana integration
5. **CI/CD Pipeline**: Automated testing and deployment
6. **Security Hardening**: WAF, rate limiting, monitoring

---

## 🎉 Conclusion

This demo showcases the full capabilities of the Arketic platform, demonstrating how AI services, document processing, people management, and vector search can work together to create a powerful enterprise solution.

The modular architecture allows for easy extension and customization, while the comprehensive test suite ensures reliability and maintainability.

**Happy exploring! 🚀**