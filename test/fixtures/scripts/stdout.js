require('./handle-windows-sigint')();


const exit = function() {
  process.stdout.write('exiting\n');
  return process.exit(0);
};

process.on('SIGTERM', exit);
process.on('SIGINT', exit);


process.stdout.write('standard output text\n');
setInterval(( function() { }), 100);
