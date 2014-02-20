require 'coffee-errors'
{assert} = require 'chai'


hooks = require '../../src/hooks'

describe 'Hooks', () ->

  describe 'when adding before hook', () ->

    before () ->
      hooks.before 'beforeHook', () ->
        ""
    after () ->
      hooks.beforeHooks = {}

    it 'should add to hook collection', () ->
      assert.property hooks.beforeHooks, 'beforeHook'

  describe 'when adding after hook', () ->

    before () ->
      hooks.after 'afterHook', () ->
        ""
    after () ->
      hooks.afterHooks = {}

    it 'should add to hook collection', () ->
      assert.property hooks.afterHooks, 'afterHook'
