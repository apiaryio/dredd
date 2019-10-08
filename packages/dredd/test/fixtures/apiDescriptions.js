export default [
  {
    content:
      'FORMAT: 1A\n\n# Machines API\n\n# Group Machines\n\n# Machines collection [/machines/{id}]\n  + Parameters\n    - id (number, `1`)\n\n## Get Machines [GET]\n\n- Request (application/json)\n  + Parameters\n    - id (number, `2`)\n\n- Response 200 (application/json; charset=utf-8)\n\n    [\n      {\n        "type": "bulldozer",\n        "name": "willy"\n      }\n    ]\n\n- Request (application/json)\n  + Parameters\n    - id (number, `3`)\n\n- Response 200 (application/json; charset=utf-8)\n\n    [\n      {\n        "type": "bulldozer",\n        "name": "willy"\n      }\n    ]\n',
    location: './test/fixtures/multiple-examples.apib',
    annotations: [
      {
        component: 'apiDescriptionParser',
        code: 3,
        message:
          'no parameters specified, expected a nested list of parameters, one parameter per list item',
        location: [[178, 13]],
        type: 'warning',
      },
      {
        component: 'apiDescriptionParser',
        code: 5,
        message: 'ignoring unrecognized block',
        location: [[195, 19]],
        type: 'warning',
      },
      {
        component: 'apiDescriptionParser',
        code: 10,
        message:
          'message-body asset is expected to be a pre-formatted code block, every of its line indented by exactly 8 spaces or 2 tabs',
        location: [
          [269, 2],
          [275, 4],
          [283, 25],
          [312, 20],
          [336, 4],
          [344, 2],
        ],
        type: 'warning',
      },
      {
        component: 'apiDescriptionParser',
        code: 3,
        message:
          'no parameters specified, expected a nested list of parameters, one parameter per list item',
        location: [[378, 13]],
        type: 'warning',
      },
      {
        component: 'apiDescriptionParser',
        code: 5,
        message: 'ignoring unrecognized block',
        location: [[395, 19]],
        type: 'warning',
      },
      {
        component: 'apiDescriptionParser',
        code: 10,
        message:
          'message-body asset is expected to be a pre-formatted code block, every of its line indented by exactly 8 spaces or 2 tabs',
        location: [
          [469, 2],
          [475, 4],
          [483, 25],
          [512, 20],
          [536, 4],
          [544, 2],
        ],
        type: 'warning',
      },
    ],
  },
];
