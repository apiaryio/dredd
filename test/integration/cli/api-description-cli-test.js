import fs from 'fs'
import os from 'os'
import { assert } from 'chai'

import { runCLIWithServer, createServer, DEFAULT_SERVER_PORT } from '../helpers'

const NON_EXISTENT_PORT = DEFAULT_SERVER_PORT + 1

describe('CLI - API Description Document', () => {
  describe('when loaded from file', () => {
    describe('when loaded by glob pattern', () => {
      let runtimeInfo
      const args = [
        './test/fixtures/single-g*t.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ]

      before((done) => {
        const app = createServer()
        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }])
        )

        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should request /machines', () =>
        assert.deepEqual(runtimeInfo.server.requestCounts, { '/machines': 1 }))
      it('should exit with status 0', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 0))
    })

    describe('when file not found', () => {
      let runtimeInfo
      const args = [
        './test/fixtures/__non-existent__.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ]

      before((done) => {
        const app = createServer()
        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should exit with status 1', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 1))
      it('should print error message to stderr', () =>
        assert.include(
          runtimeInfo.dredd.stderr.toLowerCase(),
          'could not find'
        ))
    })

    describe("when given path exists, but can't be read", () => {
      let runtimeInfo
      const args = [os.homedir(), `http://127.0.0.1:${DEFAULT_SERVER_PORT}`]

      before((done) => {
        const app = createServer()
        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should exit with status 1', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 1))
      it('should print error message to stderr', () =>
        assert.include(
          runtimeInfo.dredd.stderr,
          'Unable to load API description document'
        ))
    })
  })

  describe('when loaded from URL', () => {
    describe('when successfully loaded from URL', () => {
      let runtimeInfo
      const args = [
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}/single-get.apib`,
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ]

      before((done) => {
        const app = createServer()
        app.get('/single-get.apib', (req, res) => {
          res.type('text/vnd.apiblueprint')
          fs.createReadStream('./test/fixtures/single-get.apib').pipe(res)
        })
        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }])
        )

        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should download API Description Document from server', () =>
        assert.equal(runtimeInfo.server.requestCounts['/single-get.apib'], 1))
      it('should request /machines', () =>
        assert.deepEqual(runtimeInfo.server.requestCounts, {
          '/machines': 1,
          '/single-get.apib': 1
        }))
      it('should exit with status 0', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 0))
    })

    describe('when URL points to non-existent server', () => {
      let runtimeInfo
      const args = [
        `http://127.0.0.1:${NON_EXISTENT_PORT}/single-get.apib`,
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ]

      before((done) => {
        const app = createServer()
        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should not request server', () =>
        assert.isFalse(runtimeInfo.server.requested))
      it('should exit with status 1', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 1))
      it('should print error message to stderr', () => {
        assert.include(
          runtimeInfo.dredd.stderr,
          'Unable to load API description document from'
        )
        assert.include(
          runtimeInfo.dredd.stderr,
          `http://127.0.0.1:${NON_EXISTENT_PORT}/single-get.apib`
        )
      })
    })

    describe('when URL points to non-existent resource', () => {
      let runtimeInfo
      const args = [
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}/__non-existent__.apib`,
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ]

      before((done) => {
        const app = createServer()
        app.get('/__non-existent__.apib', (req, res) => res.sendStatus(404))

        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should request server', () =>
        assert.isTrue(runtimeInfo.server.requested))
      it('should exit with status 1', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 1))
      it('should print error message to stderr', () => {
        assert.include(
          runtimeInfo.dredd.stderr,
          'Unable to load API description document from'
        )
        assert.include(
          runtimeInfo.dredd.stderr,
          "Dredd got HTTP 404 response with 'text/plain; charset=utf-8' body"
        )
        assert.include(
          runtimeInfo.dredd.stderr,
          `http://127.0.0.1:${DEFAULT_SERVER_PORT}/__non-existent__.apib`
        )
      })
    })
  })

  describe('when loaded by -p/--path', () => {
    describe('when loaded from file', () => {
      let runtimeInfo
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--path=./test/fixtures/single-get-uri-template.apib'
      ]

      before((done) => {
        const app = createServer()
        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }])
        )
        app.get('/machines/willy', (req, res) =>
          res.json({ type: 'bulldozer', name: 'willy' })
        )

        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should request /machines, /machines/willy', () =>
        assert.deepEqual(runtimeInfo.server.requestCounts, {
          '/machines': 1,
          '/machines/willy': 1
        }))
      it('should exit with status 0', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 0))
    })

    describe('when loaded from URL', () => {
      let runtimeInfo
      const args = [
        './test/fixtures/single-get-uri-template.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        `--path=http://127.0.0.1:${DEFAULT_SERVER_PORT}/single-get.yaml`
      ]

      before((done) => {
        const app = createServer()
        app.get('/single-get.yaml', (req, res) => {
          res.type('application/yaml')
          fs.createReadStream('./test/fixtures/single-get.yaml').pipe(res)
        })
        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }])
        )
        app.get('/machines/willy', (req, res) =>
          res.json({ type: 'bulldozer', name: 'willy' })
        )

        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should download API Description Document from server', () =>
        assert.equal(runtimeInfo.server.requestCounts['/single-get.yaml'], 1))
      it('should request /machines, /machines/willy', () =>
        assert.deepEqual(runtimeInfo.server.requestCounts, {
          '/machines': 1,
          '/machines/willy': 1,
          '/single-get.yaml': 1
        }))
      it('should exit with status 0', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 0))
    })

    describe('when used multiple times', () => {
      let runtimeInfo
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--path=./test/fixtures/single-get-uri-template.apib',
        '--path=./test/fixtures/single-get-path.apib'
      ]

      before((done) => {
        const app = createServer()
        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }])
        )
        app.get('/machines/willy', (req, res) =>
          res.json({ type: 'bulldozer', name: 'willy' })
        )
        app.get('/machines/caterpillar', (req, res) =>
          res.json({ type: 'bulldozer', name: 'caterpillar' })
        )

        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should request /machines, /machines/willy, /machines/caterpillar', () =>
        assert.deepEqual(runtimeInfo.server.requestCounts, {
          '/machines': 1,
          '/machines/willy': 1,
          '/machines/caterpillar': 1
        }))
      it('should exit with status 0', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 0))
    })

    describe('when loaded by glob pattern', () => {
      let runtimeInfo
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--path=./test/fixtures/single-get-uri-temp*.apib'
      ]

      before((done) => {
        const app = createServer()
        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }])
        )
        app.get('/machines/willy', (req, res) =>
          res.json({ type: 'bulldozer', name: 'willy' })
        )

        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should request /machines, /machines/willy', () =>
        assert.deepEqual(runtimeInfo.server.requestCounts, {
          '/machines': 1,
          '/machines/willy': 1
        }))
      it('should exit with status 0', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 0))
    })

    describe('when additional file not found', () => {
      let runtimeInfo
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--path=./test/fixtures/__non-existent__.apib'
      ]

      before((done) => {
        const app = createServer()
        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }])
        )

        runCLIWithServer(args, app, (err, info) => {
          runtimeInfo = info
          done(err)
        })
      })

      it('should not request server', () =>
        assert.isFalse(runtimeInfo.server.requested))
      it('should exit with status 1', () =>
        assert.equal(runtimeInfo.dredd.exitStatus, 1))
      it('should print error message to stderr', () =>
        assert.include(
          runtimeInfo.dredd.stderr.toLowerCase(),
          'could not find'
        ))
    })
  })
})
