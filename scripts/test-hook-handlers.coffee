# Spawns dependent integration builds of hook handlers with current Dredd,
# where 'current Dredd' means whatever is currently in its repository under
# the last commit on currently active branch.
#
# Purpose:
#   Thanks to this we can be sure we did not break hook handler implementations
#   with a new version of Dredd or with a major refactoring.
#
# Usage:
#   The script is automatically ran by Travis CI in one of the builds in
#   the build matrix every time the tested commit is tagged:
#
#       $ npm version
#       $ git push origin ... --tags
#
#   When testing commits without tag, you can magically trigger these
#   integration tests by writing 'tests hook handlers' into the commit message:
#
#       $ git commit -m 'Fixes everything, closes #123, tests hook handlers.'
#       $ git push origin ...
#
# How it works:
#   1. Every time commit is pushed to GitHub, Travis CI automatically starts
#      a new build.
#   2. The build is defined by contents of `.travis.yml`. It runs regular tests
#      and then runs this script, `npm run test:hook-handlers`.
#   3. This script...
#       1. makes sure it is ran for just one build run within the build matrix.
#       2. checks whether hook handler integration tests were triggered or not.
#          **If the tested commit has tag or its commit message contains words
#          "tests hook handlers", it continues.** Otherwise it skips the tests
#          (ends immediately with 0 exit status code).
#       3. creates special dependent integration branches for each hook handler
#          implementation. In these branches, it takes whatever is in master
#          branch of the hook handler repository with the only difference that
#          instead of `npm i -g dredd` it links the Dredd from currently tested
#          commit.
#       4. pushes these dependent branches to GitHub, which triggers dependent
#          Travis CI builds.
#       5. polls for results of the dependent Travis CI builds.
#       6. evaluates results of dependent builds and if any of them didn't pass,
#          the script exits with non-zero code.
#       7. makes sure it deletes the dependent git branches from GitHub before
#          exiting.
#
# Known issues:
#   * If `master` branch of hook handler repository becomes red, this whole
#     build will fail and we won't be able to release new version of Dredd
#     (not with green status). Instead, we should integrate with commit
#     corresponding to the latest release of the hook handler implementation.
#   * If the main Travis CI build where the script is being ran gets canceled,
#     the script won't cleanup the dependent branches on GitHub.


fs = require 'fs'
execSync = require 'sync-exec'
{exec} = require 'child_process'
async = require 'async'
yaml = require 'js-yaml'


unless process.env.CI
  console.error ''' \
    This script is meant to be ran on Travis CI. It is not optimized (yet) for
    local usage. It could mess up your Git repository.
  '''
  process.exit 1


################################################################################
##                                  SETTINGS                                  ##
################################################################################

JOBS = [
    name: 'ruby-hooks-handler'
    repo: 'https://github.com/apiaryio/dredd-hooks-ruby.git'
  ,
    name: 'python-hooks-handler'
    repo: 'https://github.com/apiaryio/dredd-hooks-python.git'
  ,
    name: 'php-hooks-handler'
    repo: 'https://github.com/ddelnano/dredd-hooks-php.git'
  ,
    name: 'perl-hooks-handler'
    repo: 'https://github.com/ungrim97/Dredd-Hooks.git'
]

TRIGGER_KEYWORD = 'tests hook handlers' # inspired by https://help.github.com/articles/closing-issues-via-commit-messages/
LINKED_DREDD_DIR = './__dredd__'
RE_DREDD_INSTALL_CMD = /npm ([ \-=\w]+ )?i(nstall)? ([ \-=\w]+ )?dredd/
DREDD_LINK_CMD = "npm link --python=python2 #{LINKED_DREDD_DIR}"


################################################################################
##                                   HELPERS                                  ##
################################################################################

# Redirects both stderr and strout to /dev/null. Should be added to all commands
# dealing with GitHub token so the token won't be disclosed in build output
# in case of errors.
DROP_OUTPUT = '> /dev/null 2>&1'


# Returns trimmed stdout for given execSync result.
getTrimmedStdout = (execSyncResult) ->
  execSyncResult?.stdout?.trim?() or ''


# Moves contents of the root directory to given directory. Ignores given
# excluded paths.
moveAllFilesTo = (directory, excludedPaths = []) ->
  excludedPaths.push directory

  # Make sure directory exists and is empty.
  execSync 'rm -rf ' + directory
  execSync 'mkdir ' + directory

  excludes = buildFindExcludes excludedPaths
  execSync "find . #{excludes} -exec mv -t '#{directory}' '{}' + #{DROP_OUTPUT}"


