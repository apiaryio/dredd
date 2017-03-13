{assert} = require('chai')

{runDreddCommandWithServer, createServer, DEFAULT_SERVER_PORT} = require('../helpers')


PROXY_PORT = DEFAULT_SERVER_PORT + 1
PROXY_URL = "http://127.0.0.1:#{PROXY_PORT}"


describe('CLI - HTTP(S) Proxy Settings', ->
  describe('When using Dredd with --proxy option', ->
    proxy = undefined
    runtimeInfo = {}

    beforeEach((done) ->
      app = createServer()
      proxy = app.listen(PROXY_PORT, (err, info) ->
        runtimeInfo.proxy = info
        done(err)
      )
    )
    afterEach((done) ->
      proxy.close(done)
    )

    beforeEach((done) ->
      app = createServer()
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--level=verbose'
        "--proxy=#{PROXY_URL}"
      ]
      runDreddCommandWithServer(args, app, (err, info) ->
        runtimeInfo.server = info.server
        runtimeInfo.dredd = info.dredd
        done(err)
      )
    )

    it('logs about using proxy', ->
      assert.include(
        runtimeInfo.dredd.output,
        "proxy specified by Dredd options: #{PROXY_URL}"
      )
    )
    it('does not directly request the server under test', ->
      assert.isFalse(runtimeInfo.server.requested)
    )
    it('requests the proxy', ->
      assert.isTrue(runtimeInfo.proxy.requested)
    )
    context('the proxy request', ->
      it('has the same method as the original request', ->
        assert.equal(runtimeInfo.proxy.lastRequest.method, 'GET')
      )
      it('has the original server URL as a path', ->
        assert.equal(
          runtimeInfo.proxy.lastRequest.url,
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}/machines"
        )
      )
    )
  )
)
