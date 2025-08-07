import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'langchain-microservice',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LangChain microservice running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});