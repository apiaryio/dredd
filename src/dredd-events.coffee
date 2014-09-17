runIfDefined = (fn, callback) ->
  if fn
    fn(callback)
  else
    callback()

class DreddEvents
  constructor: () ->
    @reset()

  beforeAll: (callback) =>
    @beforeCallback = callback

  afterAll: (callback) =>
    @afterCallback = callback

  reset: () ->
    @beforeCallback = null
    @afterCallback = null

  runBeforeAll: (callback) =>
    runIfDefined(@beforeCallback, callback)

  runAfterAll: (callback) =>
    runIfDefined(@afterCallback, callback)

module.exports = new DreddEvents()
