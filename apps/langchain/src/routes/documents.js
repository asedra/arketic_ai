import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import DocumentProcessor from '../services/knowledge/documentProcessor.js';
import logger from '../utils/logger.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/octet-stream'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|txt|md)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported formats: PDF, DOCX, TXT, MD'));
    }
  }
});

const documentProcessor = new DocumentProcessor();

const processingJobs = new Map();

const processDocumentSchema = Joi.object({
  content: Joi.string().when('file', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  fileType: Joi.string().valid('pdf', 'docx', 'markdown', 'text').optional(),
  chunkingStrategy: Joi.string().valid('fixed-size', 'semantic', 'recursive').default('recursive'),
  chunkSize: Joi.number().min(100).max(5000).default(1000),
  chunkOverlap: Joi.number().min(0).max(500).default(200),
  generateEmbeddings: Joi.boolean().default(true),
  extractMetadata: Joi.boolean().default(true)
});

router.post('/process', upload.single('file'), async (req, res) => {
  try {
    const validation = processDocumentSchema.validate(req.body);
    if (validation.error) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.details
      });
    }
    
    const options = validation.value;
    const jobId = uuidv4();
    
    let input;
    let filename;
    
    if (req.file) {
      input = req.file.buffer;
      filename = req.file.originalname;
    } else if (options.content) {
      input = options.content;
      filename = 'text-input.txt';
    } else {
      return res.status(400).json({
        error: 'No file or content provided'
      });
    }
    
    processingJobs.set(jobId, {
      status: 'processing',
      startTime: Date.now(),
      filename
    });
    
    res.json({
      jobId,
      status: 'processing',
      message: 'Document processing started'
    });
    
    documentProcessor.processDocument(input, {
      ...options,
      documentId: jobId,
      filename
    }).then(result => {
      processingJobs.set(jobId, {
        status: 'completed',
        result,
        completedAt: Date.now()
      });
      
      logger.info(`Document processing completed: ${jobId}`);
    }).catch(error => {
      processingJobs.set(jobId, {
        status: 'failed',
        error: error.message,
        failedAt: Date.now()
      });
      
      logger.error(`Document processing failed: ${jobId}`, error);
    });
    
  } catch (error) {
    logger.error('Document processing error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.post('/process-batch', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files provided'
      });
    }
    
    const options = {
      chunkingStrategy: req.body.chunkingStrategy || 'recursive',
      generateEmbeddings: req.body.generateEmbeddings !== 'false',
      extractMetadata: req.body.extractMetadata !== 'false'
    };
    
    const documents = req.files.map(file => ({
      content: file.buffer,
      filename: file.originalname,
      id: uuidv4()
    }));
    
    const batchId = uuidv4();
    
    processingJobs.set(batchId, {
      status: 'processing',
      totalDocuments: documents.length,
      startTime: Date.now()
    });
    
    res.json({
      batchId,
      status: 'processing',
      totalDocuments: documents.length,
      message: 'Batch processing started'
    });
    
    documentProcessor.processMultipleDocuments(documents, options)
      .then(result => {
        processingJobs.set(batchId, {
          status: 'completed',
          result,
          completedAt: Date.now()
        });
        
        logger.info(`Batch processing completed: ${batchId}`);
      })
      .catch(error => {
        processingJobs.set(batchId, {
          status: 'failed',
          error: error.message,
          failedAt: Date.now()
        });
        
        logger.error(`Batch processing failed: ${batchId}`, error);
      });
    
  } catch (error) {
    logger.error('Batch processing error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = processingJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({
      error: 'Job not found'
    });
  }
  
  if (job.status === 'completed') {
    res.json({
      jobId,
      status: job.status,
      result: job.result,
      processingTime: job.completedAt - (job.startTime || job.completedAt)
    });
  } else if (job.status === 'failed') {
    res.status(500).json({
      jobId,
      status: job.status,
      error: job.error,
      processingTime: job.failedAt - (job.startTime || job.failedAt)
    });
  } else {
    res.json({
      jobId,
      status: job.status,
      filename: job.filename,
      elapsedTime: Date.now() - job.startTime
    });
  }
});

router.get('/chunks/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const job = processingJobs.get(documentId);
    
    if (!job || job.status !== 'completed') {
      return res.status(404).json({
        error: 'Document not found or still processing'
      });
    }
    
    const chunks = job.result.chunks || [];
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    
    res.json({
      documentId,
      chunks: chunks.slice(startIndex, endIndex),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: chunks.length,
        totalPages: Math.ceil(chunks.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching chunks:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    let input;
    let filename;
    
    if (req.file) {
      input = req.file.buffer;
      filename = req.file.originalname;
    } else if (req.body.content) {
      input = req.body.content;
      filename = 'text-input.txt';
    } else {
      return res.status(400).json({
        error: 'No file or content provided'
      });
    }
    
    const validationResult = await documentProcessor.validateDocument(input, { filename });
    
    res.json(validationResult);
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

router.get('/metrics', (req, res) => {
  const metrics = documentProcessor.getMetrics();
  
  const jobMetrics = {
    totalJobs: processingJobs.size,
    processing: 0,
    completed: 0,
    failed: 0
  };
  
  for (const job of processingJobs.values()) {
    jobMetrics[job.status]++;
  }
  
  res.json({
    ...metrics,
    jobs: jobMetrics
  });
});

router.delete('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  if (processingJobs.has(jobId)) {
    processingJobs.delete(jobId);
    res.json({
      message: 'Job deleted successfully'
    });
  } else {
    res.status(404).json({
      error: 'Job not found'
    });
  }
});

router.delete('/jobs', (req, res) => {
  const { status } = req.query;
  let deleted = 0;
  
  if (status) {
    for (const [jobId, job] of processingJobs.entries()) {
      if (job.status === status) {
        processingJobs.delete(jobId);
        deleted++;
      }
    }
  } else {
    deleted = processingJobs.size;
    processingJobs.clear();
  }
  
  res.json({
    message: `${deleted} jobs deleted`
  });
});

export default router;