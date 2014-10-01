{assert} = require 'chai'

expandUriTemplateWithParameters = require '../../src/expand-uri-template-with-parameters'

describe 'expandUriTemplateWithParameters', () ->
  data = null
  uriTemplate = ''
  parameters = ''

  before () ->
    uriTemplate = '/machines{/name}'
    parameters =
      name:
        description: 'Machine name'
        type: 'string'
        required: true
        example: 'waldo'
        default: ''

    data = expandUriTemplateWithParameters uriTemplate, parameters

  it 'should return an object', () ->
    assert.isObject data

  describe 'returned obejct', () ->
    [
      'errors'
      'warnings'
      'uri'
    ].forEach (key) ->
      it 'should have key "' + key + '"', () ->
        assert.include Object.keys(data), key

    describe 'when not parseable uri templeate privided', () ->
      before () ->
        uriTemplate = '/machines{{/name}'
        parameters =
          name:
            description: 'Machine name'
            type: 'string'
            required: true
            example: 'waldo'
            default: ''

        data = expandUriTemplateWithParameters uriTemplate, parameters

      it 'it should return some errror', () ->
        assert.notEqual data['errors'].length, 0


    describe 'when URI with no URI template expression given', () ->
      before () ->
        uriTemplate = '/machines/waldo'
        parameters = {}
        data = expandUriTemplateWithParameters uriTemplate, parameters

      describe 'with no parameters given', () ->
        it 'should return no error', () ->
          assert.equal data['errors'].length, 0

        it 'should return no warning', () ->
          assert.equal data['warnings'].length, 0

        it 'should return URI as it is', () ->
          assert.equal data['uri'], uriTemplate


      describe 'with some parameters given', () ->
        before () ->
          uriTemplate = '/machines/waldo'
          parameters =
            name:
              description: 'Machine name'
              type: 'string'
              required: true
              example: 'waldo'
              default: ''

          data = expandUriTemplateWithParameters uriTemplate, parameters

        it 'should return no error', () ->
          assert.equal data['errors'].length, 0

        it 'should return some warning', () ->
          assert.notEqual data['warnings'].length, 0

        describe 'returned warning', () ->
          warning = ''
          before () ->
            warning = data['warnings'][data['warnings'].length - 1]

          it 'should contain paramter name', () ->
            assert.include warning, Object.keys(parameters)[0]

          it 'sohuld contain proper text', () ->
            text = 'Doesn\'t contain expression for parameter'
            assert.include warning, text

        it 'should return URI as it is', () ->
          assert.equal data['uri'], uriTemplate


    describe 'when UriTemplate with some URI template expression given', () ->
      describe 'when no matching parameters provided', () ->
        before () ->
          uriTemplate = '/machines/{name}'
          parameters = {}
          data = expandUriTemplateWithParameters uriTemplate, parameters

        it 'should return some warning', () ->
          assert.notEqual data['warnings'].length, 0

        describe 'returned warning', () ->
          warning = ''
          before () ->
            warning = data['warnings'][data['warnings'].length - 1]

          it 'sohuld contain proper text', () ->
            text =  "Parameter not defined"
            assert.include warning, text

        it 'should return no error', () ->
          assert.equal data['errors'].length, 0

        it 'should return no URI', () ->
          assert.equal data['uri'], null

      describe 'with defined some parameters not matching any expression', () ->
        before () ->
          uriTemplate = '/machines/{name}'
          parameters =
            name:
              description: 'Machine name'
              type: 'string'
              required: true
              example: 'waldo'
              default: ''
            fanny:
              required: false
              description: 'Machine fanny'
              type: 'string'
              required: true
              example: 'wild'
              default: ''

          data = expandUriTemplateWithParameters uriTemplate, parameters

        it 'should return no error', () ->
          assert.equal data['errors'].length, 0

        it 'should return some warning', () ->
          assert.equal data['warnings'].length, 1

        it 'should return expandend URI', () ->
          assert.equal data['uri'], '/machines/waldo'

      describe 'when expression parameter is required', () ->
        describe 'when example is not given', () ->
          before () ->
            uriTemplate = '/machines/{name}'
            parameters =
              name:
                description: 'Machine name'
                type: 'string'
                required: true
                example: ''
                default: ''

            data = expandUriTemplateWithParameters uriTemplate, parameters

          it 'should return no error', () ->
            assert.equal data['errors'].length, 0

          it 'should return some warning', () ->
            assert.equal data['warnings'].length, 1

          it 'should return no URI', () ->
            assert.isNull data['uri']

          describe 'returned warning', () ->
            warning = ''
            before () ->
              warning = data['warnings'][data['warnings'].length - 1]

            it 'sohuld contain proper text', () ->
              text = "No example value for required parameter"
              assert.include warning, text

        describe 'when example value is given', () ->
          before () ->
            uriTemplate = '/machines/{name}'
            parameters =
              name:
                description: 'Machine name'
                type: 'string'
                required: true
                example: 'example-one'
                default: ''

            data = expandUriTemplateWithParameters uriTemplate, parameters

          it 'should return no error', () ->
            assert.equal data['errors'].length, 0

          it 'should return no warning', () ->
            assert.equal data['warnings'].length, 0

          it 'should use example value to URI parameter expansion', () ->
            assert.include data['uri'], parameters['name']['example']

          it 'should return URI', () ->
            assert.isNotNull data['uri']

        describe 'when example and default value is given', () ->
          before () ->
            uriTemplate = '/machines/{name}'
            parameters =
              name:
                description: 'Machine name'
                type: 'string'
                required: true
                example: 'example-one'
                default: 'default-one'

            data = expandUriTemplateWithParameters uriTemplate, parameters

          it 'should return no error', () ->
            assert.equal data['errors'].length, 0

          it 'should return no warning', () ->
            assert.equal data['warnings'].length, 0

          it 'should use example value to URI parameter expansion', () ->
            assert.include data['uri'], parameters['name']['example']

          it 'should return URI', () ->
            assert.isNotNull data['uri']

      describe 'when expression parameter is optional', () ->
          before () ->
            uriTemplate = '/machines/{name}'
            parameters =
              name:
                description: 'Machine name'
                type: 'string'
                required: false
                example: 'example-one'
                default: ''

            data = expandUriTemplateWithParameters uriTemplate, parameters

          it 'should return no error', () ->
            assert.equal data['errors'].length, 0

          it 'should return no warning', () ->
            assert.equal data['warnings'].length, 0

          it 'should use example value to URI parameter expansion', () ->
            assert.include data['uri'], parameters['name']['example']

          it 'should return URI', () ->
            assert.isNotNull data['uri']

        describe 'when default value is given and example is empty', () ->
          before () ->
            uriTemplate = '/machines/{name}'
            parameters =
              name:
                description: 'Machine name'
                type: 'string'
                required: false
                default: 'default-one'
                example: ''

            data = expandUriTemplateWithParameters uriTemplate, parameters

          it 'should return no error', () ->
            assert.equal data['errors'].length, 0

          it 'should return no warning', () ->
            assert.equal data['warnings'].length, 0

          it 'should use default value to URI parameter expansion', () ->
            assert.include data['uri'], parameters['name']['default']

          it 'should return URI', () ->
            assert.isNotNull data['uri']

        describe 'when example and default value is given', () ->
          before () ->
            uriTemplate = '/machines/{name}'
            parameters =
              name:
                description: 'Machine name'
                type: 'string'
                required: false
                example: 'example-one'
                default: 'default-one'

            data = expandUriTemplateWithParameters uriTemplate, parameters

          it 'should return no error', () ->
            assert.equal data['errors'].length, 0

          it 'should return no warning', () ->
            assert.equal data['warnings'].length, 0

          it 'should use example value to URI parameter expansion', () ->
            assert.include data['uri'], parameters['name']['example']

          it 'should return some URI', () ->
            assert.isNotNull data['uri']


        describe 'when example and default value is not given', () ->
          before () ->
            uriTemplate = '/machines/{name}'
            parameters =
              name:
                description: 'Machine name'
                type: 'string'
                required: false
                default: ''
                example: ''

            data = expandUriTemplateWithParameters uriTemplate, parameters

          it 'should return no error', () ->
            assert.equal data['errors'].length, 0

          it 'should return no warning', () ->
            assert.equal data['warnings'].length, 0

          it 'should return some URI', () ->
            assert.isNotNull data['uri']

