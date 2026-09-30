const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const temporaryRoot = path.resolve(process.env.CV_TEST_TMPDIR || os.tmpdir());
fs.mkdirSync(temporaryRoot, { recursive: true });
const temporaryDirectory = fs.mkdtempSync(path.join(temporaryRoot, 'cv-creator-tests-'));
process.env.DATABASE_URL = `file:${path.join(temporaryDirectory, 'test.db').split(path.sep).join('/')}`;
process.env.NODE_ENV = 'test';
process.env.OPENROUTER_API_KEY = 'test-key-never-send';
process.env.CLIENT_URL = 'http://localhost:5173';

let server, prisma, base, userA, userB, userCap, resumeA, resumeB;
let summariesCalled = 0;
const generated = { fullName: 'Example Candidate', professionalTitle: 'Developer', summary: 'Builds applications.', experiences: [], educations: [], skills: [{ name: 'TypeScript' }], projects: [] };
const aiMock = {
  generateSummary: async () => { summariesCalled++; await new Promise(resolve => setTimeout(resolve, 25)); return { summaries: ['Experienced developer.'] }; },
  enhanceBulletPoints: async () => ({ enhanced: 'Built reliable applications.', explanation: 'Used a clear action verb.' }),
  analyzeJobMatch: async () => ({ matchScore: 75, requiredSkills: ['TypeScript'], presentSkills: ['TypeScript'], missingSkills: [], keywords: ['TypeScript'], suggestions: ['Add a relevant project.'] }),
  reviewResume: async () => ({ overallScore: 75, strengths: ['Clear skills'], improvements: ['Add details'], atsIssues: [], grammarIssues: [], suggestions: ['Add evidence'] }),
  generateCoverLetter: async () => ({ coverLetter: 'Dear hiring team,\nI am interested in this position.' }),
  generateInterviewQuestions: async () => ({ technical: [{ question: 'How do you test code?', hint: 'Describe your process.' }], behavioral: [], resumeSpecific: [] }),
  generateResumeFromInfo: async () => generated,
  importResume: async () => generated,
  optimizeKeywords: async () => ({ presentKeywords: ['TypeScript'], missingKeywords: [{ keyword: 'SQL', reason: 'Required by the role; claim it only if you have it.', suggestedSection: 'Skills' }], suggestions: ['Include only real skills.'] }),
  tailorResume: async () => ({ summary: 'Developer who builds applications.', experiences: [{ index: 0, description: 'Built reliable applications.' }], skillsOrder: [0], changes: ['Focused the summary on relevant experience.'] }),
};

