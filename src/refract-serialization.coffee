fury = require('fury')
JSON06Serialiser = require('minim/lib/serialisers/json-0.6')


# This file should be removed once all dredd-transactions use minim.


serialize = (element) ->
  new JSON06Serialiser(fury.minim).serialise(element)


deserialize = (refract) ->
  new JSON06Serialiser(fury.minim).deserialise(refract)


module.exports = {serialize, deserialize}
