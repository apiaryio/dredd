require 'coffee-errors'
sinon = require 'sinon'
{assert} = require 'chai'


Hooks = require '../../src/hooks'

describe 'Hooks', () ->

  describe 'when adding before hook', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.before 'beforeHook', () ->
        ""

    it 'should add to hook collection', () ->
      assert.property hooks.beforeHooks, 'beforeHook'

  describe 'when adding after hook', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.after 'afterHook', () ->
        ""

    it 'should add to hook collection', () ->
      assert.property hooks.afterHooks, 'afterHook'

  describe 'when adding beforeAll hook', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.beforeAll () ->
        ""

    it 'should add to hook collection', () ->
      assert.lengthOf hooks.beforeAllHooks, 1

  describe 'when adding afterAll hook', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.afterAll () ->
        ""

    it 'should add to hook collection', () ->
      assert.lengthOf hooks.afterAllHooks, 1
