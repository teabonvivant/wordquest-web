export function normalizeVoiceText(text) {
  return String(text ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

// Keep wording aligned with the question that is actually on the screen.
export function questionSpeech(q) {
  return q.prompt + (q.instruction ? '。' + q.instruction : '')
    + (q.diagram ? '。' + q.diagram.alt : '')
    + (q.choices ? '。' + q.choices.map(c => `${c.id}，${c.text}`).join('。') : '')
    + (q.items ? '。項目有：' + q.items.map(i => i.label).join('，') : '');
}

export async function voiceKey(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizeVoiceText(text)));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}
