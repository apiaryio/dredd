after('Machines > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});