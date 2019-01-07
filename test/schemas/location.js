module.exports = () => ({
  type: 'array',
  items: {
    type: 'array',
    items: [
      { type: 'number' },
      { type: 'number' },
    ],
    additionalItems: false,
  },
});
