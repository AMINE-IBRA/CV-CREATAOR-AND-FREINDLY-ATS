import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import { normalizeResume, parseSectionOrder, parseEnabledSections, resumePayload, resumeToText, SECTION_IDS } from '../src/types/resume';
import { LAYOUTS } from '../src/lib/resumeLayout';
import { ResumeDocument } from '../src/components/templates/ResumePDF';

const output = process.env.CV_QA_OUTPUT || join(tmpdir(), 'cv-creator-document-qa');
export const fixture = normalizeResume({
  id: 'qa-fixture', userId: 'qa', title: 'QA Sample Resume', fullName: 'Amine Example',
  professionalTitle: 'Software Engineer', email: 'qa@example.test', phone: '+212 600 000 000',
  city: 'Casablanca', country: 'Morocco', linkedinUrl: 'https://example.test/linkedin',
  githubUrl: 'https://example.test/github', portfolioUrl: 'https://example.test/portfolio',
  summary: 'Sample professional experience for document verification. Built accessible interfaces using React and TypeScript.',
  experiences: [{jobTitle: 'Application Developer', company: 'Example Company', isCurrent: true, startDate: '2022-01', location:'Remote', employmentType:'Full time', description:'Built accessible forms and tested document workflows.', achievements:'Delivered a verified release.', technologies:'React, TypeScript'}],
  educations: [{institution:'Example University',degree:'BSc',fieldOfStudy:'Computer Science',startDate:'2018',endDate:'2022',grade:'Honors',description:'Studied software design.'}],
  skills:[{name:'TypeScript',category:'technical',level:'Advanced'}],
  projects:[{name:'Accessible Editor',description:'A sample project.',technologies:'React',projectUrl:'https://example.test/project',githubUrl:'https://example.test/source',achievements:'Verified keyboard support.',startDate:'2023',endDate:'2024'}],
  certifications:[{name:'Example Certification',issuer:'Example Institute',issueDate:'2024',expiryDate:'2027',credentialId:'QA-CREDENTIAL',credentialUrl:'https://example.test/certificate'}],
  languages:[{name:'French',level:'Fluent'}], awards:[{title:'Example Award',issuer:'Example Society',date:'2024',description:'Recognized for sample work.'}],
  publications:[{title:'Example Paper',publisher:'Example Journal',date:'2024',url:'https://example.test/paper',description:'Research sample.'}],
  volunteer:[{organization:'Example Community',role:'Mentor',startDate:'2023',description:'Mentored sample learners.'}],
  interests:[{name:'Open source'}],references:[{name:'Reference Example',position:'Manager',company:'Example Company',email:'reference@example.test',phone:'+212 600 000 001'}],
  enabledSections:Object.fromEntries(SECTION_IDS.map(id=>[id,true])),
});

test('malformed section settings normalize without inherited or duplicate IDs', () => {
  for (const value of ['null', '{}', '{broken', ['constructor','__proto__','summary','summary']]) {
    const sections = parseSectionOrder(value);
    assert.equal(sections.length, SECTION_IDS.length);
    assert.ok(sections.every(id => SECTION_IDS.includes(id)));
  }
  assert.equal(parseEnabledSections('null').summary, true);
  assert.equal(parseEnabledSections({summary:false,skills:'false'}).summary,false);
  assert.equal(parseEnabledSections({skills:'false'}).skills,true);
});

test('saved payload strips editor IDs and complete plain text preserves optional sections', () => {
  const payload = resumePayload(fixture);
  assert.equal(payload.id, undefined);
  assert.equal((payload.experiences as any[])[0]._key, undefined);
  const text = resumeToText(fixture);
  for (const expected of ['QA-CREDENTIAL','Example Paper','French','TypeScript','Reference Example','example.test/github','Mentor','Open source','React, TypeScript']) assert.ok(text.includes(expected), expected);
  const hidden = {...fixture,enabledSections:{...parseEnabledSections(fixture.enabledSections),references:false}};
  assert.ok(!resumeToText(hidden).includes('Reference Example'));
});

test('all twelve templates produce real PDF documents', async () => {
  assert.equal(LAYOUTS.length,12);
  assert.equal(new Set(LAYOUTS.map(layout=>layout.id)).size,12);
  await mkdir(output,{recursive:true});
  for (const layout of LAYOUTS) {
    const buffer = await renderToBuffer(<ResumeDocument resume={{...fixture,templateId:layout.id,accentColor:layout.accentColor,fontFamily:layout.font}}/>);
    assert.equal(buffer.subarray(0,4).toString(),'%PDF',layout.id);
    await writeFile(join(output,`${layout.id}.pdf`),buffer);
  }
});

test('long Letter resumes paginate rather than clip the final content', async () => {
  const long = {...fixture,paperSize:'letter',experiences:Array.from({length:18},(_,i)=>({...fixture.experiences[0],jobTitle:`Role ${i+1}`,description:Array.from({length:8},(_,j)=>`Detailed responsibility ${i+1}.${j+1}: improved accessible workflows with careful review and testing.`).join('\n')}))};
  const buffer = await renderToBuffer(<ResumeDocument resume={long}/>);
  await writeFile(join(output,'long-letter.pdf'),buffer);
  assert.ok(buffer.length>10000);
});
