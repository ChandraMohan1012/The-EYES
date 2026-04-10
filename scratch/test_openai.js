const { OPENAI_API_KEY } = process.env;

async function testOpenAI() {
  console.log('Testing OpenAI API Key...');
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set.');
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (response.ok) {
      console.log('SUCCESS: OpenAI API Key is valid.');
    } else {
      const err = await response.json();
      console.error('FAILURE: OpenAI API Error:', JSON.stringify(err, null, 2));
    }
  } catch (err) {
    console.error('ERROR: Network error:', err);
  }
}

testOpenAI();
