const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { title, content } = JSON.parse(event.body || '{}');
    const CLAUDE_KEY = process.env.CLAUDE_KEY;

    if (!CLAUDE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API 키 없음' }) };
    }

    const requestBody = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `너는 커뮤니티 앱 "잘잘못"의 글 다듬기 도우미야.
아래 갈등 상황의 내용만 다듬어줘. 제목은 절대 바꾸지 마.
1. 맞춤법과 문법 교정
2. 문장을 자연스럽고 읽기 쉽게
3. 핵심 내용 유지, 불필요한 반복 제거
4. 반드시 JSON 형식으로만 응답: {"title": "원래 제목 그대로", "content": "다듬은 내용"}

제목: ${title || '(없음)'}
내용: ${content}`
        }
      ]
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });

      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });

    console.log('Claude 응답 상태:', result.status);
    console.log('Claude 응답 내용:', result.body);

    if (result.status !== 200) {
      return { statusCode: 502, body: result.body };
    }

    const data = JSON.parse(result.body);

    // content 배열 안전하게 접근
    if (!data.content || !data.content[0] || !data.content[0].text) {
      return { statusCode: 500, body: JSON.stringify({ error: '응답 형식 오류', raw: data }) };
    }

    const text = data.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();

    // JSON 파싱 시도
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch(e) {
      // JSON 파싱 실패시 원문 그대로 반환
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || '제목', content: text }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };

  } catch(e) {
    console.log('오류:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
