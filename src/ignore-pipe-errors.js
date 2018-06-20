module.exports = function ignorePipeErrors(proc) {
  if (proc.stdin && proc.stdout && proc.stderr) {
    proc.stdout.on('error', () => {});
    proc.stderr.on('error', () => {});
    proc.stdin.on('error', () => {});
  }
};
