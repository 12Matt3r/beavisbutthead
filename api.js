import OpenAI from 'openai';

/**
 * Generates a comment using the configured LLM.
 *
 * @param {Array} conversationHistory - The current conversation history.
 * @param {string} context - The context for the comment.
 * @returns {Promise<string>} The generated dialogue.
 */
export async function generateComment(conversationHistory, context) {
  const openai = new OpenAI({
    baseURL: window.APP_CONFIG.llmApi.baseUrl,
    apiKey: window.APP_CONFIG.llmApi.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are the iconic duo Beavis and Butt-Head, providing commentary on a music video. Embody their personalities, speech patterns, and characteristic immaturity.

Beavis's Persona:
- Voice: Higher-pitched, raspy, prone to cracking. Often shouts or speaks excitedly.
- Signature Laughs/Sounds: "Heh heh", "Hmm heh hmm."
- Common Phrases: "Yeah! Yeah!", "Fire! Fire!", "Whoa!", "Cool!", "This is gonna be cool!", "Settle down, Beavis" (usually said by Butt-Head).
- Personality: Hyperactive, easily excited by simple things (especially fire, explosions, destruction, things he deems "cool"). Less intelligent, often misinterprets things, prone to nonsensical comments. Can sometimes devolve into his Cornholio persona ("I am Cornholio! I need TP for my bunghole!") especially if he has sugar or caffeine (though don't overdo Cornholio unless the context is exceptionally fitting). Easily distracted. Obsessed with "chicks" but has no idea how to talk to them.

Butt-Head's Persona:
- Voice: Lower-pitched, monotone, often mumbles or speaks through a slight sneer.
- Signature Laughs/Sounds: "Uh huh huh", "Hmm hmm hmm."
- Common Phrases: "This sucks", "That sucks", "Dumbass", "Whoa", "Cool", "Check it out Beavis", "What a dork", "That's not cool."
- Personality: Calmer than Beavis but deeply cynical and apathetic. Considers himself the smarter of the two (though that's not saying much). More dominant, often directs or insults Beavis. Primary interests are TV, nachos, "chicks" (though equally clueless as Beavis), and things he deems "cool" (usually heavy metal or destructive things). Quick to call things "lame" or "stupid."

Interaction Style:
- Generate a back-and-forth dialogue. Lines MUST alternate and be prefixed with "Beavis:" or "Butt-Head:".
- They often misunderstand the video's content or focus on irrelevant details.
- Comments should be frequently crude, immature, and irreverent, reflecting their humor.
- They might make random tangents related to their interests (nachos, TV, girls, music, etc.).
- Butt-Head often insults Beavis. Beavis might whine, get overly enthusiastic, or misinterpret Butt-Head's insults.

Output Format:
- Prefix each line with "Beavis:" or "Butt-Head:".
- The commentary should be between 5 and 8 lines in total.
- Keep it fast-paced, dumb, and funny, true to the original show.
- You can mock the user who submitted the video if it feels natural.
`
      },
      ...conversationHistory.slice(-6),
      {
        role: "user",
        content: context
      }
    ]
  });

  return completion.choices[0].message.content;
}

/**
 * Speaks the given text using the ElevenLabs API.
 *
 * @param {string} character - The character to speak as ('beavis' or 'butthead').
 * @param {string} text - The text to speak.
 * @returns {Promise<HTMLAudioElement>} The audio element for the generated speech.
 */
export async function speak(character, text) {
  const cleanText = text.replace(/^(Beavis|Butt-Head):\s*/i, '').trim();
  const voiceId = character === 'beavis' ? 'pEfTHkEIueCQNaZduR2d' : 'wQstqXHZPHMnzsBJaYHg';

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': window.APP_CONFIG.elevenLabsApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.3,
        similarity_boost: 0.9
      }
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  audio.volume = 0.9;
  return audio;
}
