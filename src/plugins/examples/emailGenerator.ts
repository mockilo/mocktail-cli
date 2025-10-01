import { Plugin, CustomGenerator, GenerationContext } from '../pluginManager';

const emailGenerator: CustomGenerator = {
  name: 'emailGenerator',
  description: 'Generates realistic email addresses with domain patterns',
  fieldTypes: ['email', 'string'],
  generate: (_field: any, context: GenerationContext) => {
    const { fieldName, modelName } = context;
    
    // Common email domains
    const domains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'company.com', 'example.org', 'test.com'
    ];
    
    // Generate name based on field context
    let firstName = '';
    let lastName = '';
    
    if (fieldName.toLowerCase().includes('user') || modelName.toLowerCase().includes('user')) {
      // Use realistic names for user emails
      const firstNames = ['john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'chris', 'emma'];
      const lastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis'];
      
      firstName = firstNames[Math.floor(Math.random() * firstNames.length)] || 'user';
      lastName = lastNames[Math.floor(Math.random() * lastNames.length)] || 'name';
    } else {
      // Generate random names
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const nameLength = Math.floor(Math.random() * 8) + 3;
      firstName = Array.from({ length: nameLength }, () => 
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
    }
    
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const randomNum = Math.floor(Math.random() * 999);
    
    // Different email patterns
    const patterns = [
      `${firstName}.${lastName}@${domain}`,
      `${firstName}${lastName}@${domain}`,
      `${firstName}${randomNum}@${domain}`,
      `${firstName}.${lastName}${randomNum}@${domain}`
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
  },
  validate: (field: any) => {
    return field.type.toLowerCase().includes('email') || 
           field.name.toLowerCase().includes('email') ||
           field.name.toLowerCase().includes('mail');
  }
};

const emailPlugin: Plugin = {
  name: 'email-generator',
  version: '1.0.0',
  description: 'Realistic email address generation with domain patterns',
  author: 'Mocktail CLI Team',
  generators: [emailGenerator],
  hooks: {
    beforeGeneration: async (_context) => {
      console.log('📧 Email generator plugin activated');
    }
  }
};

export default emailPlugin;
