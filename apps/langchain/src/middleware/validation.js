import Joi from 'joi';

export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors
      });
    }
    
    req[property] = value;
    next();
  };
};

export const schemas = {
  auth: {
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required()
    }),
    
    register: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }),
      username: Joi.string().alphanum().min(3).max(30).optional(),
      roles: Joi.array().items(Joi.string()).optional()
    }),
    
    refreshToken: Joi.object({
      refreshToken: Joi.string().required()
    })
  },
  
  langchain: {
    chat: Joi.object({
      message: Joi.string().min(1).max(5000).required(),
      sessionId: Joi.string().uuid().optional(),
      model: Joi.string().valid('gpt-4', 'gpt-3.5-turbo', 'claude-3', 'llama-2').optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      maxTokens: Joi.number().min(1).max(4000).optional(),
      context: Joi.object().optional()
    }),
    
    embedding: Joi.object({
      text: Joi.string().min(1).max(10000).required(),
      model: Joi.string().valid('text-embedding-ada-002', 'text-embedding-3-small').optional()
    }),
    
    completion: Joi.object({
      prompt: Joi.string().min(1).max(5000).required(),
      model: Joi.string().valid('gpt-4', 'gpt-3.5-turbo', 'claude-3').optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      maxTokens: Joi.number().min(1).max(4000).optional(),
      topP: Joi.number().min(0).max(1).optional(),
      frequencyPenalty: Joi.number().min(-2).max(2).optional(),
      presencePenalty: Joi.number().min(-2).max(2).optional(),
      stop: Joi.array().items(Joi.string()).max(4).optional()
    }),
    
    chain: Joi.object({
      chainType: Joi.string().valid('qa', 'summarization', 'map_reduce', 'refine').required(),
      documents: Joi.array().items(Joi.object({
        content: Joi.string().required(),
        metadata: Joi.object().optional()
      })).min(1).required(),
      query: Joi.string().when('chainType', {
        is: 'qa',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      options: Joi.object().optional()
    })
  },
  
  common: {
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sort: Joi.string().optional(),
      order: Joi.string().valid('asc', 'desc').default('asc')
    }),
    
    id: Joi.object({
      id: Joi.string().uuid().required()
    }),
    
    search: Joi.object({
      query: Joi.string().min(1).max(100).required(),
      filters: Joi.object().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    })
  }
};

export const validateHeaders = (requiredHeaders = []) => {
  return (req, res, next) => {
    const missingHeaders = requiredHeaders.filter(header => !req.headers[header.toLowerCase()]);
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        error: 'Missing required headers',
        code: 'MISSING_HEADERS',
        headers: missingHeaders
      });
    }
    
    next();
  };
};

export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = obj[key].trim();
        sanitized[key] = sanitized[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized[key] = sanitized[key].replace(/javascript:/gi, '');
        sanitized[key] = sanitized[key].replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitize(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    
    return sanitized;
  };
  
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  
  next();
};