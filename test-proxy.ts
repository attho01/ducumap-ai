async function test() {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=fake_key_12345', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'hi' }] }]
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', data);
  } catch (e) {
    console.error(e);
  }
}
test();
