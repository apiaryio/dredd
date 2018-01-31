{assert} = require('chai')
sinon = require('sinon')
path = require('path')
childProcess = require('child_process')

getGoBin = require('../../src/get-go-bin')


describe('getGoBin()', ->
  goBin = undefined
  goPath = undefined

  beforeEach( ->
    goBin = process.env.GOBIN
    delete process.env.GOBIN
    goPath = process.env.GOPATH
    delete process.env.GOPATH
  )
  afterEach( ->
    process.env.GOBIN = goBin
    process.env.GOPATH = goPath
  )

  describe('when $GOBIN is set', ->
    callbackArgs = undefined

    beforeEach((done) ->
      process.env.GOBIN = path.join('dummy', 'gobin', 'path')
      getGoBin((args...) ->
        callbackArgs = args
        done()
      )
    )

    it('resolves as $GOBIN', ->
      assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gobin', 'path')])
    )
  )

  describe('when $GOPATH is set', ->
    callbackArgs = undefined

    beforeEach((done) ->
      process.env.GOPATH = path.join('dummy', 'gopath', 'path')
      getGoBin((args...) ->
        callbackArgs = args
        done()
      )
    )

    it('resolves as $GOPATH + /bin', ->
      assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gopath', 'path', 'bin')])
    )
  )

  describe('when both $GOBIN and $GOPATH are set', ->
    callbackArgs = undefined

    beforeEach((done) ->
      process.env.GOBIN = path.join('dummy', 'gobin', 'path')
      process.env.GOPATH = path.join('dummy', 'gopath', 'path')
      getGoBin((args...) ->
        callbackArgs = args
        done()
      )
    )

    it('resolves as $GOBIN', ->
      assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gobin', 'path')])
    )
  )

  describe('when neither $GOBIN nor $GOPATH are set', ->
    callbackArgs = undefined

    beforeEach((done) ->
      sinon.stub(childProcess, 'exec').callsFake((command, callback) ->
        callback(null, path.join('dummy', 'gopath', 'path'))
      )
      getGoBin((args...) ->
        callbackArgs = args
        done()
      )
    )
    afterEach( ->
      childProcess.exec.restore()
    )

    it('calls \'go env GOPATH\' + /bin', ->
      assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gopath', 'path', 'bin')])
    )
  )

  describe('when \'go env GOPATH\' fails', ->
    error = new Error('Ouch!')
    callbackArgs = undefined

    beforeEach((done) ->
      sinon.stub(childProcess, 'exec').callsFake((command, callback) ->
        callback(error)
      )
      getGoBin((args...) ->
        callbackArgs = args
        done()
      )
    )
    afterEach( ->
      childProcess.exec.restore()
    )

    it('propagates the error', ->
      assert.deepEqual(callbackArgs, [error])
    )
  )
)
