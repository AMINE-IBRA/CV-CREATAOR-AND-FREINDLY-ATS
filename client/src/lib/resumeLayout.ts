import type { Resume } from '../types/resume';
export interface LayoutConfig {
  id: string; name: string; category: string; description: string; accentColor: string; atsFriendly: boolean;
  layout: 'single' | 'sidebar-left' | 'sidebar-right' | 'label-column' | 'timeline';
  header: 'center' | 'split' | 'left' | 'banner'; heading: 'line' | 'double' | 'plain' | 'band' | 'pill';
  font: 'Helvetica' | 'Times-Roman' | 'Courier'; size: number; padding: number; nameSize: number; uppercase: boolean;
  darkSidebar?: boolean; frame?: boolean; italicHeading?: boolean;
}
export const LAYOUTS: LayoutConfig[] = [
  { id:'classic-professional', name:'Classic Professional', category:'Professional', description:'Centered name, clear rules and a readable single column.', accentColor:'#2563EB', atsFriendly:true, layout:'single', header:'center', heading:'line', font:'Times-Roman', size:10.5, padding:38, nameSize:25, uppercase:true },
  { id:'modern-minimalist', name:'Modern Minimalist', category:'Modern', description:'Oversized name, understated headings and generous space.', accentColor:'#059669', atsFriendly:true, layout:'single', header:'left', heading:'plain', font:'Helvetica', size:10, padding:44, nameSize:32, uppercase:true },
  { id:'two-column', name:'Elegant Two-Column', category:'Creative', description:'Dark left sidebar for skills and contact details. Two columns can reduce ATS reading accuracy.', accentColor:'#7C3AED', atsFriendly:false, layout:'sidebar-left', header:'left', heading:'line', font:'Helvetica', size:10, padding:30, nameSize:24, uppercase:true, darkSidebar:true },
  { id:'executive-serif', name:'Executive Serif', category:'Professional', description:'Refined serif typography, a centered masthead and double rules.', accentColor:'#334155', atsFriendly:true, layout:'single', header:'center', heading:'double', font:'Times-Roman', size:11, padding:44, nameSize:29, uppercase:false },
  { id:'technical-compact', name:'Technical Compact', category:'Technical', description:'Compact monospace layout with shaded technical section bands.', accentColor:'#0F766E', atsFriendly:true, layout:'single', header:'split', heading:'band', font:'Courier', size:9.5, padding:30, nameSize:24, uppercase:true },
  { id:'academic', name:'Academic Scholar', category:'Academic', description:'Traditional research CV with serif type and italic section headings.', accentColor:'#44403C', atsFriendly:true, layout:'single', header:'center', heading:'plain', font:'Times-Roman', size:11, padding:42, nameSize:25, uppercase:false, italicHeading:true },
  { id:'graduate', name:'Graduate Focus', category:'Entry Level', description:'An open, approachable layout with a prominent name and soft heading bands.', accentColor:'#0284C7', atsFriendly:true, layout:'single', header:'left', heading:'pill', font:'Helvetica', size:10.5, padding:40, nameSize:30, uppercase:false },
  { id:'contemporary', name:'Contemporary Grid', category:'Modern', description:'A split masthead and aligned label column create a structured visual rhythm.', accentColor:'#4F46E5', atsFriendly:false, layout:'label-column', header:'split', heading:'plain', font:'Helvetica', size:10, padding:36, nameSize:27, uppercase:true },
  { id:'elegant-sidebar', name:'Soft Right Sidebar', category:'Creative', description:'A pale right sidebar balances a spacious main column. Use a single column when ATS compatibility matters.', accentColor:'#BE185D', atsFriendly:false, layout:'sidebar-right', header:'left', heading:'line', font:'Helvetica', size:10, padding:32, nameSize:28, uppercase:false },
  { id:'creative-banner', name:'Creative Banner', category:'Creative', description:'A full-width color masthead paired with crisp section rules.', accentColor:'#C2410C', atsFriendly:true, layout:'single', header:'banner', heading:'line', font:'Helvetica', size:10.5, padding:36, nameSize:31, uppercase:true },
  { id:'consultant', name:'Consultant Timeline', category:'Professional', description:'Dates lead each entry in a restrained timeline layout.', accentColor:'#0369A1', atsFriendly:false, layout:'timeline', header:'split', heading:'double', font:'Helvetica', size:10, padding:40, nameSize:27, uppercase:false },
  { id:'bold-accent', name:'Bold Accent', category:'Modern', description:'A strong edge accent and filled section bars emphasize milestones.', accentColor:'#9333EA', atsFriendly:true, layout:'single', header:'left', heading:'band', font:'Helvetica', size:10.5, padding:38, nameSize:30, uppercase:true, frame:true },
];
export function getLayout(id: string) { return LAYOUTS.find(layout => layout.id === id) || LAYOUTS[0]; }
export function resumeMetrics(resume: Resume, config = getLayout(resume.templateId)) {
  const fonts: Record<string, LayoutConfig['font']> = { Helvetica:'Helvetica', Arial:'Helvetica', Inter:'Helvetica', 'Times-Roman':'Times-Roman', Georgia:'Times-Roman', 'Times New Roman':'Times-Roman', Courier:'Courier' };
  return {
    font: fonts[resume.fontFamily] || config.font,
    size: config.size * ({ small:0.9, medium:1, large:1.12 }[resume.fontSize] || 1),
    margin: resume.pageMargin === 'narrow' ? 26 : resume.pageMargin === 'wide' ? 52 : config.padding,
    spacing: resume.lineSpacing === 'compact' ? 1.2 : resume.lineSpacing === 'relaxed' ? 1.65 : 1.4,
    accent: /^#[0-9a-f]{6}$/i.test(resume.accentColor) ? resume.accentColor : config.accentColor,
  };
}
export const isSidebar = (config: LayoutConfig) => config.layout === 'sidebar-left' || config.layout === 'sidebar-right';
export const SIDE_SECTIONS = new Set(['skills','languages','certifications','interests','references']);
export function safeImage(value?: string) { return value && /^data:image\/(png|jpe?g);base64,[a-z0-9+/=]+$/i.test(value) ? value : undefined; }
export function safeLink(value: string) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try { const url = new URL(candidate); return ['https:', 'http:'].includes(url.protocol) && !/^(javascript|data|vbscript):/i.test(value) ? url.href : undefined; } catch { return undefined; }
}
