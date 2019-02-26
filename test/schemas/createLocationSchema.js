const position = {
  type: 'array',
  items: [
    { type: 'number' },
    { type: 'number' },
  ],
  additionalItems: false,
};

module.exports = () => ({
  anyOf: [
    {
      type: 'array',
      items: [position, position],
      additionalItems: false,
    },
    {
      type: 'null',
    },
  ],
});
