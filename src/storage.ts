import type {Column,Dataset} from './data';

export type StoredAnalysis={id:string;dataset:Dataset;columns:Column[];savedAt:string};
const databaseName='auto-eda-studio';
const storeName='analyses';

function openDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(databaseName,1);
    request.onupgradeneeded=()=>{request.result.createObjectStore(storeName,{keyPath:'id'})};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('브라우저 저장소를 열 수 없습니다.'));
  });
}

async function transaction<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(reason:unknown)=>void)=>void):Promise<T>{
  const db=await openDatabase();
  return new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(storeName,mode);
    const store=tx.objectStore(storeName);
    let result:T;
    tx.oncomplete=()=>{db.close();resolve(result)};
    tx.onerror=()=>{db.close();reject(tx.error||new Error('브라우저 저장소 작업에 실패했습니다.'))};
    run(store,value=>{result=value},reject);
  });
}

export function saveAnalysis(record:StoredAnalysis){return transaction<void>('readwrite',(store,resolve,reject)=>{const request=store.put(record);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)})}
export function loadAnalysis(id:string){return transaction<StoredAnalysis|undefined>('readonly',(store,resolve,reject)=>{const request=store.get(id);request.onsuccess=()=>resolve(request.result as StoredAnalysis|undefined);request.onerror=()=>reject(request.error)})}
export function deleteAnalysis(id:string){return transaction<void>('readwrite',(store,resolve,reject)=>{const request=store.delete(id);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)})}
