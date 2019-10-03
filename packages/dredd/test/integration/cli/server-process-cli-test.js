import { assert } from 'chai'
import {
  isProcessRunning,
  killAll,
  runCLI,
  createServer,
  DEFAULT_SERVER_PORT
} from '../helpers'

const NON_EXISTENT_PORT = DEFAULT_SERVER_PORT + 1

describe('CLI - Server Process', () => {
  describe('when specified by URL', () => {
    let server
    let serverRuntimeInfo

    before((done) => {
      const app = createServer()

      app.get('/machines', (req, res) =>
        res.json([{ type: 'bulldozer', name: 'willy' }])
      )

      app.get('/machines/willy', (req, res) =>
        res.json({ type: 'bulldozer', name: 'willy' })
      )

      server = app.listen((err, info) => {
        serverRuntimeInfo = info
        done(err)
      })
    })

    after((done) => server.close(done))

    describe('when is running', () => {
      let cliInfo
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ]

      before((done) =>
        runCLI(args, (err, info) => {
          cliInfo = info
          done(err)
        })
      )

      it('should request /machines', () =>
        assert.deepEqual(serverRuntimeInfo.requestCounts, { '/machines': 1 }))
      it('should exit with status 0', () => assert.equal(cliInfo.exitStatus, 0))
    })

    describe('when is not running', () => {
      let cliInfo
      const args = [
        './test/fixtures/apiary.apib',
        `http://127.0.0.1:${NON_EXISTENT_PORT}`
      ]

      before((done) =>
        runCLI(args, (err, info) => {
          cliInfo = info
          done(err)
        })
      )

      it('should return understandable message', () =>
        assert.include(cliInfo.stdout, 'Error connecting'))
      it('should report error for all transactions', () => {
        const occurences = (cliInfo.stdout.match(/Error connecting/g) || [])
          .length
        assert.equal(occurences, 5)
      })
      it('should return stats', () =>
        assert.include(cliInfo.stdout, '5 errors'))
      it('should exit with status 1', () => assert.equal(cliInfo.exitStatus, 1))
    })
  })

  describe('when specified by -g/--server', () => {
    afterEach((done) => killAll('test/fixtures/scripts/', done))

    describe('when works as expected', () => {
      let cliInfo
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        `--server=node ./test/fixtures/scripts/dummy-server.js ${DEFAULT_SERVER_PORT}`,
        '--server-wait=1',
        '--loglevel=debug'
      ]

      before((done) =>
        runCLI(args, (err, info) => {
          if (err) {
            throw err
          }

          cliInfo = info
          done(err)
        })
      )

      it('should inform about starting server with custom command', () =>
        assert.include(
          cliInfo.stderr,
          'Starting backend server process with command'
        ))
      it("should redirect server's welcome message", () =>
        assert.include(
          cliInfo.stdout,
          `Dummy server listening on port ${DEFAULT_SERVER_PORT}`
        ))
      it('should exit with status 0', () => assert.equal(cliInfo.exitStatus, 0))
    })

    describe('when it fails to start', () => {
      let cliInfo
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--server=/foo/bar/baz',
        '--server-wait=1',
        '--loglevel=debug'
      ]

      before((done) =>
        runCLI(args, (err, info) => {
          cliInfo = info
          done(err)
        })
      )

      it('should inform about starting server with custom command', () =>
        assert.include(
          cliInfo.stderr,
          'Starting backend server process with command'
        ))
      it('should report problem with server process spawn', () =>
        assert.include(
          cliInfo.stderr,
          'Command to start backend server process failed, exiting Dredd'
        ))
      it('should exit with status 1', () => assert.equal(cliInfo.exitStatus, 1))
    })

    for (const scenario of [
      {
        description: 'when crashes before requests',
        apiDescriptionDocument: './test/fixtures/single-get.apib',
        server: 'node test/fixtures/scripts/exit-3.js',
        expectServerBoot: false
      },
      {
        description: 'when crashes during requests',
        apiDescriptionDocument: './test/fixtures/apiary.apib',
        server: `node test/fixtures/scripts/dummy-server-crash.js ${DEFAULT_SERVER_PORT}`,
        expectServerBoot: true
      },
      {
        description: 'when killed before requests',
        apiDescriptionDocument: './test/fixtures/single-get.apib',
        server: 'node test/fixtures/scripts/kill-self.js',
        expectServerBoot: false
      },
      {
        description: 'when killed during requests',
        apiDescriptionDocument: './test/fixtures/apiary.apib',
        server: `node test/fixtures/scripts/dummy-server-kill.js ${DEFAULT_SERVER_PORT}`,
        expectServerBoot: true
      }
    ]) {
      describe(scenario.description, () => {
        let cliInfo
        const args = [
          scenario.apiDescriptionDocument,
          `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
          `--server=${scenario.server}`,
          '--server-wait=1',
          '--loglevel=debug'
        ]

        before((done) =>
          runCLI(args, (err, info) => {
            cliInfo = info
            done(err)
          })
        )

        it('should inform about starting server with custom command', () =>
          assert.include(
            cliInfo.stderr,
            'Starting backend server process with command'
          ))
        if (scenario.expectServerBoot) {
          it("should redirect server's boot message", () =>
            assert.include(
              cliInfo.stdout,
              `Dummy server listening on port ${DEFAULT_SERVER_PORT}`
            ))
        }
        it('the server should not be running', (done) =>
          isProcessRunning('test/fixtures/scripts/', (err, isRunning) => {
            if (!err) {
              assert.isFalse(isRunning)
            }
            done(err)
          }))
        it('should report problems with connection to server', () =>
          assert.include(cliInfo.stderr, 'Error connecting to server'))
        it('should exit with status 1', () =>
          assert.equal(cliInfo.exitStatus, 1))
      })
    }

    describe("when didn't terminate and had to be killed by Dredd", () => {
      let cliInfo
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        `--server=node test/fixtures/scripts/dummy-server-ignore-term.js ${DEFAULT_SERVER_PORT}`,
        '--server-wait=1',
        '--loglevel=debug'
      ]

      before((done) =>
        runCLI(args, (err, info) => {
          cliInfo = info
          done(err)
        })
      )

      it('should inform about starting server with custom command', () =>
        assert.include(
          cliInfo.stderr,
          'Starting backend server process with command'
        ))
      it('should inform about gracefully terminating the server', () =>
        assert.include(
          cliInfo.stderr,
          'Gracefully terminating the backend server process'
        ))
      it("should redirect server's message about ignoring termination", () =>
        assert.include(cliInfo.stdout, 'ignoring termination'))
      it('should inform about forcefully killing the server', () =>
        assert.include(cliInfo.stderr, 'Killing the backend server process'))
      it('the server should not be running', (done) =>
        isProcessRunning('test/fixtures/scripts/', (err, isRunning) => {
          if (!err) {
            assert.isFalse(isRunning)
          }
          done(err)
        }))
      it('should exit with status 0', () => assert.equal(cliInfo.exitStatus, 0))
    })
  })
})
