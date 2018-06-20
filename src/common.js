function ignorePipeErrors(proc) {
  proc.stdin.on('error', () => {});
  proc.stdout.on('error', () => {});
  proc.stderr.on('error', () => {});
}

module.exports = { ignorePipeErrors };
