module.exports = {
  "./path/to/blueprint.file": {
    filename: "./path/to/blueprint.file"
    raw:  "# GET /message\n+ Response 200 (text/plain)\n\n      Hello World!\n"
    parsed: {
      "ast": {
        "_version": "2.1",
        "metadata": [],
        "name": "",
        "description": "",
        "resourceGroups": [
          {
            "name": "",
            "description": "",
            "resources": [
              {
                "name": "",
                "description": "",
                "uriTemplate": "/message",
                "model": {},
                "parameters": [],
                "actions": [
                  {
                    "name": "",
                    "description": "",
                    "method": "GET",
                    "parameters": [],
                    "examples": [
                      {
                        "name": "",
                        "description": "",
                        "requests": [],
                        "responses": [
                          {
                            "name": "200",
                            "description": "",
                            "headers": [
                              {
                                "name": "Content-Type",
                                "value": "text/plain"
                              }
                            ],
                            "body": "  Hello World!\n",
                            "schema": ""
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      "warnings": [
        {
          "code": 10,
          "message": "message-body asset is expected to be a pre-formatted code block, every of its line indented by exactly 8 spaces or 2 tabs",
          "location": [
            {
              "index": 48,
              "length": 15
            }
          ]
        }
      ],
      "sourcemap": {
        "metadata": [],
        "name": [],
        "description": [],
        "resourceGroups": [
          {
            "name": [],
            "description": [],
            "resources": [
              {
                "name": [],
                "description": [],
                "uriTemplate": [
                  [
                    0,
                    15
                  ]
                ],
                "model": {},
                "parameters": [],
                "actions": [
                  {
                    "name": [],
                    "description": [],
                    "method": [
                      [
                        0,
                        15
                      ]
                    ],
                    "parameters": [],
                    "examples": [
                      {
                        "name": [],
                        "description": [],
                        "requests": [],
                        "responses": [
                          {
                            "name": [
                              [
                                17,
                                27
                              ]
                            ],
                            "description": [],
                            "headers": [
                              [
                                [
                                  17,
                                  27
                                ]
                              ]
                            ],
                            "body": [
                              [
                                48,
                                15
                              ]
                            ],
                            "schema": []
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  }
}
