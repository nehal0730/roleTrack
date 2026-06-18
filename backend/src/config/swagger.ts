import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Manager API',
      version: '1.0.0',
      description: 'Role-Based Project & Task Management System',
    },
    servers: [{ url: 'http://localhost:5000/api', description: 'Development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        LoginRequest:  { type: 'object', required: ['email','password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } },
        LoginResponse: { type: 'object', properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' }, user: { type: 'object' } } },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, name: { type: 'string' },
            description: { type: 'string' }, start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['planning','active','completed','archived'] },
            manager_id: { type: 'integer' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, title: { type: 'string' },
            description: { type: 'string' }, project_id: { type: 'integer' },
            priority: { type: 'string', enum: ['low','medium','high','critical'] },
            status:   { type: 'string', enum: ['todo','in_progress','in_review','completed','blocked'] },
            deadline: { type: 'string', format: 'date-time' },
            assigned_to: { type: 'integer' }, estimated_hours: { type: 'number' },
          },
        },
        WorkLog: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, task_id: { type: 'integer' },
            description: { type: 'string' }, hours_worked: { type: 'number' },
            attachment_url: { type: 'string' },
          },
        },
        Error: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);