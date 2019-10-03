// On Windows, killing stdin / stdout / stderr pipes intentionally
// on either side can result `uncaughtException` causing
// dredd main process exiting with exitCode 7 instead of 1. This _fix_
// remedies the issue.
export default function ignorePipeErrors(proc) {
  if (proc.stdout) proc.stdout.on('error', () => {});
  if (proc.stderr) proc.stderr.on('error', () => {});
  if (proc.stdin) proc.stdin.on('error', () => {});
}
