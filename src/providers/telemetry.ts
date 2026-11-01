// src/providers/telemetry.ts
export interface TelemetryRecord {
  provider?: string; providerId?: string;
  model?: string; modelId?: string;
  tokensIn?: number; inputTokens?: number; promptTokens?: number;
  tokensOut?: number; outputTokens?: number; completionTokens?: number;
  latencyMs?: number; durationMs?: number;
  cost?: number; costUsd?: number;
  success?: boolean; ok?: boolean;
  timestamp?: string; at?: string; ts?: string;
  error?: string;
  [key: string]: unknown;
}
export interface TelemetryAggregate {
  count: number; requests: number; successes: number; failures: number;
  successRate: number; tokensIn: number; tokensOut: number; totalTokens: number;
  totalCost: number; avgLatencyMs: number; minLatencyMs?: number; maxLatencyMs?: number;
  byProvider: Record<string, TelemetryAggregate>; byModel: Record<string, TelemetryAggregate>;
}
export interface TelemetryFilter { provider?: string; providerId?: string; model?: string; modelId?: string; success?: boolean; since?: any; until?: any; }
interface Normalized { provider: string; model: string; tokensIn: number; tokensOut: number; latencyMs: number; cost: number; success: boolean; timestamp: string; error?: string; }
function num(v:any,f=0){ if(typeof v==='number'&&Number.isFinite(v))return v; if(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v)))return Number(v); return f;}
function bool(v:any,f=true){ if(typeof v==='boolean')return v; if(v===1||v==='1'||v==='true'||v==='ok'||v==='success')return true; if(v===0||v==='0'||v==='false'||v==='error'||v==='fail')return false; return f;}
function str(v:any,f=''){ if(v===undefined||v===null)return f; return String(v);}
function redact(v: any): string | undefined {
  if (v === undefined || v === null) return undefined;
  let s = String(v);
  // redact common secret patterns
  s = s.replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***');
  s = s.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***');
  s = s.replace(/(api[_-]?key|token|secret)\s*[:=]\s*["']?[^"'\s]+/gi, '$1=***');
  return s.slice(0, 200);
}
function toMs(v:any){ if(v instanceof Date)return v.getTime(); if(typeof v==='number')return v; if(typeof v==='string'){const t=Date.parse(v); if(Number.isFinite(t))return t; const n=Number(v); if(Number.isFinite(n))return n;} return Date.now();}
function norm(rec:TelemetryRecord):Normalized{
  return {
    provider: str(rec.provider??rec.providerId,'unknown'),
    model: str(rec.model??rec.modelId,'unknown'),
    tokensIn: num(rec.tokensIn??rec.inputTokens??rec.promptTokens,0),
    tokensOut: num(rec.tokensOut??rec.outputTokens??rec.completionTokens,0),
    latencyMs: num(rec.latencyMs??rec.durationMs,0),
    cost: num(rec.cost??rec.costUsd,0),
    success: bool(rec.success??rec.ok,true),
    timestamp: rec.timestamp||rec.at||rec.ts ? new Date(toMs(rec.timestamp??rec.at??rec.ts)).toISOString() : new Date().toISOString(),
    error: redact(rec.error),
  };
}
function newAgg(): any { return {count:0,successes:0,tokensIn:0,tokensOut:0,totalCost:0,latencySum:0,minLatencyMs:undefined,maxLatencyMs:undefined,byProvider:{},byModel:{}}; }
function add(a:any,r:Normalized){ a.count++; if(r.success)a.successes++; a.tokensIn+=r.tokensIn; a.tokensOut+=r.tokensOut; a.totalCost+=r.cost; a.latencySum+=r.latencyMs; if(a.minLatencyMs===undefined||r.latencyMs<a.minLatencyMs)a.minLatencyMs=r.latencyMs; if(a.maxLatencyMs===undefined||r.latencyMs>a.maxLatencyMs)a.maxLatencyMs=r.latencyMs;}
function finalize(a:any):TelemetryAggregate{
  const out:TelemetryAggregate={count:a.count,requests:a.count,successes:a.successes,failures:a.count-a.successes,successRate:a.count?a.successes/a.count:0,tokensIn:a.tokensIn,tokensOut:a.tokensOut,totalTokens:a.tokensIn+a.tokensOut,totalCost:a.totalCost,avgLatencyMs:a.count?a.latencySum/a.count:0,minLatencyMs:a.minLatencyMs,maxLatencyMs:a.maxLatencyMs,byProvider:{},byModel:{}};
  for(const k of Object.keys(a.byProvider)) out.byProvider[k]=finalize(a.byProvider[k]);
  for(const k of Object.keys(a.byModel)) out.byModel[k]=finalize(a.byModel[k]);
  return out;
}
function matches(r:Normalized,f:any){ if(!f)return true; if(typeof f==='string')return r.provider===f; if(f.provider||f.providerId){ if(r.provider!==String(f.provider??f.providerId))return false;} if(f.model||f.modelId){ if(r.model!==String(f.model??f.modelId))return false;} if(typeof f.success==='boolean'&&r.success!==f.success)return false; if(f.since!==undefined&&toMs(r.timestamp)<toMs(f.since))return false; if(f.until!==undefined&&toMs(r.timestamp)>toMs(f.until))return false; return true;}
export class TelemetryStore {
  private records:Normalized[]=[];
  private capacity?:number;
  constructor(opts?:{capacity?:number;now?:()=>Date}){ this.capacity=opts?.capacity; }
  record(input:any,...rest:any[]):any{
    let recs:TelemetryRecord[]=[];
    if(Array.isArray(input)){ recs=input.map(x=> (x&&typeof x==='object')?x:{}); }
    else if(typeof input==='string'){
      recs=[{provider:input,model:rest[0],tokensIn:rest[1],tokensOut:rest[2],latencyMs:rest[3],cost:rest[4],success:rest[5]}];
    } else if(input&&typeof input==='object'){
      const obj:any={...input};
      if(rest.length>0){
        if(rest[0]!==undefined && obj.model===undefined && obj.modelId===undefined) obj.model=rest[0];
        if(rest[1]!==undefined) obj.tokensIn=rest[1];
        if(rest[2]!==undefined) obj.tokensOut=rest[2];
        if(rest[3]!==undefined) obj.latencyMs=rest[3];
        if(rest[4]!==undefined) obj.cost=rest[4];
        if(rest[5]!==undefined) obj.success=rest[5];
      }
      recs=[obj];
    } else { recs=[{}]; }
    const normalized=recs.map(norm);
    for(const n of normalized){ this.records.push(n); if(this.capacity&&this.records.length>this.capacity) this.records.splice(0,this.records.length-this.capacity);}
    return Array.isArray(input)?normalized:normalized[0];
  }
  getRecords(filter?:any){ return this.records.filter(r=>matches(r,filter)); }
  getStats(filter?:any):TelemetryAggregate {
    const recs=this.getRecords(filter);
    const agg=newAgg();
    const byP:Record<string,any>={}; const byM:Record<string,any>={};
    for(const r of recs){ add(agg,r); if(!byP[r.provider])byP[r.provider]=newAgg(); add(byP[r.provider],r); const k=r.provider+'/'+r.model; if(!byM[k])byM[k]=newAgg(); add(byM[k],r);}
    agg.byProvider=byP; agg.byModel=byM;
    const out=finalize(agg);
    for(const k of Object.keys(byP)) out.byProvider[k]=finalize(byP[k]);
    for(const k of Object.keys(byM)) out.byModel[k]=finalize(byM[k]);
    return out;
  }
  stats(f?:any){return this.getStats(f);}
  list(f?:any){return this.getRecords(f);}
  all(){return [...this.records];}
  clear(){this.records=[];}
  reset(){this.clear();}
  size(){return this.records.length;}
}
const defaultStore=new TelemetryStore();
export function record(...args:any[]):any{ return (defaultStore.record as any)(...args); }
export function getStats(filter?:any):TelemetryAggregate{ return defaultStore.getStats(filter); }
export function getRecords(filter?:any){ return defaultStore.getRecords(filter); }
export function clearTelemetry(){ defaultStore.clear(); }
export function resetTelemetry(){ defaultStore.reset(); }
export default {TelemetryStore,record,getStats,getRecords,clearTelemetry,resetTelemetry};
