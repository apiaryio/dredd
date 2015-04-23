module.exports = {
  "./path/to/blueprint.file": {
    filename: "./path/to/blueprint.file"
    raw:  "# GET /message\n+ Response 200 (text/plain)\n\n      Hello World!\n"
    parsed: {
      "_version": 19,
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
      "error": null
    }
  }
}
