import { useCallback, useEffect, useRef, useState } from 'react';
import type { Resume } from '../types/resume';
import { normalizeResume, resumePayload } from '../types/resume';
import { api } from './api';

export function useResumeEditor(id?: string) {
  const [resume,setResume]=useState<Resume|null>(null);
  const [loading,setLoading]=useState(Boolean(id));
  const [error,setError]=useState('');
  const [saveStatus,setSaveStatus]=useState<'saved'|'unsaved'|'saving'|'error'>('saved');
  const [recovery,setRecovery]=useState<Resume|null>(null);
  const [historyCount,setHistoryCount]=useState({undo:0,redo:0});
  const current=useRef<Resume|null>(null), revision=useRef(0), persisted=useRef(0), epoch=useRef(0);
  const history=useRef<Resume[]>([]), future=useRef<Resume[]>([]);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const activeSave=useRef<{epoch:number;promise:Promise<boolean>}|null>(null);
  const mounted=useRef(true);
  const storageKey=(r:Resume)=>`cv-draft:${r.userId}:${r.id}`;
  const remember=(r:Resume)=>{try{localStorage.setItem(storageKey(r),JSON.stringify({savedAt:Date.now(),resume:r}));}catch{/* In-memory work and network saving continue when storage is unavailable. */}};
  const clearDraft=(r:Resume)=>{try{localStorage.removeItem(storageKey(r));}catch{/* Storage can be unavailable in private sessions. */}};
  const save=useCallback(async():Promise<boolean>=>{
    if(!current.current?.id)return true;
    const token=epoch.current;
    if(activeSave.current?.epoch===token)return activeSave.current.promise;
    const documentId=current.current.id;
    const task=(async()=>{
      try{
        if(mounted.current)setSaveStatus('saving');
        while(epoch.current===token&&current.current?.id===documentId&&revision.current>persisted.current){
          const snapshot=current.current;const sentRevision=revision.current;
          const {resume:saved}=await api.put<{resume:Resume}>(`/resumes/${documentId}`,resumePayload(snapshot));
          if(epoch.current!==token||current.current?.id!==documentId)return true;
          persisted.current=sentRevision;
          // Server timestamps/score are metadata. Never replace newer local content or entry identities.
          current.current={...current.current,updatedAt:saved.updatedAt,completionScore:saved.completionScore};
          if(mounted.current)setResume(current.current);
          if(revision.current===sentRevision)clearDraft(current.current);
        }
        if(epoch.current===token&&mounted.current){setSaveStatus('saved');setError('');}
        return true;
      }catch(err){if(epoch.current===token&&mounted.current){setError(err instanceof Error?err.message:'Could not save resume');setSaveStatus('error');}return false;}
    })();
    activeSave.current={epoch:token,promise:task};
    void task.finally(()=>{if(activeSave.current?.promise===task)activeSave.current=null;});
    return task;
  },[]);
  const schedule=()=>{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{void save();},1200);};
  useEffect(()=>{
    mounted.current=true;
    const token=++epoch.current;let cancelled=false;
    current.current=null;revision.current=0;persisted.current=0;history.current=[];future.current=[];
    setResume(null);setRecovery(null);setError('');setSaveStatus('saved');setHistoryCount({undo:0,redo:0});setLoading(Boolean(id));
    if(id)void api.get<{resume:Resume}>(`/resumes/${id}`).then(({resume:loaded})=>{
      if(cancelled||epoch.current!==token)return;
      const normalized=normalizeResume(loaded);current.current=normalized;setResume(normalized);
      try{const raw=localStorage.getItem(storageKey(normalized));if(raw){const draft=JSON.parse(raw);if(draft?.resume?.id===id&&draft.resume.userId===normalized.userId&&draft.savedAt>Date.parse(normalized.updatedAt)){setRecovery(normalizeResume(draft.resume));}else clearDraft(normalized);}}catch{clearDraft(normalized);}
    }).catch(err=>{if(!cancelled)setError(err instanceof Error?err.message:'Could not load resume');}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;if(timer.current)clearTimeout(timer.current);const snapshot=current.current;if(snapshot&&snapshot.id===id&&revision.current>persisted.current){remember(snapshot);void save();}};
  },[id,save]);
  useEffect(()=>{
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(current.current&&revision.current>persisted.current){remember(current.current);event.preventDefault();event.returnValue='';}};
    const online=()=>{if(revision.current>persisted.current)void save();};
    window.addEventListener('beforeunload',beforeUnload);window.addEventListener('online',online);
    return()=>{mounted.current=false;window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('online',online);};
  },[save]);
  function replace(updated:Resume,pushHistory=true){
    if(pushHistory&&current.current){history.current=[...history.current.slice(-59),current.current];future.current=[];}
    current.current=updated;revision.current++;remember(updated);setResume(updated);setSaveStatus('unsaved');setHistoryCount({undo:history.current.length,redo:future.current.length});schedule();
  }
  function update(updates:Partial<Resume>){if(current.current)replace({...current.current,...updates});}
  function undo(){const previous=history.current.pop();if(previous&&current.current){future.current.push(current.current);replace(previous,false);}}
  function redo(){const next=future.current.pop();if(next&&current.current){history.current.push(current.current);replace(next,false);}}
  function restore(){if(recovery)replace(recovery);setRecovery(null);}
  function discardRecovery(){if(current.current)clearDraft(current.current);setRecovery(null);}
  return{resume,loading,error,saveStatus,save,update,undo,redo,historyCount,recovery,restore,discardRecovery};
}
