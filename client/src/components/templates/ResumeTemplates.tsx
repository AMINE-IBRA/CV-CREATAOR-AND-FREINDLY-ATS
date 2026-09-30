import type { CSSProperties } from 'react';
import type { Resume, ResumeBlock } from '../../types/resume';
import { resumeBlocks } from '../../types/resume';
import { LAYOUTS, getLayout, resumeMetrics, isSidebar, SIDE_SECTIONS, safeImage, safeLink } from '../../lib/resumeLayout';
interface TemplateProps { resume: Resume }
export function ResumePreview({ resume }: TemplateProps) {
  const config = getLayout(resume.templateId);
  const { font, size, margin, spacing, accent } = resumeMetrics(resume, config);
  const blocks = resumeBlocks(resume);
  const sidebar = isSidebar(config);
  const contacts = [resume.email, resume.phone, [resume.city,resume.country].filter(Boolean).join(', '), resume.linkedinUrl,resume.githubUrl,resume.portfolioUrl].filter(Boolean) as string[];
  const headingStyle: CSSProperties = { fontWeight:700, fontSize:size+1, marginBottom:8, paddingBottom:4, color:accent, textTransform:config.uppercase?'uppercase':'none', fontStyle:config.italicHeading?'italic':'normal', letterSpacing:config.uppercase?1:0 };
  if (config.heading === 'line') headingStyle.borderBottom = `1px solid ${accent}`;
  if (config.heading === 'double') headingStyle.borderBottom = `3px double ${accent}`;
  if (config.heading === 'band' || config.heading === 'pill') Object.assign(headingStyle,{background:config.heading==='band'?accent:`${accent}12`,color:config.heading==='band'?'white':accent,padding:'5px 8px',borderRadius:config.heading==='pill'?8:0});
  function section(block: ResumeBlock, side = false) {
    const white = side && config.darkSidebar;
    return <section key={block.id} style={{marginBottom:config.id==='technical-compact'?12:20,display:config.layout==='label-column'?'flex':undefined,gap:20,breakInside:'auto'}}>
      <h2 style={{...headingStyle,color:white?'white':headingStyle.color,width:config.layout==='label-column'?'23%':undefined,flexShrink:0}}>{block.heading}</h2>
      <div style={{flex:1,minWidth:0}}>{block.entries.map((entry,i) => <div key={i} style={{marginBottom:9,display:config.layout==='timeline'&&entry.date?'flex':undefined,gap:12,breakInside:'avoid'}}>
        {config.layout==='timeline'&&entry.date&&<div style={{width:85,color:accent,fontSize:size-1,flexShrink:0}}>{entry.date}</div>}
        <div style={{flex:1,minWidth:0}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}>{entry.title&&<strong>{entry.title}</strong>}{entry.date&&config.layout!=='timeline'&&<span style={{fontSize:size-1,color:white?'#dbeafe':'#64748b'}}>{entry.date}</span>}</div>
        {entry.subtitle&&<div style={{color:white?'#e0e7ff':accent}}>{entry.subtitle}</div>}
        {entry.lines.map((line,j)=><p key={j} style={{margin:'3px 0',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{line}</p>)}
        {entry.links?.map((link,j)=><div key={j} style={{overflowWrap:'anywhere'}}><a href={safeLink(link)} style={{color:white?'white':accent}}>{link}</a></div>)}</div>
      </div>)}</div>
    </section>;
  }
  const photo=safeImage(resume.photoUrl);
  return <article style={{fontFamily:font==='Times-Roman'?'Georgia, serif':font==='Courier'?'Courier New, monospace':'Arial, sans-serif',fontSize:`${size}pt`,lineHeight:spacing,color:'#1e293b',background:'white',padding:margin,width:'100%',minHeight:'100%',boxSizing:'border-box',borderLeft:config.frame?`8px solid ${accent}`:undefined}}>
    <header style={{marginBottom:24,textAlign:config.header==='center'?'center':'left',display:config.header==='split'?'flex':'block',justifyContent:'space-between',gap:24,background:config.header==='banner'?accent:undefined,color:config.header==='banner'?'white':undefined,padding:config.header==='banner'?20:0,borderBottom:config.id==='classic-professional'||config.id==='executive-serif'?`2px solid ${accent}`:undefined,paddingBottom:16}}>
      <div>{photo&&<img src={photo} alt="" style={{width:60,height:60,borderRadius:config.header==='banner'?8:'50%',objectFit:'cover',float:'right'}}/>}<h1 style={{fontSize:config.nameSize,margin:0,lineHeight:1.1,fontWeight:700}}>{resume.fullName||'Your Name'}</h1><p style={{fontSize:size+3,margin:'5px 0',color:config.header==='banner'?'white':accent}}>{resume.professionalTitle||resume.targetRole||'Professional Title'}</p></div>
      <div style={{fontSize:size-1,marginTop:8,textAlign:config.header==='split'?'right':undefined,overflowWrap:'anywhere'}}>{contacts.map((contact,i)=><span key={i} style={{display:config.header==='split'?'block':'inline'}}>{i>0&&config.header!=='split'?' · ':''}{contact}</span>)}</div>
    </header>
    {sidebar?<div style={{display:'flex',flexDirection:config.layout==='sidebar-right'?'row-reverse':'row',gap:22,alignItems:'stretch'}}><aside style={{width:'31%',flexShrink:0,background:config.darkSidebar?'#1e1b4b':`${accent}12`,color:config.darkSidebar?'white':undefined,padding:16}}>{blocks.filter(b=>SIDE_SECTIONS.has(b.id)).map(b=>section(b,true))}</aside><main style={{flex:1,minWidth:0}}>{blocks.filter(b=>!SIDE_SECTIONS.has(b.id)).map(b=>section(b))}</main></div>:blocks.map(b=>section(b))}
  </article>;
}
export const TEMPLATES = Object.fromEntries(LAYOUTS.map(config => [config.id,{...config,component:({resume}:TemplateProps)=><ResumePreview resume={{...resume,templateId:config.id}}/>}]));
export const TEMPLATE_LIST = Object.values(TEMPLATES);
export const getTemplate = (id: string) => TEMPLATES[id] || TEMPLATES['classic-professional'];
export const ClassicProfessional = TEMPLATES['classic-professional'].component;
export const ModernMinimalist = TEMPLATES['modern-minimalist'].component;
export const TwoColumn = TEMPLATES['two-column'].component;
