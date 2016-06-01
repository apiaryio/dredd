
{assert} = require('../utils')

refract = require('../../src/refract')


describe('Refract Utility Functions', ->
  describe('match()', ->
    node =
      element: 'string',
      attributes:
        sourceMap: [
          element: 'sourceMap',
          content: [[220, 33]]
        ]
      content: '202'

    describe('node matching given query', ->
      match = refract.match(node, {'$exists': {'attributes.sourceMap': true}})

      it('does match', ->
        assert.isTrue(match)
      )
    )

    describe('node not matching given query', ->
      match = refract.match(node, {'content': '200'})

      it('does not match', ->
        assert.isFalse(match)
      )
    )
  )


  describe('content()', ->
    describe('refracted string', ->
      node =
        element: 'string',
        content:
          element: 'string',
          attributes:
            sourceMap: [
              element: 'sourceMap',
              content: [[220, 33]]
            ]
          content: '202'
      content = refract.content(node)

      it('is correctly resolved', ->
        assert.equal(content, '202')
      )
    )

    describe('plain string', ->
      node = '202'
      content = refract.content(node)

      it('is correctly resolved', ->
        assert.equal(content, '202')
      )
    )

    describe('empty string', ->
      node = ''
      content = refract.content(node)

      it('is correctly resolved', ->
        assert.equal(content, '')
      )
    )

    describe('refracted empty string', ->
      node =
        element: 'string',
        content:
          element: 'string',
          attributes:
            sourceMap: [
              element: 'sourceMap',
              content: [[220, 33]]
            ]
          content: ''
      content = refract.content(node)

      it('is correctly resolved', ->
        assert.equal(content, '')
      )
    )

    describe('undefined', ->
      node = undefined
      content = refract.content(node)

      it('is correctly resolved', ->
        assert.isUndefined(content)
      )
    )

    describe('refracted element without \'content\'', ->
      # dealing with https://github.com/apiaryio/drafter/issues/305

      node =
        element: 'string',
        content:
          element: 'string',
      content = refract.content(node)

      it('is correctly resolved', ->
        assert.isUndefined(content)
      )
    )
  )


  describe('children()', ->
    node =
      element: 'string',
      attributes:
        sourceMap: [
          element: 'sourceMap',
          content: [[220, 33]]
        ]
        headers:
          element: 'httpHeaders'
          content: [
            element: 'member'
            attributes:
              sourceMap: [
                element: 'sourceMap'
                content: [[220, 33]]
              ]
            content:
              key:
                element: 'string'
                content: 'Content-Type'
              value:
                element: 'string'
                content: 'application/json'
          ]
      content: '202'

    describe('without arguments', ->
      children = refract.children(node)

      it('finds all children elements', ->
        assert.deepEqual((child.element for child in children), [
          'sourceMap', 'httpHeaders', 'member', 'sourceMap', 'string', 'string'
        ])
      )
    )

    describe('with query', ->
      children = refract.children(node, {'element': 'sourceMap'})

      it('finds all matching children elements', ->
        assert.deepEqual((child.element for child in children), [
          'sourceMap', 'sourceMap'
        ])
      )
    )

    describe('with query which does not match anything', ->
      children = refract.children(node, {'smurf': {'$exists': true}})

      it('returns empty array', ->
        assert.deepEqual(children, [])
      )
    )
  )


  describe('child()', ->
    node =
      element: 'string',
      attributes:
        sourceMap: [
          element: 'sourceMap',
          content: [[220, 33]]
        ]
        headers:
          element: 'httpHeaders'
          content: [
            element: 'member'
            attributes:
              sourceMap: [
                element: 'sourceMap'
                content: [[220, 33]]
              ]
            content:
              key:
                element: 'string'
                content: 'Content-Type'
              value:
                element: 'string'
                content: 'application/json'
          ]
      content: '202'

    describe('without arguments', ->
      child = refract.child(node)

      it('finds the first child element', ->
        assert.equal(child.element, 'sourceMap')
      )
    )

    describe('with query', ->
      child = refract.child(node, {'element': 'sourceMap'})

      it('finds the first matching child element', ->
        assert.equal(child.element, 'sourceMap')
      )
    )

    describe('with query which does not match anything', ->
      child = refract.child(node, {'smurf': {'$exists': true}})

      it('returns undefined', ->
        assert.isUndefined(child)
      )
    )
  )


  describe('parents()', ->
    node =
      element: 'string'
      content: 'application/json'

    tree =
      element: 'string',
      attributes:
        sourceMap: [
          element: 'sourceMap',
          content: [[220, 33]]
        ]
        headers:
          element: 'httpHeaders'
          content: [
            element: 'member'
            attributes:
              sourceMap: [
                element: 'sourceMap'
                content: [[220, 33]]
              ]
            content:
              key:
                element: 'string'
                content: 'Content-Type'
              value: node
          ]
      content: '202'

    describe('without arguments', ->
      parents = refract.parents(node, tree)

      it('finds all parent elements', ->
        assert.deepEqual((parent.element for parent in parents), [
          'member', 'httpHeaders', 'string'
        ])
      )
    )

    describe('with query', ->
      parents = refract.parents(node, tree, {'attributes': {'$exists': true}})

      it('finds all matching parent elements', ->
        assert.deepEqual((parent.element for parent in parents), [
          'member', 'string'
        ])
      )
    )

    describe('with query which does not match anything', ->
      parents = refract.parents(node, tree, {'smurf': {'$exists': true}})

      it('returns empty array', ->
        assert.deepEqual(parents, [])
      )
    )

    describe('with node which is not from given tree', ->
      parents = refract.parents({answer: 42}, tree)

      it('returns empty array', ->
        assert.deepEqual(parents, [])
      )
    )
  )


  describe('parent()', ->
    node =
      element: 'string'
      content: 'application/json'

    tree =
      element: 'string',
      attributes:
        sourceMap: [
          element: 'sourceMap',
          content: [[220, 33]]
        ]
        headers:
          element: 'httpHeaders'
          content: [
            element: 'member'
            attributes:
              sourceMap: [
                element: 'sourceMap'
                content: [[220, 33]]
              ]
            content:
              key:
                element: 'string'
                content: 'Content-Type'
              value: node
          ]
      content: '202'

    describe('without arguments', ->
      parent = refract.parent(node, tree)

      it('finds the first parent element', ->
        assert.equal(parent.element, 'member')
      )
    )

    describe('with query', ->
      parent = refract.parent(node, tree, {'attributes': {'$exists': false}})

      it('finds the first matching parent element', ->
        assert.equal(parent.element, 'httpHeaders')
      )
    )

    describe('with query which does not match anything', ->
      parent = refract.parent(node, tree, {'smurf': {'$exists': true}})

      it('returns undefined', ->
        assert.isUndefined(parent)
      )
    )

    describe('with node which is not from given tree', ->
      parent = refract.parent({answer: 42}, tree)

      it('returns undefined', ->
        assert.isUndefined(parent)
      )
    )
  )
)
