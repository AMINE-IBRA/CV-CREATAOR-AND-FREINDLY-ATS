import { createElement } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, PageNumber } from 'docx';
export interface TextDocumentOptions {
  title: string; subtitle?: string; sections: { heading: string; text: string }[]; filename: string;
  accentColor?: string; paperSize?: string; fontFamily?: string; fontSize?: string; pageMargin?: string; lineSpacing?: string;
}
export function downloadBlob(filename: string, blob: Blob) {
  const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function downloadText(filename: string, text: string) { downloadBlob(filename,new Blob([text],{type:'text/plain;charset=utf-8'})); }
export async function exportTextPDF(options: TextDocumentOptions) {
  const { Document: PDFDocument, Page, Text, pdf } = await import('@react-pdf/renderer');
  await import('../components/templates/ResumePDF');
  const content = [options.title, options.subtitle, ...options.sections.flatMap(s => [s.heading,s.text])].filter(Boolean).join('\n');
  if (/[\u0370-\u05ff\u0900-\u1fff\u2e80-\ua4ff\uac00-\ud7ff\ud800-\udfff]/.test(content)) throw new Error('PDF supports Latin and Arabic text. Use DOCX or TXT for other scripts.');
  const arabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(content);
  const size = options.fontSize==='small'?10:options.fontSize==='large'?12:11;
  const children = [];
  if(options.title)children.push(createElement(Text,{key:'title',style:{fontSize:20,marginBottom:12}},options.title));
  if(options.subtitle)children.push(createElement(Text,{key:'subtitle',style:{marginBottom:12}},options.subtitle));
  options.sections.forEach((section,index)=>{
    if(section.heading)children.push(createElement(Text,{key:`h${index}`,minPresenceAhead:30,style:{fontWeight:700,marginBottom:6}},section.heading));
    children.push(createElement(Text,{key:`t${index}`,style:{marginBottom:12}},section.text));
  });
  const document=createElement(PDFDocument,null,createElement(Page,{size:options.paperSize==='letter'?'LETTER':'A4',style:{padding:options.pageMargin==='narrow'?30:options.pageMargin==='wide'?54:42,fontFamily:arabic?'Noto Arabic':'Helvetica',fontSize:size,lineHeight:1.45}},...children));
  downloadBlob(options.filename.endsWith('.pdf')?options.filename:`${options.filename}.pdf`,await pdf(document).toBlob());
}
export async function exportTextDOCX(options: TextDocumentOptions) {
  const size=options.fontSize==='small'?20:options.fontSize==='large'?24:22;
  const margin=options.pageMargin==='narrow'?600:options.pageMargin==='wide'?1080:840;
  const paragraphs=[new Paragraph({text:options.title,heading:HeadingLevel.TITLE}),...(options.subtitle?[new Paragraph({text:options.subtitle,spacing:{after:180}})]:[])];
  for(const section of options.sections){if(section.heading)paragraphs.push(new Paragraph({text:section.heading,heading:HeadingLevel.HEADING_2,keepNext:true}));for(const line of section.text.split('\n'))paragraphs.push(new Paragraph({children:[new TextRun({text:line,size})],spacing:{after:80,line:options.lineSpacing==='compact'?240:options.lineSpacing==='relaxed'?360:300}}));}
  const doc=new Document({creator:'CV Creator Pro',title:options.title,styles:{default:{document:{run:{font:options.fontFamily?.includes('Times')?'Times New Roman':options.fontFamily==='Courier'?'Courier New':'Arial',size}}}},sections:[{properties:{page:{size:options.paperSize==='letter'?{width:12240,height:15840}:{width:11906,height:16838},margin:{top:margin,bottom:margin,left:margin,right:margin}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({children:[PageNumber.CURRENT]})]})]})},children:paragraphs}]});
  downloadBlob(options.filename.endsWith('.docx')?options.filename:`${options.filename}.docx`,await Packer.toBlob(doc));
}
