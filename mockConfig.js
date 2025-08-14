// mockConfig.js
module.exports = {
  count: 5,

  models: {
    User: {
      count: 10,
      fields: {
        name: { faker: 'name.findName' },
        email: { faker: 'internet.email' },
      },
    },

    Profile: {
      count: 10,
      fields: {
        bio: { faker: 'lorem.sentence' },
      },
    },

    Post: {
      count: 20,
      fields: {
        title: { faker: 'lorem.sentence' },
        content: { faker: 'lorem.paragraph' },
      },
    },

    Comment: {
      count: 50,
      fields: {
        content: { faker: 'lorem.sentences' },
      },
    },

    Team: {
      count: 5,
      fields: {
        name: { faker: 'company.companyName' },
      },
    },

    Company: {
      count: 3,
      fields: {
        name: { faker: 'company.companyName' },
      },
    },
  },

  relations: {
    depth: 2,
  },
};
