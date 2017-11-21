createLocationSchema = require('./location')
createOriginSchema = require('./origin')


TYPES = ['error', 'warning']
COMPONENTS = ['apiDescriptionParser', 'parametersValidation', 'uriTemplateExpansion']


module.exports = (options = {}) ->
  # Either filename string or undefined (= doesn't matter)
  filename = options.filename

  # options.message should be substring or RegExp
  messageSchema = {type: 'string'}
  messageSchema.pattern = options.message if options.message

  {
    type: 'object'
    properties:
      type:
        type: 'string'
        enum: if options.type then [options.type] else TYPES
      component:
        type: 'string'
        enum: if options.component then [options.component] else COMPONENTS
      message: messageSchema
      location: createLocationSchema()
      origin: createOriginSchema({filename})
    required: ['type', 'component', 'message', 'location']
    dependencies:
      origin:
        properties:
          component:
            enum: ['parametersValidation', 'uriTemplateExpansion']
    additionalProperties: false
  }
