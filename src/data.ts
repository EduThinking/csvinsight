import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type Kind='numeric'|'categorical'|'boolean'|'ordinal'|'datetime'|'text';
export type Column={id:string;name:string;kind:Kind;role:'feature'|'identifier'|'target'|'group'|'ignored';missing:number;unique:number};
export type Dataset={name:string;headers:string[];rows:(string|null)[][];errors:string[];source:string};
export const navalHeaders=['lever_position','ship_speed','gt_shaft_torque','gt_rpm','gas_generator_rpm','starboard_propeller_torque','port_propeller_torque','hp_turbine_exit_temperature','compressor_inlet_temperature','compressor_outlet_temperature','hp_turbine_exit_pressure','compressor_inlet_pressure','compressor_outlet_pressure','exhaust_pressure','turbine_injection_control','fuel_flow','compressor_decay','turbine_decay'];
const missing=new Set(['','NA','N/A','NULL','null','?']);
const clean=(v:unknown):string|null=>{const s=String(v??'').trim();return missing.has(s)?null:s.slice(0,10000)};
export function parseText(text:string,name:string,delimiter:'auto'|','|';'|'\t'|'space'='auto',header=true):Dataset{
  const errors:string[]=[];let matrix:string[][]=[];
  const first=text.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0];
  const sep=delimiter==='auto'?(first.includes(';')?';':first.includes('\t')?'\t':/^\s*[-+\d.eE]+(?:\s+[-+\d.eE]+){3,}/.test(first)?'space':','):delimiter;
  if(sep==='space') matrix=text.trim().split(/\r?\n/).filter(Boolean).map(x=>x.trim().split(/\s+/));
  else {const parsed=Papa.parse<string[]>(text.replace(/^\uFEFF/,''),{delimiter:sep,skipEmptyLines:'greedy'});matrix=parsed.data;errors.push(...parsed.errors.slice(0,20).map(e=>`행 ${(e.row??0)+1}: ${e.message}`));}
  if(!matrix.length)throw new Error('데이터 행을 찾지 못했습니다.');
  const width=matrix[0].length;
  if(width>500)throw new Error('열은 최대 500개까지 분석할 수 있습니다.');
  const headers=header?matrix.shift()!.map((x,i)=>x.trim()||`열 ${i+1}`):(sep==='space'&&width===18?navalHeaders:Array.from({length:width},(_,i)=>`열 ${i+1}`));
  if(!headers.length)throw new Error('열을 찾지 못했습니다.');
  const counts=new Map<string,number>();const uniqueHeaders=headers.map(x=>{const n=(counts.get(x)||0)+1;counts.set(x,n);return n===1?x:`${x} (${n})`});
  const rows:(string|null)[][]=[];
  for(let i=0;i<matrix.length;i++){const row=matrix[i];if(row.length!==width){errors.push(`행 ${i+(header?2:1)}: ${width}열이 필요하지만 ${row.length}열입니다.`);continue;}rows.push(row.map(clean));if(rows.length>50000||rows.length*width>2000000)throw new Error('50,000행 또는 2,000,000셀 제한을 넘었습니다.');}
  if(!rows.length)throw new Error('유효한 행이 없습니다.');
  return {name,headers:uniqueHeaders,rows,errors,source:'upload'};
}
export async function parseFile(file:File,delimiter:'auto'|','|';'|'\t'|'space'='auto',header=true,encoding='utf-8',sheet?:string):Promise<Dataset>{
  if(file.size>10*1024*1024)throw new Error('파일당 10 MiB 제한을 넘었습니다.');
  if(/\.xlsx$/i.test(file.name)){const book=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:false});const selected=sheet||book.SheetNames[0];if(!book.Sheets[selected])throw new Error('선택한 시트가 없습니다.');const table=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[selected],{header:1,defval:''});return parseText(Papa.unparse(table as string[][]),file.name,',',header)}
  if(!/\.(csv|tsv|txt)$/i.test(file.name))throw new Error('CSV, TSV, TXT, XLSX 파일만 지원합니다.');
  const raw=new TextDecoder(encoding).decode(await file.arrayBuffer());return parseText(raw,file.name,delimiter,header);
}
export function inferColumns(ds:Dataset):Column[]{return ds.headers.map((name,i)=>{const values=ds.rows.map(r=>r[i]).filter((x):x is string=>x!==null);const unique=new Set(values).size;const numeric=values.length>0&&values.every(v=>Number.isFinite(Number(v)));const bool=numeric&&unique<=2&&values.every(v=>v==='0'||v==='1');const datetime=!numeric&&values.length>0&&values.every(v=>/^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(v)&&!Number.isNaN(Date.parse(v)));const kind:Kind=bool?'boolean':numeric?'numeric':datetime?'datetime':unique>50&&unique>values.length*.8?'text':'categorical';const role=name==='ID'||name.toLowerCase().endsWith('_id')?'identifier':'feature';return{id:String(i),name,kind,role,missing:ds.rows.length-values.length,unique}})}
export function download(name:string,content:string,type:string){const link=document.createElement('a');const url=URL.createObjectURL(new Blob([content],{type}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function csvSafe(v:unknown){const s=String(v??'');return /^[=+@\t\r]/.test(s)?`'${s}`:s}
export function datasetToCsv(ds:Dataset,columns:Column[]){
  const value=(v:string|null,i:number)=>{
    if(v===null)return '';
    const kind=columns[i]?.kind;
    if((kind==='numeric'||kind==='ordinal'||kind==='boolean')&&Number.isFinite(Number(v)))return v;
    return /^[=+@\t\r]/.test(v)||(/^-(?!\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$)/.test(v))?`'${v}`:v;
  };
  return '\uFEFF'+Papa.unparse({fields:ds.headers,data:ds.rows.map(row=>row.map(value))},{newline:'\r\n'});
}
