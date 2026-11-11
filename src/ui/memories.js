/** Illustrated weather memories: each has a title, a one-line text and a tiny procedural 'illustration' recipe. */
export const MEMORY_DB = {
  cottage: { title: 'The Long-Awaited Rain', text: 'The first rain after a dry summer, and a whole village dancing on rooftops.', art: ['rain', '#7fb4e8', '#f4d8a0'] },
  pond: { title: 'Silent Pond', text: 'A winter pond so quiet you could hear snowflakes land.', art: ['snow', '#cfe8ff', '#8ab4d8'] },
  ring: { title: 'Lullaby Fog', text: 'Fog so soft it carried a lullaby from one valley to the next.', art: ['fog', '#d8d0e8', '#a898c8'] },
  rise: { title: 'Kite Contest', text: 'The smallest child and the biggest gust won it together.', art: ['wind', '#bfe8d8', '#f4c860'] },
  rainbow: { title: 'First Rainbow', text: 'The day sun and rain agreed on something and painted the sky.', art: ['sun', '#ffd878', '#8ac8f8'] },
  c2a: { title: 'First Puddle', text: 'The first puddle Juno ever jumped in — and the splash that followed.', art: ['rain', '#8ac0f0', '#f4e0b0'] },
  c2b: { title: 'The Right Forecast', text: 'Fen once got the forecast exactly right. He has never mentioned it.', art: ['sun', '#ffe0a0', '#90b0d8'] },
  c2c: { title: 'Dancing in the Wet', text: 'The whole village, umbrellas down, dancing in the rain.', art: ['rain', '#a0d0f8', '#e89090'] },
  c2d: { title: 'Orla’s First Umbrella', text: 'Patched twice, loved always. It still has the first stitch.', art: ['umbrella', '#d8604a', '#f4d8a0'] },
  c2e: { title: 'Tiny Shoe Prints', text: 'A wren-sized pair of footprints, circling the dry fountain.', art: ['fog', '#c8d8e8', '#a8b8c8'] },
  c3a: { title: 'Snow Angel', text: 'Juno’s first snow angel, slightly lopsided, entirely perfect.', art: ['snow', '#e8f4ff', '#9ac0e8'] },
  c3b: { title: 'A Bet with a Snowman', text: 'Fen lost a bet to a snowman. The snowman is still gloating.', art: ['snow', '#dcecff', '#c0a8d8'] },
  c3c: { title: 'Granny’s Lullaby', text: 'A winter lullaby, hummed slowly enough to last all night.', art: ['fog', '#d0d8f0', '#8098c8'] },
  c3d: { title: 'Half a Scarf', text: 'Bramble and Burr’s lost half of the shared scarf. They’ll be thrilled.', art: ['wind', '#f0b0b0', '#e8e8f8'] },
  c3e: { title: 'Small Snowman', text: 'A wren-sized snowman, waiting patiently for someone to say hello.', art: ['snow', '#f0f8ff', '#a0b8d0'] },
  c4a: { title: 'The Hugged Thunder', text: 'A toddler hugging a thunder-boomer, who had never been hugged before.', art: ['storm', '#8898c8', '#f8e060'] },
  c4b: { title: 'Lightning Lullaby', text: 'Gus’s first lightning lullaby, played on a very large wrench.', art: ['storm', '#7088b8', '#fff0a0'] },
  c4c: { title: 'Last Page', text: 'Fen’s forecast notebook, last page: “Tomorrow — together?”', art: ['sun', '#f8e8c0', '#98a8c8'] },
  c4d: { title: 'One Dancer', text: 'The Mayor’s rain dance, with exactly one attendee. He danced anyway.', art: ['rain', '#90b8e0', '#d8b0e0'] },
  c4e: { title: 'All the Weathers', text: 'A wren’s drawing of every weather, holding hands.', art: ['rainbow', '#ffd0d0', '#d0e8ff'] },
};
export function drawMemory(canvas, id) {
  const m = MEMORY_DB[id]; if (!m) return; const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height; const [kind, a, b] = m.art;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, y, r] of [[.25, .3, .14], [.42, .26, .18], [.62, .32, .15], [.78, .28, .11]]) { c.beginPath(); c.arc(x * W, y * H, r * W, 0, 7); c.fill(); }
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.fillStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2;
  if (kind === 'rain') for (let i = 0; i < 16; i++) { const x = (i * 0.063 + 0.05) * W, y = (0.5 + (i % 4) * 0.1) * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 14); c.stroke(); }
  if (kind === 'snow') for (let i = 0; i < 18; i++) { c.beginPath(); c.arc(((i * 37) % 100) / 100 * W, (0.45 + (i % 5) * 0.1) * H, 2.5, 0, 7); c.fill(); }
  if (kind === 'sun') { c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(W * 0.5, H * 0.62, 18, 0, 7); c.fill(); c.strokeStyle = '#ffd24a'; for (let i = 0; i < 12; i++) { const a2 = i / 12 * 6.283; c.beginPath(); c.moveTo(W * .5 + Math.cos(a2) * 24, H * .62 + Math.sin(a2) * 24); c.lineTo(W * .5 + Math.cos(a2) * 34, H * .62 + Math.sin(a2) * 34); c.stroke(); } }
  if (kind === 'wind') for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(W * .15, H * (.5 + i * .12)); c.bezierCurveTo(W * .4, H * (.4 + i * .12), W * .6, H * (.7 + i * .12), W * .85, H * (.5 + i * .12)); c.stroke(); }
  if (kind === 'fog') for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, H * (.45 + i * .1), W, H * .07); }
  if (kind === 'umbrella') { c.fillStyle = '#d8604a'; c.beginPath(); c.arc(W * .5, H * .65, 34, Math.PI, 0); c.fill(); c.strokeStyle = '#5a4a3a'; c.beginPath(); c.moveTo(W * .5, H * .65); c.lineTo(W * .5, H * .9); c.stroke(); }
  if (kind === 'storm') { c.fillStyle = 'rgba(60,70,110,.8)'; c.fillRect(0, 0, W, H * .45); c.strokeStyle = '#fff070'; c.lineWidth = 4; c.beginPath(); c.moveTo(W * .5, H * .4); c.lineTo(W * .44, H * .62); c.lineTo(W * .54, H * .62); c.lineTo(W * .46, H * .92); c.stroke(); }
  if (kind === 'rainbow') for (let i = 0; i < 6; i++) { c.strokeStyle = ['#ff6060', '#ffa040', '#ffe060', '#60d060', '#60a8ff', '#a070ff'][i]; c.lineWidth = 6; c.beginPath(); c.arc(W * .5, H * .95, 60 - i * 7, Math.PI, 0); c.stroke(); }
}
