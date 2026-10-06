import{describe,it,expect}from'vitest';
import * as XLSX from'xlsx';
import Papa from'papaparse';
import{datasetToCsv,inferColumns,parseFile,parseText}from'../src/data';

describe('CSV conversion',()=>{
  it('converts semicolon, tab and space separated data',()=>{
    for(const [text,delimiter,header] of [
      ['a;b\n1;two',';',true],
      ['a\tb\n1\ttwo','\t',true],
      ['1 two\n2 three','space',false],
    ] as const){
      const ds=parseText(text,'source.txt',delimiter,header);
      const csv=datasetToCsv(ds,inferColumns(ds));
      const parsed=Papa.parse<string[]>(csv.replace(/^\uFEFF/,''),{header:false}).data;
      expect(parsed.slice(1)).toEqual(ds.rows);
    }
  });
  it('converts an xlsx sheet to CSV',async()=>{
    const sheet=XLSX.utils.aoa_to_sheet([['name','score'],['wine',7]]);
    const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Data');
    const bytes=XLSX.write(book,{bookType:'xlsx',type:'array'}) as ArrayBuffer;
    const file=new File([bytes],'example.xlsx');
    const ds=await parseFile(file);
    expect(Papa.parse<string[]>(datasetToCsv(ds,inferColumns(ds)).replace(/^\uFEFF/,'')).data).toEqual([['name','score'],['wine','7']]);
  });
  it('escapes formula-like text while keeping numeric negatives',()=>{
    const ds=parseText('label,amount\n=SUM(1),-2\n-unsafe,3','source.csv');
    const csv=datasetToCsv(ds,inferColumns(ds));
    expect(csv).toContain("'=SUM(1)");
    expect(csv).toContain("'-unsafe");
    expect(csv).toContain(',-2');
  });
});
