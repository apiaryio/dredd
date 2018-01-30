require('./handle-windows-sigint')();


const ignore = () => console.log('ignoring termination');

process.on('SIGTERM', ignore);
process.on('SIGINT', ignore);


setInterval(( function() { }), 1000);
