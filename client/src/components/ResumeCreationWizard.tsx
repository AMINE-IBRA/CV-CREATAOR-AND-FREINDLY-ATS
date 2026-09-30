import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Sparkles, Upload, Copy, ChevronLeft, Loader2, Check } from 'lucide-react';
import AppLayout from './AppLayout';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Resume } from '../types/resume';
import { normalizeResume, resumePayload, resumeToText } from '../types/resume';
import { TEMPLATE_LIST } from './templates/ResumeTemplates';
type Mode='scratch'|'ai'|'import'|'clone';
const modes=[{id:'scratch' as const,label:'Start from scratch',text:'Build your CV one section at a time.',icon:FileText},{id:'ai' as const,label:'Build with AI',text:'Turn your actual experience into a first draft.',icon:Sparkles},{id:'import' as const,label:'Import an existing CV',text:'Upload PDF, DOCX, TXT or a resume JSON file.',icon:Upload},{id:'clone' as const,label:'Use an existing resume',text:'Make a separate copy for a new application.',icon:Copy}];
export default function ResumeCreationWizard(){
  const navigate=useNavigate();const [params]=useSearchParams();const toast=useToast();const {user}=useAuth();
  const [mode,setMode]=useState<Mode>(params.has('clone')?'clone':'scratch');
  const [template,setTemplate]=useState(params.get('template')||'classic-professional');
  const [title,setTitle]=useState('My Resume'),[name,setName]=useState(user?.name||''),[role,setRole]=useState('');
  const [source,setSource]=useState(''),[cloneId,setCloneId]=useState(params.get('clone')||'');
  const [existing,setExisting]=useState<Resume[]>([]),[draft,setDraft]=useState<Resume|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[aiConfigured,setAiConfigured]=useState<boolean|null>(null);
  const creating=useRef(false);const [imported,setImported]=useState<Partial<Resume>|null>(null);
  useEffect(()=>{let active=true;void api.get<{resumes:Resume[]}>('/resumes').then(r=>{if(active)setExisting(r.resumes);}).catch(()=>{});void api.get<{aiConfigured?:boolean;ai?:{configured:boolean}}>('/config').then(r=>{if(active)setAiConfigured(Boolean(r.aiConfigured??r.ai?.configured));}).catch(()=>{if(active)setAiConfigured(false);});return()=>{active=false;};},[]);
  const allowedTemplate=template==='classic-professional'||template==='modern-minimalist'||template==='two-column'||user?.plan==='pro'||user?.plan==='premium';
  async function readFile(file:File){
    setError('');setBusy(true);setImported(null);
    try{
      if(file.size>10*1024*1024)throw new Error('Please choose a file smaller than 10 MB.');
      const extension=file.name.split('.').pop()?.toLowerCase();
      if(extension==='json'){
        const json:unknown=JSON.parse(await file.text());if(!json||typeof json!=='object'||Array.isArray(json))throw new Error('This JSON file must contain a resume object.');
        const candidate=json as {resume?:Partial<Resume>};const parsed=candidate.resume||json as Partial<Resume>;setImported(parsed);setSource(resumeToText(normalizeResume(parsed)));
      }else if(extension==='txt'){setSource(await file.text());}
      else if(extension==='pdf'||extension==='docx'){
        const form=new FormData();form.append('file',file);
        const result=await api.upload<{text:string}>('/upload/resume',form);setSource(result.text);
      }else throw new Error('Choose a PDF, DOCX, TXT or JSON file.');
    }catch(err){setError(err instanceof Error?err.message:'Could not read the file');}finally{setBusy(false);}
  }
  async function prepare(useAI:boolean){
    if(!allowedTemplate){setError('This template requires a Pro plan. Choose a free template or see plans.');return;}
    if(!title.trim()){setError('Give your resume a title.');return;}
    setError('');setBusy(true);
    try{
      let data:Partial<Resume>={};
      if(mode==='clone'){
        if(!cloneId)throw new Error('Choose the resume you want to copy.');
        const result=await api.get<{resume:Resume}>(`/resumes/${cloneId}`);data=result.resume;
      }else if(mode==='import'&&imported)data=imported;
      else if(useAI){
        if(!source.trim())throw new Error('Add your experience or extracted CV text first.');
        const result=await api.post<Partial<Resume>&{resume?:Partial<Resume>}>(mode==='import'?'/ai/import-resume':'/ai/generate-resume',mode==='import'?{text:source}:{basicInfo:`Name: ${name}\nTarget role: ${role}\n${source}`});data=result.resume||result;
      }else if(mode==='import'){
        if(!source.trim())throw new Error('Upload a file or paste your CV text first.');
        if(source.length>12000)throw new Error('This CV is too long for a single summary. Use AI to organize it, or shorten the reviewed text to 12,000 characters before continuing manually.');
        data={summary:source};
      }
      const config=TEMPLATE_LIST.find(t=>t.id===template)||TEMPLATE_LIST[0];
      setDraft(normalizeResume({...data,id:'',userId:user?.id||'',title:title.trim(),templateId:config.id,accentColor:config.accentColor,fontFamily:config.font,fullName:data.fullName||name,professionalTitle:data.professionalTitle||role,targetRole:role||data.targetRole}));
    }catch(err){setError(err instanceof Error?err.message:'Could not prepare your resume');}finally{setBusy(false);}
  }
  async function create(){
    if(!draft||creating.current)return;creating.current=true;setBusy(true);setError('');
    try{const {resume}=await api.post<{resume:Resume}>('/resumes',resumePayload(draft));toast.success('Resume created','Your original resume and uploaded file remain unchanged.');navigate(`/resumes/${resume.id}/edit`,{replace:true});}catch(err){setError(err instanceof Error?err.message:'Could not create resume');creating.current=false;}finally{setBusy(false);}
  }
  return <AppLayout><div className="max-w-4xl mx-auto pb-12">
    <button onClick={()=>draft?setDraft(null):navigate('/dashboard')} className="btn-ghost btn-sm mb-5"><ChevronLeft className="w-4 h-4"/>{draft?'Back to setup':'Dashboard'}</button>
    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{draft?'Review your first draft':'Create your resume'}</h1><p className="text-slate-500 dark:text-slate-400 mt-2 mb-7">{draft?'Check names, dates and claims before you save. You can edit every section next.':'Choose how you would like to start.'}</p>
    {error&&<div role="alert" className="mb-5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">{error}</div>}
    {draft?<div className="card p-6 space-y-5"><div className="grid sm:grid-cols-2 gap-4"><label className="label">Resume title<input className="input mt-1" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label className="label">Full name<input className="input mt-1" value={draft.fullName||''} onChange={e=>setDraft({...draft,fullName:e.target.value})}/></label></div><pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed max-h-[55vh] overflow-auto p-5 bg-slate-50 dark:bg-slate-900 rounded-xl">{resumeToText(draft)||'Your blank resume is ready. Add your experience in the editor.'}</pre>{mode==='import'&&!imported&&draft.summary===source&&<p className="text-sm text-amber-700 dark:text-amber-400">Your extracted text is kept in the summary so no content is lost. Move it into the correct sections in the editor, or go back and use AI to organize it.</p>}<label className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-green-600 mt-0.5"/><span>Only include information you can support. AI drafts need your review.</span></label><button onClick={create} disabled={busy||!draft.title.trim()} className="btn-primary">{busy?<Loader2 className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>}Confirm and open editor</button></div>:<>
      <div className="grid sm:grid-cols-2 gap-4 mb-7">{modes.map(item=><button key={item.id} onClick={()=>{setMode(item.id);setError('');}} className={`card p-5 text-left border-2 transition ${mode===item.id?'border-blue-500 bg-blue-50 dark:bg-blue-950/30':'border-transparent hover:border-slate-300'}`}><item.icon className="w-6 h-6 text-blue-600 mb-3"/><h2 className="font-semibold text-slate-900 dark:text-white">{item.label}</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.text}</p></button>)}</div>
      <div className="card p-6 space-y-5"><div className="grid sm:grid-cols-2 gap-4"><label className="label">Resume title<input className="input mt-1" value={title} onChange={e=>setTitle(e.target.value)} maxLength={150}/></label><label className="label">Template<select className="input mt-1" value={template} onChange={e=>setTemplate(e.target.value)}>{TEMPLATE_LIST.map(t=><option key={t.id} value={t.id}>{t.name}{!['classic-professional','modern-minimalist','two-column'].includes(t.id)?' · Pro':''}</option>)}</select></label><label className="label">Full name<input className="input mt-1" value={name} onChange={e=>setName(e.target.value)}/></label><label className="label">Target role<input className="input mt-1" value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Frontend Developer"/></label></div>
      {!allowedTemplate&&<p className="text-sm text-amber-700">Choose one of the three free templates or <a className="underline" href="/pricing">see Pro plans</a>.</p>}
      {mode==='clone'&&<label className="label">Existing resume<select className="input mt-1" value={cloneId} onChange={e=>setCloneId(e.target.value)}><option value="">Choose a resume</option>{existing.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select>{existing.length===0&&<span className="block mt-2 text-slate-500 font-normal">No saved resumes yet. Start from scratch.</span>}</label>}
      {mode==='import'&&<label className="label">Choose a CV file<input className="input mt-1" type="file" accept=".pdf,.docx,.txt,.json" onChange={e=>{const file=e.target.files?.[0];if(file)void readFile(file);}}/></label>}
      {(mode==='ai'||mode==='import')&&<label className="label">{mode==='import'?'Review extracted text or paste your CV':'Your real experience, education, skills and achievements'}<textarea className="textarea mt-1 min-h-[180px]" value={source} onChange={e=>{setSource(e.target.value);if(imported)setImported(null);}} placeholder="Include dates and verified achievements. Unknown details can stay blank." maxLength={60000}/></label>}
      {(mode==='ai'||mode==='import')&&aiConfigured===false&&<p role="status" className="text-sm text-amber-700 dark:text-amber-400">AI is not configured on this server. You can still create and edit your resume manually.</p>}
      <div className="flex flex-wrap gap-3">{(mode==='ai'||mode==='import'&&!imported)&&<button onClick={()=>void prepare(true)} disabled={busy||aiConfigured===false} className="btn-primary">{busy?<Loader2 className="w-4 h-4 animate-spin"/>:<Sparkles className="w-4 h-4"/>}{mode==='import'?'Organize with AI':'Generate draft'}</button>}<button onClick={()=>void prepare(false)} disabled={busy} className={mode==='scratch'||mode==='clone'||imported?'btn-primary':'btn-secondary'}>{busy?<Loader2 className="w-4 h-4 animate-spin"/>:<FileText className="w-4 h-4"/>}{mode==='ai'||mode==='import'&&!imported?'Continue manually':'Review draft'}</button></div>
      </div>
    </>}
  </div></AppLayout>;
}
