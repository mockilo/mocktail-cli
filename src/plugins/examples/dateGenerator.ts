import { Plugin, CustomGenerator, GenerationContext } from '../pluginManager';

const dateGenerator: CustomGenerator = {
  name: 'dateGenerator',
  description: 'Generates realistic date values with various formats',
  fieldTypes: ['date', 'datetime', 'timestamp', 'Date'],
  generate: (_field: any, context: GenerationContext) => {
    const { fieldName, constraints } = context;
    
    // Check for specific date patterns in field names
    if (fieldName.toLowerCase().includes('birth')) {
      // Birth dates should be in the past
      const maxAge = constraints?.maxAge || 100;
      const minAge = constraints?.minAge || 18;
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() - minAge);
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - maxAge);
      
      return new Date(
        minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime())
      );
    }
    
    if (fieldName.toLowerCase().includes('created') || fieldName.toLowerCase().includes('updated')) {
      // Created/updated dates should be recent
      const daysAgo = Math.floor(Math.random() * 365); // Last year
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return date;
    }
    
    if (fieldName.toLowerCase().includes('expir') || fieldName.toLowerCase().includes('valid')) {
      // Expiration dates should be in the future
      const daysFromNow = Math.floor(Math.random() * 365) + 1; // Next year
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date;
    }
    
    // Default: random date within the last 2 years
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const now = new Date();
    
    return new Date(
      twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime())
    );
  },
  validate: (field: any) => {
    return field.type.toLowerCase().includes('date') || 
           field.name.toLowerCase().includes('date') ||
           field.name.toLowerCase().includes('time');
  }
};

const datePlugin: Plugin = {
  name: 'date-generator',
  version: '1.0.0',
  description: 'Advanced date and time generation with realistic patterns',
  author: 'Mocktail CLI Team',
  generators: [dateGenerator],
  hooks: {
    beforeGeneration: async (_context) => {
      console.log('📅 Date generator plugin activated');
    }
  }
};

export default datePlugin;
