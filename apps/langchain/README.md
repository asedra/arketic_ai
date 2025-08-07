# LangChain Microservice

LangChain microservice for the Arketic AI platform, providing advanced language model capabilities through a RESTful API and WebSocket connections.

## Features

- 🤖 Multiple LLM providers (OpenAI, Anthropic, HuggingFace)
- 💬 Real-time chat with WebSocket support
- 🔄 Streaming responses
- 💾 Conversation memory and persistence
- 🔍 Vector embeddings and semantic search
- ⛓️ LangChain chains and workflows
- 🔐 JWT authentication
- 📊 Redis caching
- 🗄️ PostgreSQL database
- 📝 Comprehensive logging
- 🚦 Rate limiting
- 🏥 Health checks

## Directory Structure

```
apps/langchain/
├── src/
│   ├── index.js          # Main Express server
│   ├── config/           # Configuration files
│   ├── services/         # Core services (LangChain, Redis, DB, Socket)
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   └── utils/            # Utility functions
├── tests/                # Test files
├── package.json          # Dependencies
├── .env.example          # Environment variables template
├── .eslintrc.js          # ESLint configuration
└── README.md             # This file
```

## Installation

1. Navigate to the langchain directory:
```bash
cd apps/langchain
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`

## Configuration

### Required Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key
- `JWT_SECRET` - Secret key for JWT authentication
- `DB_*` - PostgreSQL connection details
- `REDIS_*` - Redis connection details

### Optional Environment Variables

- `ANTHROPIC_API_KEY` - For Anthropic Claude models
- `HUGGINGFACE_API_KEY` - For HuggingFace models
- `PINECONE_*` - For Pinecone vector store
- `CHROMA_URL` - For Chroma vector store

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Docker Mode
The service runs in Docker container on **port 3001** by default.

```bash
docker-compose up arketic-langchain
```

**Note:** The LangChain service is configured to run on **port 3001** in the Docker environment.

## API Endpoints

### Health Check
- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed health check with all services
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Chat API
- `POST /api/v1/chat` - Send a chat message
- `GET /api/v1/chat/conversations` - List conversations
- `GET /api/v1/chat/conversations/:id` - Get conversation details
- `DELETE /api/v1/chat/conversations/:id` - Delete conversation

### Completion API
- `POST /api/v1/completion` - Generate text completion
- `POST /api/v1/completion/template` - Generate with template
- `POST /api/v1/completion/stream` - Stream completion (SSE)

### Embedding API
- `POST /api/v1/embedding/generate` - Generate embeddings
- `POST /api/v1/embedding/search` - Semantic search
- `GET /api/v1/embedding/stats` - Embedding statistics
- `DELETE /api/v1/embedding/:id` - Delete embedding

### Chain API
- `POST /api/v1/chain/execute` - Execute LangChain chain
- `POST /api/v1/chain/clear-memory` - Clear chain memory
- `GET /api/v1/chain/memory-status` - Get memory status

## WebSocket Events

### Client Events
- `chat:message` - Send chat message
- `chat:stream` - Request streaming chat
- `chain:execute` - Execute chain

### Server Events
- `chat:response` - Chat response
- `chat:processing` - Processing status
- `chat:error` - Error message
- `stream:start` - Stream started
- `stream:chunk` - Stream chunk
- `stream:end` - Stream completed
- `chain:response` - Chain response

## Authentication

All API endpoints (except health checks) require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Linting

Run ESLint:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

## Format Code

```bash
npm run format
```

## Deployment

The service can be deployed using Docker:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Integration with Main Application

This microservice integrates with the main Arketic application:

1. **API Service** (Python/FastAPI) - Handles authentication and user management
2. **Web Application** (Next.js) - Frontend that consumes this service
3. **Redis** - Shared cache and session storage
4. **PostgreSQL** - Shared database for persistence

## Performance Considerations

- Responses are cached in Redis for 1 hour by default
- Database connections are pooled (max 20 connections)
- Rate limiting: 100 requests per 15 minutes per user
- Streaming responses for large completions
- WebSocket for real-time communication

## Security

- JWT authentication required for all endpoints
- Rate limiting to prevent abuse
- Input validation with Joi
- SQL injection prevention with parameterized queries
- XSS protection with Helmet
- CORS configuration

## Monitoring

- Structured logging with Winston
- Health check endpoints for monitoring
- Memory usage tracking
- Request latency measurement
- Error tracking and reporting

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Run linting and tests before committing

## License

MIT

## Support

For issues and questions, please contact the Arketic development team.