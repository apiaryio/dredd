after('Machines > Machines collection > Get Machines', (transaction) => {
  transaction.fail = 'failed in sandboxed hook';
});
