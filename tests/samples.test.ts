import{describe,it,expect}from'vitest';
import{readFileSync}from'node:fs';
import{parseText}from'../src/data';
const sample=(name:string)=>readFileSync(new URL(`../public/samples/${name}`,import.meta.url),'utf8');
describe('bundled samples',()=>{it('parses both wine sources and their combined size',()=>{const red=parseText(sample('winequality-red.csv'),'red',';',true),white=parseText(sample('winequality-white.csv'),'white',';',true);expect([red.rows.length,red.headers.length]).toEqual([1599,12]);expect([white.rows.length,white.headers.length]).toEqual([4898,12]);expect(red.rows.length+white.rows.length).toBe(6497);expect(red.errors).toEqual([]);expect(white.errors).toEqual([])});it('parses 18 naval fields without a header',()=>{const naval=parseText(sample('naval-data.txt'),'naval','space',false);expect([naval.rows.length,naval.headers.length]).toEqual([11934,18]);expect(naval.headers[16]).toBe('compressor_decay');expect(naval.errors).toEqual([])})});
