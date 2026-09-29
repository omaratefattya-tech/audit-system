/* P10-F05: parse Excel off the UI thread; business mapping stays in app.js. */
'use strict';
try{
  importScripts('../../vendor/sheetjs/xlsx-0.20.3.full.min.js');
}catch(error){
  self.postMessage({ok:false,kind:'infrastructure',error:error?.message || String(error)});
}
function workerRawMaterialsCell(sheet,rowIndex,colIndex){
  const address=XLSX.utils.encode_cell({r:rowIndex,c:colIndex});
  const cell=sheet[address];
  if(!cell) return '';
  if(cell.w!==undefined && cell.w!==null && String(cell.w).trim()!=='') return cell.w;
  return cell.v ?? '';
}
function workerRawMaterialsSheetMatrix(sheet){
  const ref=sheet?.['!ref'];
  if(!ref) return {matrix:[],columnCount:0,startRow:0,startCol:0};
  const range=XLSX.utils.decode_range(ref);
  const matrix=[];
  for(let r=range.s.r;r<=range.e.r;r++){
    const row=[];
    for(let c=range.s.c;c<=range.e.c;c++) row.push(workerRawMaterialsCell(sheet,r,c));
    matrix.push(row);
  }
  return {matrix,columnCount:range.e.c-range.s.c+1,startRow:range.s.r,startCol:range.s.c};
}
self.onmessage=event=>{
  const {buffer,mode,options={}}=event?.data || {};
  try{
    if(!self.XLSX) throw new Error('مكتبة Excel غير متوفرة داخل المعالج الخلفي.');
    if(!(buffer instanceof ArrayBuffer)) throw new Error('ملف Excel غير صالح للقراءة.');
    if(mode==='balance_match'){
      const workbook=XLSX.read(buffer,{type:'array',cellDates:false,cellNF:true,sheetRows:20002});
      const sheetName=options.sheetName || workbook.SheetNames[0];
      const sheet=workbook.Sheets[sheetName];
      if(!sheet?.['!ref']) throw new Error('ورقة Excel فارغة.');
      const range=XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
      if(range.e.r>=20001 || range.e.c>=100) throw new Error('الحد الأقصى 20000 صف بيانات و100 عمود؛ احذف التنسيق الزائد إن وجد.');
      const matrix=[];
      for(let r=0;r<=range.e.r;r++){
        const row=[];
        for(let c=0;c<=range.e.c;c++){
          const cell=sheet[XLSX.utils.encode_cell({r,c})];
          // Preserve leading zeroes in formatted material codes, never evaluate formulas.
          row.push(cell?.t==='e' ? '#EXCEL_ERROR!' : cell?.t==='n' && /^0+$/.test(cell.z||'') ? cell.w : cell?.v ?? '');
        }
        matrix.push(row);
      }
      self.postMessage({ok:true,result:{sheetNames:workbook.SheetNames,sheetName,matrix}});
      return;
    }
    if(mode==='rows'){
      const workbook=XLSX.read(buffer,{type:'array',cellDates:true});
      const sheet=workbook.Sheets[workbook.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});
      self.postMessage({ok:true,result:{rows}});
      return;
    }
    if(mode==='raw_materials'){
      const workbook=XLSX.read(buffer,{type:'array',cellDates:true});
      const sheetName=String(options.sheetName || 'Data');
      const sheet=workbook.Sheets[sheetName];
      if(!sheet){ self.postMessage({ok:true,result:{sheetMissing:true,sheetName}});return; }
      self.postMessage({ok:true,result:{sheetMissing:false,sheetName,...workerRawMaterialsSheetMatrix(sheet)}});
      return;
    }
    if(mode==='inventory_closing'){
      const workbook=XLSX.read(buffer,{type:'array',cellDates:false});
      const date1904=workbook?.Workbook?.WBProps?.date1904===true;
      const sheetName=workbook.SheetNames[0];
      const sheet=workbook.Sheets[sheetName];
      if(!sheet) throw new Error('الملف لا يحتوي على أوراق صالحة.');
      const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null});
      self.postMessage({ok:true,result:{matrix,date1904}});
      return;
    }
    throw new Error('نوع تحليل Excel غير مدعوم.');
  }catch(error){
    self.postMessage({ok:false,kind:'parse',error:error?.message || String(error)});
  }
};
