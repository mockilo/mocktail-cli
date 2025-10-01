const Joi = require('joi');

const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(0).max(120).optional(),
  posts: Joi.array().items(Joi.string()).optional()
});

const postSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().optional(),
  authorId: Joi.string().required(),
  published: Joi.boolean().default(false),
  createdAt: Joi.date().default(Date.now)
});

module.exports = { userSchema, postSchema };