async function request(route, { method = 'GET', cookie, body, origin, form } = {}) {
  const headers = { ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${route}`, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function register(email, name = 'Example User') {
  const result = await request('/api/auth/register', { method: 'POST', body: { email, name, password: 'ExamplePass123!' } });
  assert.equal(result.response.status, 201);
  assert.match(result.response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(result.response.headers.get('set-cookie'), /SameSite=Lax/);
  return { ...result.data.user, cookie: result.cookie };
}
async function plan(user, value = 'pro') {
  const result = await request('/api/billing/development-plan', { method: 'POST', cookie: user.cookie, body: { plan: value } });
  assert.equal(result.response.status, 200);
  return result;
}

before(async () => {
  const database = new DatabaseSync(path.join(temporaryDirectory, 'test.db'));
  const migrations = path.resolve(__dirname, '../prisma/migrations');
  for (const name of fs.readdirSync(migrations).sort()) {
    const sql = path.join(migrations, name, 'migration.sql');
    if (fs.existsSync(sql)) database.exec(fs.readFileSync(sql, 'utf8'));
  }
  database.close();
  ({ prisma } = require('../dist/lib/prisma.js'));
  const { createApp } = require('../dist/app.js');
  server = createApp({ ai: aiMock, serveClient: false }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  userA = await register('a@example.test');
  userB = await register('b@example.test');
  userCap = await register('caps@example.test');
  const a = await request('/api/resumes', { method: 'POST', cookie: userA.cookie, body: { title: 'Original Resume', fullName: 'Example Candidate', email: 'a@example.test', summary: 'Original summary.', experiences: [{ jobTitle: 'Developer', company: 'Example Company', startDate: '2022', description: 'Built applications.' }], skills: [{ name: 'TypeScript' }], publications: [{ title: 'Sample Article', publisher: 'Example Publisher' }], volunteer: [{ organization: 'Example Charity', role: 'Helper' }], interests: [{ name: 'Reading' }], references: [{ name: 'Example Reference', email: 'reference@example.test' }] } });
  assert.equal(a.response.status, 201); resumeA = a.data.resume;
  const b = await request('/api/resumes', { method: 'POST', cookie: userB.cookie, body: { title: 'Other User Resume' } });
  assert.equal(b.response.status, 201); resumeB = b.data.resume;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (prisma) await prisma.$disconnect();
  if (path.dirname(fs.realpathSync(temporaryDirectory)) !== fs.realpathSync(temporaryRoot)) throw new Error('Unexpected test cleanup path');
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('opaque cookie sessions return safe user data and ignore legacy bearer tokens', async () => {
  const result = await request('/api/auth/me', { cookie: userA.cookie });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.user.id, userA.id);
  assert.equal(result.data.user.passwordHash, undefined);
  assert.equal(result.data.token, undefined);
  const token = userA.cookie.split('=')[1];
  const session = await prisma.session.findFirst({ where: { userId: userA.id } });
  assert.notEqual(session.token, token); assert.equal(session.token.length, 64);
  const forbidden = await fetch(`${base}/api/auth/me`, { headers: { Authorization: 'Bearer legacy-token' } });
  assert.equal(forbidden.status, 401);
});
test('malformed nested input is rejected without deleting stored records', async () => {
  const before = await prisma.workExperience.count({ where: { resumeId: resumeA.id } });
  const bad = await request(`/api/resumes/${resumeA.id}`, { method: 'PUT', cookie: userA.cookie, body: { experiences: {} } });
  assert.equal(bad.response.status, 400);
  assert.equal(await prisma.workExperience.count({ where: { resumeId: resumeA.id } }), before);
  const read = await request(`/api/resumes/${resumeA.id}`, { cookie: userA.cookie });
  assert.equal(read.data.resume.experiences[0].company, 'Example Company');
});
test('resume ownership, optional sections, versions and duplication work', async () => {
  assert.equal((await request(`/api/resumes/${resumeA.id}`, { cookie: userB.cookie })).response.status, 404);
  assert.equal((await request(`/api/resumes/${resumeA.id}`, { method: 'PUT', cookie: userB.cookie, body: { summary: 'Foreign change' } })).response.status, 404);
  const edit = await request(`/api/resumes/${resumeA.id}`, { method: 'PUT', cookie: userA.cookie, body: { summary: 'Updated summary.' } });
  assert.equal(edit.response.status, 200);
  const versions = await request(`/api/resumes/${resumeA.id}/versions`, { cookie: userA.cookie });
  assert.equal(versions.data.versions.length, 1);
  const restored = await request(`/api/resumes/${resumeA.id}/versions/${versions.data.versions[0].id}/restore`, { method: 'POST', cookie: userA.cookie, body: {} });
  assert.equal(restored.response.status, 200); assert.equal(restored.data.resume.summary, 'Original summary.');
  const duplicate = await request(`/api/resumes/${resumeA.id}/duplicate`, { method: 'POST', cookie: userA.cookie, body: {} });
  assert.equal(duplicate.response.status, 201);
  for (const section of ['publications', 'volunteer', 'interests', 'references']) assert.equal(duplicate.data.resume[section].length, 1);
  assert.notEqual(duplicate.data.resume.experiences[0].id, resumeA.experiences[0].id);
});
test('concurrent resume creation respects the free plan limit', async () => {
  const results = await Promise.all(Array.from({ length: 5 }, (_, index) => request('/api/resumes', { method: 'POST', cookie: userCap.cookie, body: { title: `Concurrent ${index}` } })));
  assert.equal(results.filter(result => result.response.status === 201).length, 3);
  assert.equal(results.filter(result => result.response.status === 403).length, 2);
  assert.equal(await prisma.resume.count({ where: { userId: userCap.id } }), 3);
});
test('paid entitlements require a plan and local development previews are explicit', async () => {
  const blocked = await request('/api/ai/job-match', { method: 'POST', cookie: userA.cookie, body: { resumeText: 'Developer with TypeScript', jobDescription: 'TypeScript developer role' } });
  assert.equal(blocked.response.status, 403);
  assert.equal((await request(`/api/resumes/${resumeA.id}/export-check`, { method: 'POST', cookie: userA.cookie, body: { format: 'docx' } })).response.status, 403);
  const preview = await plan(userA);
  assert.equal(preview.data.developmentMode, true); assert.equal(preview.data.user.plan, 'pro');
  assert.match(preview.data.message, /No payment/);
});
test('cover-letter links are owner-checked on both create and update', async () => {
  assert.equal((await request('/api/cover-letters', { method: 'POST', cookie: userA.cookie, body: { resumeId: resumeB.id, title: 'Invalid Letter' } })).response.status, 404);
  const created = await request('/api/cover-letters', { method: 'POST', cookie: userA.cookie, body: { resumeId: resumeA.id, title: 'Example Letter', content: 'Letter text.' } });
  assert.equal(created.response.status, 201);
  const id = created.data.coverLetter.id;
  assert.equal((await request(`/api/cover-letters/${id}`, { method: 'PUT', cookie: userA.cookie, body: { resumeId: resumeB.id } })).response.status, 404);
  assert.equal((await request(`/api/cover-letters/${id}`, { cookie: userB.cookie })).response.status, 404);
  const copied = await request(`/api/cover-letters/${id}/duplicate`, { method: 'POST', cookie: userA.cookie, body: {} });
  assert.equal(copied.response.status, 201); assert.equal(copied.data.coverLetter.content, 'Letter text.');
});
test('atomic AI quota applies to concurrent requests and paid job matching', async () => {
  await prisma.user.update({ where: { id: userCap.id }, data: { aiUsageCount: 19 } });
  const callsBefore = summariesCalled;
  const results = await Promise.all([1, 2].map(() => request('/api/ai/summary', { method: 'POST', cookie: userCap.cookie, body: { title: 'Developer' } })));
  assert.deepEqual(results.map(r => r.response.status).sort(), [200, 429]);
  assert.equal(summariesCalled - callsBefore, 1);
  assert.equal((await prisma.user.findUnique({ where: { id: userCap.id } })).aiUsageCount, 20);
  await prisma.user.update({ where: { id: userA.id }, data: { aiUsageCount: 200 } });
  const paid = await request('/api/ai/job-match', { method: 'POST', cookie: userA.cookie, body: { resumeText: 'Developer', jobDescription: 'Developer role' } });
  assert.equal(paid.response.status, 429);
  await prisma.user.update({ where: { id: userA.id }, data: { aiUsageCount: 0 } });
});
test('AI import, tailoring and persisted histories preserve original facts', async () => {
  const imported = await request('/api/ai/import-resume', { method: 'POST', cookie: userA.cookie, body: { text: 'Example Candidate is a Developer with TypeScript skills.' } });
  assert.equal(imported.response.status, 200); assert.equal(imported.data.skills[0].name, 'TypeScript');
  const keywords = await request('/api/ai/keywords', { method: 'POST', cookie: userA.cookie, body: { resumeId: resumeA.id, resumeText: 'Developer TypeScript', jobDescription: 'TypeScript and SQL developer' } });
  assert.equal(keywords.response.status, 200);
  const tailored = await request('/api/ai/tailor', { method: 'POST', cookie: userA.cookie, body: { resumeId: resumeA.id, jobDescription: 'Developer who builds applications' } });
  assert.equal(tailored.response.status, 201); assert.notEqual(tailored.data.resume.id, resumeA.id);
  assert.equal(tailored.data.resume.experiences[0].company, 'Example Company');
  assert.equal(tailored.data.resume.experiences[0].startDate, '2022');
  assert.equal((await request(`/api/resumes/${resumeA.id}`, { cookie: userA.cookie })).data.resume.summary, 'Original summary.');
  const history = await request('/api/ai/history', { cookie: userA.cookie });
  assert.ok(history.data.history.some(record => record.mode === 'keywords' && record.resumeId === resumeA.id));
  assert.equal((await request('/api/ai/history', { cookie: userB.cookie })).data.history.length, 0);
  const countBefore = (await prisma.user.findUnique({ where: { id: userA.id } })).aiUsageCount;
  await request('/api/ai/history', { method: 'DELETE', cookie: userA.cookie });
  assert.equal((await request('/api/ai/history', { cookie: userA.cookie })).data.history.length, 0);
  assert.equal((await prisma.user.findUnique({ where: { id: userA.id } })).aiUsageCount, countBefore);
});
test('upload validates content, supported types and size', async () => {
  function form(name, content) { const data = new FormData(); data.append('file', new Blob([content]), name); return data; }
  assert.equal((await request('/api/upload/resume', { method: 'POST', cookie: userA.cookie, form: form('fake.pdf', 'not a PDF') })).response.status, 422);
  assert.equal((await request('/api/upload/resume', { method: 'POST', cookie: userA.cookie, form: form('legacy.doc', 'old Word format') })).response.status, 400);
  assert.equal((await request('/api/upload/resume', { method: 'POST', cookie: userA.cookie, form: form('large.pdf', Buffer.alloc(11 * 1024 * 1024)) })).response.status, 413);
});
test('profile/preferences persist, cross-origin mutations fail, and deletion requires a password', async () => {
  const profile = await request('/api/auth/profile', { method: 'PUT', cookie: userA.cookie, body: { name: 'Updated Example' } });
  assert.equal(profile.data.user.name, 'Updated Example');
  const preferences = await request('/api/auth/preferences', { method: 'PUT', cookie: userA.cookie, body: { theme: 'dark', defaultTemplateId: 'technical-compact' } });
  assert.equal(preferences.data.user.preferences.theme, 'dark');
  assert.equal((await request('/api/auth/profile', { method: 'PUT', cookie: userA.cookie, origin: 'https://untrusted.example', body: { name: 'Wrong Name' } })).response.status, 403);
  assert.equal((await request('/api/auth/account', { method: 'DELETE', cookie: userB.cookie, body: {} })).response.status, 400);
  assert.equal((await request('/api/auth/account', { method: 'DELETE', cookie: userB.cookie, body: { password: 'WrongPassword!' } })).response.status, 400);
  assert.equal((await request('/api/auth/account', { method: 'DELETE', cookie: userB.cookie, body: { password: 'ExamplePass123!' } })).response.status, 200);
  assert.equal((await request('/api/auth/me', { cookie: userB.cookie })).response.status, 401);
  assert.equal(await prisma.resume.count({ where: { userId: userB.id } }), 0);
});
test('password changes and one-time local recovery invalidate sessions', async () => {
  const secondLogin = await request('/api/auth/login', { method: 'POST', body: { email: 'A@EXAMPLE.TEST', password: 'ExamplePass123!' } });
  assert.equal(secondLogin.response.status, 200);
  const changed = await request('/api/auth/password', { method: 'PUT', cookie: userA.cookie, body: { currentPassword: 'ExamplePass123!', newPassword: 'NewExamplePass123!' } });
  assert.equal(changed.response.status, 200);
  assert.equal((await request('/api/auth/me', { cookie: userA.cookie })).response.status, 401);
  assert.equal((await request('/api/auth/me', { cookie: secondLogin.cookie })).response.status, 401);
  userA.cookie = changed.cookie;
  assert.equal((await request('/api/auth/me', { cookie: userA.cookie })).response.status, 200);
  const recovery = await request('/api/auth/forgot-password', { method: 'POST', body: { email: 'a@example.test' } });
  assert.equal(recovery.response.status, 200); assert.match(recovery.data.message, /No email was sent/);
  const token = new URL(recovery.data.developmentResetUrl).searchParams.get('token');
  const reset = await request('/api/auth/reset-password', { method: 'POST', body: { token, password: 'RecoveredPass123!' } });
  assert.equal(reset.response.status, 200);
  assert.equal((await request('/api/auth/reset-password', { method: 'POST', body: { token, password: 'RecoveredAgain123!' } })).response.status, 400);
  assert.equal((await request('/api/auth/me', { cookie: userA.cookie })).response.status, 401);
  const login = await request('/api/auth/login', { method: 'POST', body: { email: 'a@example.test', password: 'RecoveredPass123!' } });
  assert.equal(login.response.status, 200);
  await request('/api/auth/logout', { method: 'POST', cookie: login.cookie });
  assert.equal((await request('/api/auth/me', { cookie: login.cookie })).response.status, 401);
});