# Takes ['./a', './b'] and produces "-not -path './a' -and -not -path './b'"
buildFindExcludes = (excludedPaths) ->
  expressions = excludedPaths.map (path) -> "-not -path '#{path}'"
  return expressions.join ' -and '


# Replaces given pattern with replacement in given file. Returns boolean whether
# any changes were made.
replaceInFile = (file, pattern, replacement) ->
  contents = fs.readFileSync file, 'utf-8'
  unless contents.match pattern
    return false
  contents = contents.replace pattern, replacement
  fs.writeFileSync file, contents, 'utf-8'
  return true


# Waits until the latest Travis CI build finishes on given Dredd's Git branch.
# Provides status in the callback (should be either 'errored' or 'passed', but
# who knows).
pollForBuildResult = (branch, callback) ->
  command = """travis history \
    --repo apiaryio/dredd \
    --branch #{branch} \
    --limit 1 \
    --no-interactive
  """

  process.stdout.write '.' # poor man's progress bar
  exec command, (err, stdout) ->
    return callback err if err

    status = parseBuildStatus stdout
    if status not in ['created', 'started']
      return callback null, status

    setTimeout ->
      pollForBuildResult branch, callback
    , 120000


# Takes output of 'travis history' command (see
# https://github.com/travis-ci/travis.rb#history) and parses out build status.
parseBuildStatus = (stdout) ->
  stdout = stdout.toString() if Buffer.isBuffer stdout
  match = stdout.match /^#\d+ (\w+):/
  match[1]


# Exits the script in case Travis CI CLI isn't installed.
requireTravisCli = ->
  unless getTrimmedStdout execSync 'which travis'
    console.error 'The travis command could not be found. Run \'gem install travis\'.'
    process.exit 1


# If Git author is empty, sets the commiter of the last commit as an author.
ensureGitAuthor = ->
  name = getTrimmedStdout execSync 'git show --format="%cN" -s'
  console.log "Setting Git user name to '#{name}'."
  execSync "git config user.name '#{name}'"

  email = getTrimmedStdout execSync 'git show --format="%cE" -s'
  console.log "Setting Git e-mail to '#{email}'."
  execSync "git config user.email '#{email}'"


# Adds remote origin URL with GitHub token so the script is able to could push
# to the Dredd repository. GitHub token is encrypted in Dredd's .travis.yml.
ensureGitOrigin = ->
  if process.env.GITHUB_TOKEN
    console.log 'Applying GitHub token.'
    repo = "https://#{process.env.GITHUB_TOKEN}@github.com/apiaryio/dredd.git"
    execSync "git remote set-url origin #{repo} #{DROP_OUTPUT}"


# Ensures that Git repository is set to given branch and it's clean.
cleanGit = (branch) ->
  execSync 'git checkout ' + branch
  execSync 'git reset HEAD --hard'


# Deletes given branches both locally and remotely on GitHub.
deleteGitBranches = (branches) ->
  for branch in branches
    console.log "Deleting #{branch} from GitHub..."
    execSync 'git branch -D ' + branch
    execSync "git push origin -f --delete #{branch} #{DROP_OUTPUT}"


# Lists Node versions defined in the .travis.yml config file.
listTestedNodeVersions = ->
  contents = fs.readFileSync '.travis.yml'
  config = yaml.safeLoad contents
  return config.node_js


# Retrieves full commit message.
getGitCommitMessage = (commitHash) ->
  getTrimmedStdout execSync 'git log --format=%B -n 1 ' + commitHash


# Returns tag name if given commit is tagged. TRAVIS_TAG environment variable
# is present only in special builds Travis CI starts separately for new tags.
getGitCommitTag = (commitHash) ->
  return process.env.TRAVIS_TAG if process.env.TRAVIS_TAG
  latestTag = getTrimmedStdout execSync 'git describe --abbrev=0 --tags'
  taggedCommit = getTrimmedStdout execSync 'git rev-list -n 1 ' + latestTag
  return latestTag if commitHash is taggedCommit


