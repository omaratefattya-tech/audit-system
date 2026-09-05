(function permissionDataLoaderModule(globalScope){
  'use strict';

  const PAGE_SIZE=500;

  // Read-only pagination for the P3/P6 management screens. Publish no partial result.
  async function readAll(client,table,columns,options={}){
    const keys=options.keys||['id'];
    const order=[...(options.order||[])];
    keys.forEach(key=>{
      if(!order.some(([column])=>column===key)) order.push([key,true]);
    });
    const rows=[];
    const seen=new Set();
    let expectedCount=null;
    do{
      let query=client.from(table).select(columns,{count:'exact'});
      order.forEach(([column,ascending=true])=>{ query=query.order(column,{ascending}); });
      const {data,error,count}=await query.range(rows.length,rows.length+PAGE_SIZE-1);
      if(error) throw error;
      if(!Array.isArray(data) || !Number.isSafeInteger(count) || count<0 || data.length>PAGE_SIZE){
        throw new Error('PERMISSION_DATA_INCOMPLETE');
      }
      if(expectedCount!==null && count!==expectedCount) throw new Error('PERMISSION_DATA_CHANGED');
      expectedCount=count;
      if(rows.length+data.length>expectedCount || (!data.length && rows.length<expectedCount)){
        throw new Error('PERMISSION_DATA_INCOMPLETE');
      }
      data.forEach(row=>{
        if(!row || keys.some(key=>row[key]===null || row[key]===undefined || row[key]==='')){
          throw new Error('PERMISSION_DATA_INCOMPLETE');
        }
        const identity=JSON.stringify(keys.map(key=>row[key]));
        if(seen.has(identity)) throw new Error('PERMISSION_DATA_CHANGED');
        seen.add(identity);
        rows.push(row);
      });
    }while(rows.length<expectedCount);
    return {data:rows,error:null,count:expectedCount};
  }

  globalScope.AuditPermissionData=Object.freeze({readAll});
})(typeof globalThis!=='undefined' ? globalThis : window);
