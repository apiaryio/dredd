fury = require('fury')
JSON06Serialiser = require('minim/lib/serialisers/json-0.6')


# This file should be replaced with fury.minim.toRefract(apiElements) once
# all dredd-transactions use minim.


module.exports = (result) ->
  new JSON06Serialiser(fury.minim).serialise(result)
