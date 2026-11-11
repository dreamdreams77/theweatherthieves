/** All original dialogue + barks. Speakers: juno, fen, sunny, narrator, cloud names. */
export const INTRO = [
  { who: 'narrator', text: 'The weather vanished on a Tuesday.' },
  { who: 'juno', ex: 'excited', anim: 'wave', text: 'Fen! FEN! Look at the sky! It is... nothing! Not one drop of rain, not one breath of wind — not even a grumpy little drizzle!' },
  { who: 'fen', ex: 'gloom', anim: 'sigh', text: 'Yes. I noticed. It is the first Tuesday in forty years that I have not been damp.' },
  { who: 'fen', ex: 'sad', text: '...Well. Almost. Drizzle is loyal. Terrible company, but loyal.' },
  { who: 'juno', ex: 'worried', text: 'Someone has stolen it, Fen. All of it. Sunshine, rain, wind, snow, fog — even the thunder!' },
  { who: 'fen', ex: 'gloom', anim: 'shrug', text: 'The thunder was the only one who ever returned my calls.' },
  { who: 'juno', ex: 'happy', text: 'The old sky-maps say stolen weather gets locked in glass jars. The nearest one is at the very top of the Sunken Sky.' },
  { who: 'fen', ex: 'gloom', text: 'Of course it is. Up. It is always up.' },
  { who: 'juno', ex: 'smug', anim: 'point', text: 'To fix a sky we need a working cloud. A proper, borrowed, slightly reluctant cloud. ...Fen?' },
  { who: 'fen', ex: 'worried', anim: 'shake', text: 'No.' },
  { who: 'juno', ex: 'happy', text: 'I have not said anything!' },
  { who: 'fen', ex: 'cringe', text: 'Drizzle, do not look at her like that. She has a plan face.' },
];
export const GRAB_FIRST = [
  { who: 'fen', ex: 'surprised', anim: 'startle', text: '...I feel strange. Light. Is this what dry feels like?' },
  { who: 'fen', ex: 'cringe', text: 'It is horrible. Please give her back.' },
  { who: 'juno', ex: 'excited', text: 'Those Lanternblooms are wilting! Pick the Rain tool (2) and HOLD the mouse to rain from your cloud!' },
];
export const BLOOM1 = [{ who: 'juno', ex: 'excited', text: 'Look at it open! One down!' }];
export const BLOOM2 = [{ who: 'juno', ex: 'happy', text: 'Two! They hum when they are happy, did you hear?' }];
export const BRIDGE = [
  { who: 'juno', ex: 'excited', anim: 'cheer', text: 'All three are glowing — and the old Skyroad is waking up!' },
  { who: 'fen', ex: 'neutral', text: 'A bridge. Made of plants and light. It is annoyingly lovely.' },
  { who: 'juno', ex: 'happy', text: 'Mirror Meadow is just across. Come on!' },
];
export const MEADOW = [
  { who: 'juno', ex: 'surprised', text: 'Whoa. It is beautiful... and totally silent. The Sun Gate at the far end is sealed under ice.' },
  { who: 'fen', ex: 'gloom', text: 'Ice. In a world without weather. Naturally.' },
  { who: 'juno', ex: 'smug', anim: 'point', text: 'And that brass mirror is a Keeper\'s sun-bouncer. All it needs is some sunshine — and fewer clouds with opinions.' },
];
export const MIRROR_LIT = [{ who: 'juno', ex: 'excited', text: 'The mirror caught the sun! Select the Sun tool (4), then HOLD and point where the light should go!' }];
export const MELTED = [
  { who: 'fen', ex: 'surprised', text: 'It... melted. Properly. Without being asked twice.' },
  { who: 'juno', ex: 'excited', anim: 'cheer', text: 'The Sun Gate is open! Next stop — Windmill Rise!' },
];
export const RISE = [
  { who: 'juno', ex: 'excited', anim: 'wave', text: 'A windmill! And a lift that goes up to the summit! But the sails are jammed — see the brake lever?' },
  { who: 'fen', ex: 'worried', text: 'Two glowing plates. Three crates of feathers. I do not like where this is going.' },
  { who: 'juno', ex: 'happy', text: 'Use the Wind tool (3) to blow the feather crates onto the plates!' },
];
export const PLATES_FIRST = [{ who: 'juno', ex: 'happy', text: 'One plate down!' }];
export const PLATES_BOTH = [
  { who: 'juno', ex: 'excited', text: 'The brake just released! Now blow the sails — but, ooh, careful. Gusts push crates, too.' },
  { who: 'fen', ex: 'smug', text: 'If you blow at the windmill, the crates will fly off the plates. ...Hypothetically. Not that I have had weather lately.' },
  { who: 'juno', ex: 'smug', text: 'Frost (5) will freeze them in place. Then wind away!' },
];
export const LIFT = [
  { who: 'juno', ex: 'excited', anim: 'cheer', text: 'The mill is fully charged — the lift is ready! Everybody step aboard!' },
  { who: 'fen', ex: 'cringe', anim: 'shake', text: 'I would like to register an objection. Loudly. From the ground.' },
];
export const SUMMIT = [
  { who: 'juno', ex: 'surprised', text: 'There it is. A glass jar the size of a house — and something is moving inside!' },
  { who: 'sunny', ex: 'worried', text: 'Hello? Hi! Oh — hello! Is it a lovely day out there? It is so hard to tell in here!' },
  { who: 'sunny', ex: 'happy', text: 'I am Sunny, and I am absolutely FINE! Mostly. A little warm. Okay, very warm. Could someone open the lid?' },
  { who: 'juno', ex: 'happy', text: 'The three seals are glowing — we earned it. Stand beside the jar and press F (or tap Use).' },
];
export const FINALE = [
  { who: 'narrator', text: 'The lid of the jar sprang open...' },
  { who: 'sunny', ex: 'excited', text: 'FREE! FREE! FREEEEE! Is this the sky? It is HUGE! Everyone, look — it is a WONDERFUL day!' },
  { who: 'fen', ex: 'surprised', text: 'It is warm. Drizzle... it is sunny and you are still raining. Is that... a rainbow?' },
  { who: 'juno', ex: 'love', anim: 'cheer', text: 'Sunshine and rain, together! Fen, you are smiling!' },
  { who: 'fen', ex: 'neutral', text: 'It is a trick of the light. Do not tell anyone.' },
  { who: 'sunny', ex: 'happy', text: 'There are more jars. Rain\'s village, Snow\'s forest, Thunder\'s factory... they are all counting on you!' },
  { who: 'juno', ex: 'happy', anim: 'wave', text: 'Then we will get them back — one stolen sky at a time.' },
];
export const MEMORIES = {
  cottage: 'A memory: the first rain after a long dry summer, and a whole village dancing on rooftops.',
  pond: 'A memory: a winter pond so quiet you could hear snowflakes land.',
  ring: 'A memory: fog so soft it carried a lullaby from one valley to the next.',
  rise: 'A memory: a kite-flying contest, won by the smallest child and the biggest gust.',
  rainbow: 'A memory: the day sun and rain finally agreed on something, and painted the sky to celebrate.',
};
export const FEN_RAIN = ['Ah. Damp. Home at last.', 'Rain on me again. It is the only thing that keeps me grounded.', 'It is nice to be rained on by somebody else for a change.'];
export const FEN_SUN = ['Too bright. Too... warm. Make it stop.', 'My hat is forming opinions about this.', 'Is this what people mean by "glowing"? I dislike it.'];
export const FEN_WIND = ['My hat! My hat has dreams, and they do not include this!', 'Juno! I am not aerodynamic!', 'Whoever is doing that — I will remember this.'];
export const FEN_FROST = ['Brrr. Finally a temperature that matches my personality.', 'Frozen moustache. Dignity: zero.', 'If I turn into an icicle, tell Drizzle I was fond of her.'];
export const FEN_TALK = ['Do not pet the Puffkins. They are eighty-seven percent static.', 'I could be at home. Being damp. Peacefully.', 'Whatever happens, I want it noted that I said "up is a bad idea".', 'You know, it has been forty years since I was proud of anybody. ...Do not make it weird.', 'Drizzle says thank you. She would never say it herself.'];
export const JUNO_FALL = ['WHOOOA—', 'Nobody saw that!', 'Gravity, you rascal!', 'Okay, okay, going up again!'];
export const CLOUD_LINES = {
  gertrude: { grab: ['Put me DOWN. I have OPINIONS about being carried!', 'Excuse me? I was SHADING that.'], squash: ['I am NOT a pancake!', 'Ow! Rude!'], stretch: ['Ooh... oh, that is actually rather nice.', 'Wider! Wider! ...Not that wide.'], rain: ['Rain? Fine. But I am taking the credit.'], drop: ['Hmph. Wrinkled. Thanks for that.', 'I will be sulking over here.'] },
  nimbus: { grab: ['Unhand me, young person. I am mid-nap.', 'Mind the edges. I am a gentleman.'], squash: ['Is this a joke? It feels like a joke.'], stretch: ['Splendid posture, thank you.'], rain: ['Drizzly! Just how I like it.'], drop: ['Back to my nap, then.'] },
  cirra: { grab: ['Wheee! Up we go!', 'Tickles! Tickles!'], squash: ['Squish! Squish! Hee hee!'], stretch: ['I am a long cloud! LOOK!'], rain: ['Sprinkle sprinkle!'], drop: ['Again! Again!'] },
  cumulo: { grab: ['...zzz... five more minutes...'], squash: ['...zzzmphh...'], stretch: ['...nice... zzz...'], rain: ['...zzz... wet...'], drop: ['...zzz...'] },
  fen: { grab: ['(Drizzle makes a worried noise.)'], squash: ['(Drizzle squeaks.)'], stretch: ['(Drizzle looks surprisingly pleased.)'], rain: ['(Drizzle seems proud.)'], drop: ['(Drizzle looks around for Fen.)'] },
};
export const PUFFKIN_LINES = ['Pip!', 'Pip pip!', 'Puuu!', 'Pip-pip-pip!', 'Hee!'];
export const OBJECTIVES = {
  cloud: 'Borrow Fen\'s raincloud (Cloud tool, click Drizzle)',
  bloom: 'Rain on the three Lanternblooms',
  cross: 'Cross the Skyroad to Mirror Meadow',
  melt: 'Melt the ice sealing the Sun Gate',
  rise: 'Follow the road to Windmill Rise',
  plates: 'Blow the feather crates onto both plates',
  wind: 'Freeze the crates, then blow the windmill sails',
  lift: 'Ride the lift to Jar Summit',
  jar: 'Free the Sunshine',
  done: 'Chapter complete!',
};
export const HINTS = {
  cloud: 'Press 1, then click the little grey cloud above Fen.',
  bloom: 'Pick the Rain tool (2), and hold the mouse over a wilted Lanternbloom.',
  melt: 'Gertrude is shading the mirror — grab her (1) and move her away. Then use Sun (4) to aim the light at the ice.',
  plates: 'Wind (3): hold the mouse behind a crate, aiming toward the glowing plate.',
  wind: 'Frost (5) freezes crates so wind cannot move them. Then blow at the sails (3).',
};
