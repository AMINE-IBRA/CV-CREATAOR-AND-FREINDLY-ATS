const test = require('node:test');
const assert = require('node:assert/strict');
const { editResumeChat } = require('../dist/services/openrouter.js');

test('resume chat sends the transcript as actual chat turns with current resume context', async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  let requestBody;
  process.env.OPENROUTER_API_KEY = 'test-only-key';
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return Response.json({
      choices: [{ message: { content: JSON.stringify({
        resume: { summary: 'Shorter summary.' },
        reply: 'I shortened the summary while keeping its key point.',
      }) } }],
    });
  };
  try {
    const result = await editResumeChat({
      resume: { fullName: 'Example User', summary: 'A long original summary.' },
      messages: [
        { role: 'user', content: 'Shorten my summary.' },
        { role: 'assistant', content: 'I shortened the summary.' },
        { role: 'user', content: 'Keep the main point.' },
      ],
      allowedTemplateIds: ['classic-professional'],
    });
    assert.deepEqual(requestBody.messages.map(message => message.role), ['system', 'user', 'user', 'assistant', 'user']);
    assert.equal(JSON.parse(requestBody.messages[1].content).resume.fullName, 'Example User');
    assert.match(requestBody.messages[2].content, /Shorten my summary/);
    assert.match(requestBody.messages[4].content, /Keep the main point/);
    assert.equal(requestBody.temperature, 0.65);
    assert.equal(result.reply, 'I shortened the summary while keeping its key point.');
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});
