describe "blueprintAstToRuntime", () ->
  it 'shuold return an object'
  
  describe 'each array member', () ->
    it 'should be an object'
    it 'should have \'origin\' key'
    
    describe 'value under origin key', () ->
      it 'should be an object'
      [
        'resourceGroupName',
        'resourceName',
        'actionName',
        'exampleName'
      ].forEach (key) ->
        it 'should have key: ' + key