# Aborts this script in case it finds out that conditions to run this script
# are not satisfied. The script should run only if it was triggered by the
# tested commit being tagged or by a keyword in the commit message.
abortIfNotTriggered = ->
  reason = null

  # We do not want to run integration tests of hook handlers for every node
  # version in the matrix. One node version is perfectly enough as
  # the dependent builds will be performed on the default version Travis CI
  # provides anyway (.travis.yml of dependent repositories usually do not
  # specify node version, they care about Ruby, Python, ... versions).
  nodeVersionTestedAsFirst = listTestedNodeVersions()[0]
  if process.env.TRAVIS_NODE_VERSION isnt nodeVersionTestedAsFirst
    reason = "They run only in builds with Node #{nodeVersionTestedAsFirst}."
  else
    # Integration tests are triggered only if the tested commit is tagged or
    # it's message contains trigger keyword. If this is not the case, abort
    # the script.
    commitHash = process.env.TRAVIS_COMMIT
    tag = getGitCommitTag commitHash
    message = getGitCommitMessage commitHash

    if tag
      console.log "Tested commit (#{commitHash}) is tagged as '#{tag}'."
    else if message.toLowerCase().indexOf(TRIGGER_KEYWORD) isnt -1
      console.log "Message of tested commit (#{commitHash}) contains '#{TRIGGER_KEYWORD}'."
    else
      reason = "Tested commit (#{commitHash}) isn't tagged and its message doesn't contain keyword '#{TRIGGER_KEYWORD}'."

  # There is a reason to abort the script, so let's do it.
  if reason
    console.error 'Skipping integration tests of hook handlers. ' + reason
    process.exit 0


# Waits for results from dependent builds. Its callback gets results in form
# of object where keys are integration branches and values are resulting build
# statuses.
waitForResults = (integrationBranches, callback) ->
  # Waiting 2 minutes at the beginning so Travis CI has time to pick up
  # dependent builds from GitHub.
  setTimeout ->
    polling = {}
    integrationBranches.forEach (branch) ->
      polling[branch] = (next) -> pollForBuildResult branch, next

    async.parallel polling, (err, results) ->
      console.log '\n' # 'pollForBuildResult' prints dots without newline
      callback err, results
  , 120000


################################################################################
##                                   MAIN                                     ##
################################################################################

abortIfNotTriggered()
requireTravisCli()


ensureGitAuthor()
ensureGitOrigin()


integrationBranches = []
testedBranch = process.env.TRAVIS_BRANCH
buildId = process.env.TRAVIS_BUILD_ID


JOBS.forEach ({name, repo}) ->
  integrationBranch = "dependent-build/#{buildId}/#{name}"
  integrationBranches.push integrationBranch
  console.log "Preparing branch #{integrationBranch}..."

  # Prepare a special integration branch
  cleanGit testedBranch
  execSync 'git checkout -B ' + integrationBranch

  # Move contents of the root directory to the directory for linked Dredd and
  # commit this change.
  moveAllFilesTo LINKED_DREDD_DIR, ['./.git', './.git/*']
  execSync 'git add -A && git commit -m "Moving Dredd to directory."'

  # Add Git remote with the repository being integrated. Merge its master
  # branch with what's in current branch. After this, we have contents of the
  # remote repo plus one extra directory, which contains current Dredd.
  execSync "git remote add #{name} #{repo} --fetch"
  execSync "git merge #{name}/master --no-edit"

  # Replace installation of Dredd in .travis.yml with a command which links
  # Dredd from the directory we created. Commit the change.
  unless replaceInFile '.travis.yml', RE_DREDD_INSTALL_CMD, DREDD_LINK_CMD
    console.error 'Could not find Dredd installation command in .travis.yml.', contents
    process.exit 1
  execSync 'git commit -am "Using linked Dredd."'

  # Push the integration branch to GitHub and clean the repository.
  console.log "Pushing #{integrationBranch} to GitHub..."
  execSync "git push origin #{integrationBranch} -f #{DROP_OUTPUT}"
  cleanGit testedBranch


# Poll for results and evaluate them.
console.log "Waiting for dependent builds..."
waitForResults integrationBranches, (err, results) ->
  console.log 'All dependent builds finished!'

  if err
    console.error err.message, err
    deleteGitBranches integrationBranches
    process.exit 1

  failed = false
  for own integrationBranch, result of results
    console.log "* #{integrationBranch}: #{result}"
    failed = true if result isnt 'passed'

  deleteGitBranches integrationBranches
  process.exit if failed then 1 else 0
