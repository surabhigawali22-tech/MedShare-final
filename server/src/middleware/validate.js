const { z } = require('zod');

/**
 * Express middleware helper for Zod schema validation
 * @param {z.ZodSchema} schema 
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: issues
        });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
  };
}

// Schemas for Auth
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['donor', 'recipient', 'verifier', 'admin'], {
    errorMap: () => ({ message: 'Role must be one of: donor, recipient, verifier, admin' })
  }),
  org_type: z.enum(['individual', 'pharmacy', 'hospital', 'distributor', 'ngo', 'clinic', 'other']).default('individual'),
  phone: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional().default(19.0760),
  lng: z.number().optional().default(72.8777)
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

module.exports = {
  validateBody,
  registerSchema,
  loginSchema
};
