setTimeout(() => {
  process.kill(process.pid, 'SIGKILL');
}, 100);
