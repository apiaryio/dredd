async = require 'async'

class DreddEvents
  constructor: () ->
    @reset()

  beforeAll: (callback) =>
    @beforeCallbacks.push callback

  afterAll: (callback) =>
    @afterCallbacks.push callback

  reset: () ->
    @beforeCallbacks = []
    @afterCallbacks = []

  runBeforeAll: (callback) =>
    async.series @beforeCallbacks, callback

  runAfterAll: (callback) =>
    async.series @afterCallbacks, callback

module.exports = new DreddEvents()
