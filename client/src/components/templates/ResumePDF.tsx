import { Document, Page, Text, View, Link, Image, Font, pdf } from '@react-pdf/renderer';
import type { Resume, ResumeBlock } from '../../types/resume';
import { resumeBlocks, resumeToText } from '../../types/resume';
import { getLayout, resumeMetrics, isSidebar, SIDE_SECTIONS, safeImage, safeLink } from '../../lib/resumeLayout';
Font.registerHyphenationCallback(word => word.length>18 ? word.match(/.{1,14}/gu) || [word] : [word]);
export function registerResumeFonts(directory = '/fonts') {
  Font.register({family:'Noto Arabic',fonts:[{src:`${directory}/NotoSansArabic-Regular.ttf`},{src:`${directory}/NotoSansArabic-Bold.ttf`,fontWeight:700}]});
}
if(typeof window!=='undefined')registerResumeFonts();

// The editor preview and download render this same document; pages are never screenshots.
export function ResumeDocument({ resume }: { resume: Resume }) {
  const config = getLayout(resume.templateId);
  const metrics = resumeMetrics(resume, config);
  const { size, margin, spacing, accent } = metrics;
  const textContent=resumeToText(resume);
  if(/[\u0370-\u05ff\u0900-\u1fff\u2e80-\ua4ff\uac00-\ud7ff\ud800-\udfff]/.test(textContent))throw new Error('PDF supports Latin and Arabic text. Please use DOCX or plain text for other scripts.');
  const arabic=/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(textContent);
  const font=arabic?'Noto Arabic':metrics.font;
  const blocks = resumeBlocks(resume);
  const sidebar = isSidebar(config);
  const contact = [resume.email, resume.phone, [resume.city,resume.country].filter(Boolean).join(', '), resume.linkedinUrl,resume.githubUrl,resume.portfolioUrl].filter(Boolean) as string[];
  const photo = safeImage(resume.photoUrl);
  const heading = {
    fontSize:size+1, fontWeight:700 as const, color:accent, marginBottom:6, paddingBottom:4,
    textTransform:config.uppercase ? 'uppercase' as const : 'none' as const,
    fontStyle:config.italicHeading && !arabic ? 'italic' as const : 'normal' as const,
    letterSpacing:config.uppercase?0.8:0,
    borderBottomWidth:config.heading==='line'?1:config.heading==='double'?2:0, borderBottomColor:accent,
    backgroundColor:config.heading==='band'?accent:config.heading==='pill'?`${accent}15`:'transparent',
    padding:config.heading==='band'||config.heading==='pill'?5:0,
    borderRadius:config.heading==='pill'?6:0,
  };
  function renderSection(block: ResumeBlock, side = false) {
    const white = side && config.darkSidebar;
    return <View key={block.id} style={{marginBottom:config.id==='technical-compact'?10:16,flexDirection:config.layout==='label-column'?'row':'column'}}>
      <Text minPresenceAhead={50} style={{...heading,color:white?'white':config.heading==='band'?'white':accent,width:config.layout==='label-column'?'24%':undefined,marginRight:config.layout==='label-column'?12:0}}>{block.heading}</Text>
      <View style={{width:config.layout==='label-column'?'73%':'100%',flexGrow:config.layout==='label-column'?0:1,flexShrink:1}}>{block.entries.map((entry,i)=><View key={i} wrap={[entry.title,entry.subtitle,entry.date,...entry.lines,...entry.links||[]].join('').length>450||entry.lines.length>8} style={{marginBottom:8,flexDirection:config.layout==='timeline'&&entry.date?'row':'column'}}>
        {config.layout==='timeline'&&entry.date&&<Text minPresenceAhead={16} style={{width:78,flexShrink:0,fontSize:size-1,color:accent,marginRight:10}}>{entry.date}</Text>}
        <View style={{width:config.layout==='timeline'&&entry.date?'80%':'100%',flexGrow:1,flexShrink:1}}>
          {entry.title&&<Text minPresenceAhead={entry.lines.length?size*spacing+3:0} style={{fontWeight:700}}>{entry.title}</Text>}
          {entry.date&&config.layout!=='timeline'&&<Text style={{fontSize:size-1,color:white?'#dbeafe':'#64748b',marginBottom:2}}>{entry.date}</Text>}
          {entry.subtitle&&<Text minPresenceAhead={entry.lines.length?size*spacing:0} style={{color:white?'#e0e7ff':accent,marginBottom:2}}>{entry.subtitle}</Text>}
          {entry.lines.map((line,j)=><Text key={j} orphans={2} widows={2} style={{marginTop:2}}>{line}</Text>)}
          {entry.links?.map((url,j)=>safeLink(url)?<Link key={j} src={safeLink(url)!} style={{fontSize:size-1,color:white?'white':accent,marginTop:2}}>{url}</Link>:<Text key={j}>{url}</Text>)}
        </View>
      </View>)}</View>
    </View>;
  }
  if(config.id==='editorial-profile'){
    const labels:Record<string,string>={summary:'Profil',experience:'Expérience',education:'Formation',skills:'Compétences techniques',projects:'Projets',certifications:'Certifications',languages:'Langues',awards:'Distinctions',publications:'Publications',volunteer:'Bénévolat',interests:'Centres d’intérêt',references:'Références'};
    const sideBlocks=blocks.filter(block=>SIDE_SECTIONS.has(block.id));
    const mainBlocks=blocks.filter(block=>!SIDE_SECTIONS.has(block.id));
    const initials=(resume.fullName||'Votre nom').split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase();
    const renderEditorialBlock=(block:ResumeBlock,side=false)=><View key={block.id} style={{marginBottom:side?13:17,position:'relative'}}>
      <Text minPresenceAhead={24} style={{fontSize:size+1,fontWeight:700,color:'#263746',textTransform:'uppercase',letterSpacing:0.8,marginBottom:5,paddingBottom:4,borderBottomWidth:1,borderBottomColor:'#263746'}}>{labels[block.id]||block.heading}</Text>
      {block.entries.map((entry,index)=><View key={index} wrap={false} style={{marginBottom:8,paddingLeft:side?0:8,position:'relative'}}>
        {!side&&<View style={{position:'absolute',left:-13,top:3,width:6,height:6,borderRadius:3,backgroundColor:'#18364A'}}/>}
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
          {entry.title&&<Text style={{fontWeight:700,flexGrow:1,flexShrink:1}}>{entry.title}</Text>}
          {entry.date&&<Text style={{fontSize:size-1,color:'#5B6570',marginLeft:5}}>{entry.date}</Text>}
        </View>
        {entry.subtitle&&<Text style={{color:'#384958',marginTop:2}}>{entry.subtitle}</Text>}
        {entry.lines.map((line,lineIndex)=><Text key={lineIndex} style={{marginTop:3,textAlign:'justify'}}>{line}</Text>)}
        {entry.links?.map((url,linkIndex)=>safeLink(url)?<Link key={linkIndex} src={safeLink(url)!} style={{fontSize:size-1,color:accent,marginTop:2}}>{url}</Link>:<Text key={linkIndex}>{url}</Text>)}
      </View>)}
    </View>;
    return <Document title={resume.title||'Resume'} author={resume.fullName||undefined} subject="Professional resume">
      <Page size={resume.paperSize==='letter'?'LETTER':'A4'} style={{fontFamily:font,fontSize:size,lineHeight:spacing,color:'#29323B',paddingTop:margin,paddingBottom:margin+12,paddingHorizontal:margin}}>
        <View wrap={false} style={{flexDirection:'row',alignItems:'center',marginBottom:17,paddingBottom:12,borderBottomWidth:2,borderBottomColor:'#18364A'}}>
          {photo?<Image src={photo} style={{width:76,height:76,objectFit:'cover',borderRadius:38,marginRight:16}}/>:<View style={{width:76,height:76,borderRadius:38,marginRight:16,backgroundColor:'#F1F5F7',borderWidth:1,borderColor:'#18364A',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:20,fontWeight:700,color:'#18364A'}}>{initials}</Text></View>}
          <View style={{flexGrow:1,flexShrink:1,alignItems:'center'}}>
            <Text style={{fontSize:config.nameSize,lineHeight:1.1,fontWeight:700,textAlign:'center',color:'#303B4B'}}>{resume.fullName||'Votre nom'}</Text>
            <Text style={{fontSize:size+2,marginTop:5,textAlign:'center',color:'#4B5563'}}>{resume.professionalTitle||resume.targetRole||'Titre professionnel'}</Text>
          </View>
        </View>
        <View style={{flexDirection:'row',alignItems:'flex-start'}}>
          <View style={{width:'32%',paddingRight:15}}>
            <Text style={{fontSize:size+1,fontWeight:700,color:'#263746',textTransform:'uppercase',letterSpacing:0.8,marginBottom:5,paddingBottom:4,borderBottomWidth:1,borderBottomColor:'#263746'}}>Contact</Text>
            {contact.map((line,index)=><Text key={index} style={{marginTop:5}}>{line}</Text>)}
            {sideBlocks.map(block=>renderEditorialBlock(block,true))}
          </View>
          <View style={{width:'68%',paddingLeft:17,borderLeftWidth:1,borderLeftColor:'#263746'}}>
            {mainBlocks.map(block=>renderEditorialBlock(block))}
          </View>
        </View>
        <Text fixed style={{position:'absolute',bottom:18,left:margin,right:margin,height:12,lineHeight:1.2,fontFamily:'Helvetica',textAlign:'right',fontSize:8,color:'#94a3b8'}} render={({pageNumber,totalPages})=>String(pageNumber)+' / '+String(totalPages)} />
      </Page>
    </Document>;
  }
  return <Document title={resume.title || 'Resume'} author={resume.fullName || undefined} subject="Professional resume">
    <Page size={resume.paperSize==='letter'?'LETTER':'A4'} style={{fontFamily:font,fontSize:size,lineHeight:spacing,color:'#1e293b',paddingTop:margin,paddingBottom:margin+12,paddingHorizontal:margin,borderLeftWidth:config.frame?7:0,borderLeftColor:accent}}>
      <View wrap={false} style={{marginBottom:22,flexDirection:config.header==='split'?'row':'column',alignItems:config.header==='center'?'center':'stretch',justifyContent:'space-between',backgroundColor:config.header==='banner'?accent:'transparent',color:config.header==='banner'?'white':'#1e293b',padding:config.header==='banner'?15:0,paddingBottom:12,borderBottomWidth:['classic-professional','executive-serif'].includes(config.id)?2:0,borderBottomColor:accent}}>
        <View style={{width:config.header==='split'?'62%':'100%',flexGrow:1,flexShrink:1}}>{photo&&<Image src={photo} style={{width:50,height:50,objectFit:'cover',borderRadius:config.header==='banner'?6:25,marginBottom:6}}/>}<Text style={{fontSize:config.nameSize,lineHeight:1.1,fontWeight:700,textAlign:config.header==='center'?'center':'left'}}>{resume.fullName || 'Your Name'}</Text><Text style={{fontSize:size+3,color:config.header==='banner'?'white':accent,marginTop:5,textAlign:config.header==='center'?'center':'left'}}>{resume.professionalTitle || resume.targetRole || 'Professional Title'}</Text></View>
        <View style={{marginTop:8,width:config.header==='split'?'36%':undefined,paddingLeft:config.header==='split'?15:0}}>{config.header==='split'?contact.map((line,i)=><Text key={i} style={{fontSize:size-1,textAlign:'right'}}>{line}</Text>):<Text style={{fontSize:size-1,textAlign:config.header==='center'?'center':'left'}}>{contact.join(' · ')}</Text>}</View>
      </View>
      {sidebar?<View style={{flexDirection:config.layout==='sidebar-right'?'row-reverse':'row',alignItems:'flex-start'}}>
        <View style={{width:'31%',padding:12,backgroundColor:config.darkSidebar?'#1e1b4b':`${accent}15`,color:config.darkSidebar?'white':'#1e293b',marginRight:config.layout==='sidebar-left'?18:0,marginLeft:config.layout==='sidebar-right'?18:0}}>{blocks.filter(b=>SIDE_SECTIONS.has(b.id)).map(b=>renderSection(b,true))}</View>
        <View style={{flexGrow:1,flexShrink:1,width:'65%'}}>{blocks.filter(b=>!SIDE_SECTIONS.has(b.id)).map(b=>renderSection(b))}</View>
      </View>:blocks.map(b=>renderSection(b))}
      <Text fixed style={{position:'absolute',bottom:18,left:margin,right:margin,height:12,lineHeight:1.2,fontFamily:'Helvetica',textAlign:'right',fontSize:8,color:'#94a3b8'}} render={({pageNumber,totalPages})=>`${pageNumber} / ${totalPages}`} />
    </Page>
  </Document>;
}
let rendering:Promise<Blob>|null=null;
export function createResumePDF(resume: Resume):Promise<Blob> {
  // ReactPDF shares a renderer. Serialize live previews and exports to avoid overlapping layout work.
  const task=(rendering?rendering.catch(()=>undefined):Promise.resolve()).then(()=>pdf(<ResumeDocument resume={resume}/>).toBlob());
  rendering=task;void task.finally(()=>{if(rendering===task)rendering=null;}).catch(()=>{});return task;
}
