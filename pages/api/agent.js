export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing OpenAI API Key' });
    return;
  }

  try {
    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are Eloise, a helpful AI agent.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 128,
      }),
    });

    const data = await apiRes.json();

    if (data.error) {
      console.log('OpenAI API error:', data.error);
      return res.status(500).json({ error: data.error.message || 'OpenAI API error.' });
    }

    console.log('OpenAI API response:', data);

    const agentReply = data.choices?.[0]?.message?.content || 'No response.';
    res.status(200).json({ response: agentReply });
  } catch (err) {
    res.status(500).json({ error: err.message || 'OpenAI request failed.' });
  }
}
