import { assert } from 'chai'

import { detectApiDescription } from '../../../lib/init'

describe('init._detectApiDescription()', () => {
  it('defaults to API Blueprint on empty array', () =>
    assert.equal(detectApiDescription([]), 'apiary.apib'))

  it('defaults to API Blueprint on arbitrary files', () =>
    assert.equal(detectApiDescription(['foo', 'bar']), 'apiary.apib'))

  it('detects the first API Blueprint file', () =>
    assert.equal(
      detectApiDescription(['foo', 'boo.apib', 'bar', 'moo.apib']),
      'boo.apib'
    ))

  it("detects the first .yml file containing 'swagger' as OpenAPI 2", () =>
    assert.equal(
      detectApiDescription(['foo', 'this-is-swagger.yml', 'bar']),
      'this-is-swagger.yml'
    ))

  it("detects the first .yaml file containing 'swagger' as OpenAPI 2", () =>
    assert.equal(
      detectApiDescription(['foo', 'this-is-swagger.yaml', 'bar']),
      'this-is-swagger.yaml'
    ))

  it("detects the first .yml file containing 'api' as OpenAPI 2", () =>
    assert.equal(
      detectApiDescription(['foo', 'openapi.yml', 'bar']),
      'openapi.yml'
    ))

  it("detects the first .yaml file containing 'api' as OpenAPI 2", () =>
    assert.equal(
      detectApiDescription(['foo', 'openapi.yaml', 'bar']),
      'openapi.yaml'
    ))

  it('prefers API Blueprint over OpenAPI 2', () =>
    assert.equal(detectApiDescription(['swagger.yml', 'boo.apib']), 'boo.apib'))

  it("prefers 'swagger' over 'api'", () =>
    assert.equal(
      detectApiDescription(['api.yml', 'swagger.yml']),
      'swagger.yml'
    ))
})
