const axios = require('axios');

// Official Fish Audio emotion tags
const OFFICIAL_EMOTIONS = [
    // Basic Emotions (24 expressions)
    'angry', 'sad', 'excited', 'surprised', 'satisfied', 'delighted',
    'scared', 'worried', 'upset', 'nervous', 'frustrated', 'depressed',
    'empathetic', 'embarrassed', 'disgusted', 'moved', 'proud', 'relaxed',
    'grateful', 'confident', 'interested', 'curious', 'confused', 'joyful',
    
    // Advanced Emotions (25 expressions)
    'disdainful', 'unhappy', 'anxious', 'hysterical', 'indifferent',
    'impatient', 'guilty', 'scornful', 'panicked', 'furious', 'reluctant',
    'keen', 'disapproving', 'negative', 'denying', 'astonished', 'serious',
    'sarcastic', 'conciliative', 'comforting', 'sincere', 'sneering',
    'hesitating', 'yielding', 'painful', 'awkward', 'amused',
    
    // Tone Markers (5 expressions)
    'in a hurry tone', 'shouting', 'screaming', 'whispering', 'soft tone',
    
    // Audio Effects (10 expressions)
    'laughing', 'chuckling', 'sobbing', 'crying loudly', 'sighing',
    'panting', 'groaning', 'crowd laughing', 'background laughter', 'audience laughing'
];

/**
 * Filters emotion tags to only include official Fish Audio emotions
 * @param {string} text - Text with emotion tags
 * @returns {string} - Text with only official emotion tags
 */
function filterOfficialEmotions(text) {
    // Find all emotion tags in the text
    const emotionMatches = text.match(/\(([^)]+)\)/g) || [];
    
    let filteredText = text;
    
    emotionMatches.forEach(match => {
        const emotion = match.replace(/[()]/g, '').toLowerCase().trim();
        
        // Check if it's an official emotion
        const isOfficial = OFFICIAL_EMOTIONS.some(official => 
            official.toLowerCase() === emotion
        );
        
        // If not official, remove the emotion tag
        if (!isOfficial) {
            filteredText = filteredText.replace(match, '');
            console.log(`[emotionDetection] Removed unofficial emotion: "${emotion}"`);
        }
    });
    
    // Clean up extra spaces left by removed emotions
    filteredText = filteredText.replace(/\s+/g, ' ').trim();
    
    return filteredText;
}

/**
 * Cleans text for TTS by removing symbols and formatting characters
 * @param {string} text - The text to clean
 * @returns {string} - The cleaned text
 */
function cleanTextForTTS(text) {
    if (!text) return text;
    
    return text
        // Remove asterisks and underscores (markdown formatting)
        .replace(/[*_]/g, '')
        // Remove quotes that might interfere with speech
        .replace(/[""]/g, '')
        // Remove backticks (code formatting)
        .replace(/`/g, '')
        // Remove tildes (common in text formatting)
        .replace(/~/g, '')
        // Remove excessive punctuation
        .replace(/[.]{2,}/g, '.')
        // Remove extra spaces
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim();
}

/**
 * Adds fallback emotions for long text using advanced pattern matching
 * @param {string} text - The text to enhance
 * @returns {string} - The text with emotions added
 */
function addFallbackEmotions(text) {
    let enhanced = text;
    let matchCount = 0;
    const maxMatches = 15; // Increased for longer text
    
    // Advanced emotion patterns with context awareness
    const emotionPatterns = [
        // Opening/Introduction patterns
        { pattern: /\b(let's|let me|i'm gonna|i want)\b/gi, emotion: '(confident)', priority: 1 },
        { pattern: /\b(baby~|daddy|sweetie)\b/gi, emotion: '(seductive)', priority: 1 },
        
        // Command patterns (high priority for JOI)
        { pattern: /\b(look|stare|watch|see)\b/gi, emotion: '(commanding)', priority: 2 },
        { pattern: /\b(take|grab|hold|get)\b/gi, emotion: '(serious)', priority: 2 },
        { pattern: /\b(stroke|touch|feel|squeeze|rub)\b/gi, emotion: '(sensual)', priority: 2 },
        
        // Speed/Intensity patterns
        { pattern: /\b(slowly|slow|gentle|soft)\b/gi, emotion: '(whispering)', priority: 1 },
        { pattern: /\b(faster|harder|more|intense)\b/gi, emotion: '(excited)', priority: 1 },
        { pattern: /\b(up and down|back and forth)\b/gi, emotion: '(rhythmic)', priority: 1 },
        
        // Control patterns
        { pattern: /\b(stop|wait|don't|no|not yet)\b/gi, emotion: '(commanding)', priority: 2 },
        { pattern: /\b(now|then|next|after)\b/gi, emotion: '(instructive)', priority: 1 },
        
        // Feedback patterns
        { pattern: /\b(good|perfect|right|exactly)\b/gi, emotion: '(satisfied)', priority: 1 },
        { pattern: /\b(bad|wrong|pathetic|disappointing)\b/gi, emotion: '(disapproving)', priority: 1 },
        { pattern: /\b(fuck|shit|damn|hell)\b/gi, emotion: '(intense)', priority: 1 },
        
        // Emotional expressions
        { pattern: /\b(oh|ah|mmm|yes|no)\b/gi, emotion: '(surprised)', priority: 1 },
        { pattern: /\b(please|want|need|crave)\b/gi, emotion: '(desperate)', priority: 1 },
        { pattern: /\b(moan|scream|tell me|say)\b/gi, emotion: '(demanding)', priority: 1 },
        
        // Imagination/Mental patterns
        { pattern: /\b(imagine|think|picture|pretend)\b/gi, emotion: '(whispering)', priority: 1 },
        { pattern: /\b(while|as|during)\b/gi, emotion: '(suggestive)', priority: 1 },
        
        // Physical sensations
        { pattern: /\b(hard|wet|hot|cold|tight)\b/gi, emotion: '(descriptive)', priority: 1 },
        { pattern: /\b(cock|pussy|dick|clit)\b/gi, emotion: '(intimate)', priority: 1 },
        
        // Submission/Domination
        { pattern: /\b(beg|ask|request|plead)\b/gi, emotion: '(submissive)', priority: 1 },
        { pattern: /\b(own|control|make|force)\b/gi, emotion: '(dominant)', priority: 1 },
        
        // Finale patterns
        { pattern: /\b(cum|finish|release|explode)\b/gi, emotion: '(urgent)', priority: 1 },
        { pattern: /\b(ready|almost|close)\b/gi, emotion: '(anticipatory)', priority: 1 }
    ];
    
    // Sort patterns by priority (higher priority first)
    emotionPatterns.sort((a, b) => b.priority - a.priority);
    
    // Apply patterns with priority and limit
    for (const { pattern, emotion, priority } of emotionPatterns) {
        if (matchCount >= maxMatches) break;
        
        const matches = enhanced.match(pattern);
        if (matches && matches.length > 0) {
            // Apply emotion to first few matches only to avoid over-tagging
            let appliedCount = 0;
            enhanced = enhanced.replace(pattern, (match) => {
                if (appliedCount >= 2 || matchCount >= maxMatches) return match;
                appliedCount++;
                matchCount++;
                return `${match} ${emotion}`;
            });
        }
    }
    
    // Add some strategic emotions based on text structure
    enhanced = addStructuralEmotions(enhanced, matchCount);
    
    console.log(`[emotionDetection] Added ${matchCount} fallback emotion tags for long text`);
    return enhanced;
}

/**
 * Adds emotions based on text structure and flow
 * @param {string} text - The text to enhance
 * @param {number} currentCount - Current emotion count
 * @returns {string} - Enhanced text with structural emotions
 */
function addStructuralEmotions(text, currentCount) {
    let enhanced = text;
    let structuralCount = 0;
    
    // Add emotions at key structural points
    const sentences = text.split(/[.!?]+/);
    let sentenceCount = 0;
    
    for (let i = 0; i < sentences.length && structuralCount < 3; i++) {
        const sentence = sentences[i].trim();
        if (sentence.length > 10) { // Only for substantial sentences
            sentenceCount++;
            
            // Opening sentences
            if (sentenceCount === 1 && sentence.length > 20) {
                enhanced = enhanced.replace(sentence, `${sentence} (confident)`);
                structuralCount++;
            }
            // Middle climax sentences
            else if (sentenceCount === Math.floor(sentences.length / 2) && sentence.includes('fuck')) {
                enhanced = enhanced.replace(sentence, `${sentence} (intense)`);
                structuralCount++;
            }
            // Final sentences
            else if (sentenceCount === sentences.length - 1 && (sentence.includes('ready') || sentence.includes('beg'))) {
                enhanced = enhanced.replace(sentence, `${sentence} (urgent)`);
                structuralCount++;
            }
        }
    }
    
    return enhanced;
}

/**
 * Processes long text in chunks using AI emotion detection
 * @param {string} text - The text to process
 * @returns {Promise<string>} - The processed text with emotions
 */
async function processTextInChunks(text) {
    const uncensoredApiKey = process.env.UNCENSOREDLM_API;
    const chunkSize = 800; // Smaller chunks for better processing
    const sentences = text.split(/[.!?]+/);
    
    let processedChunks = [];
    let currentChunk = '';
    
    // Create chunks from sentences
    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;
        
        if ((currentChunk + trimmedSentence).length > chunkSize && currentChunk) {
            processedChunks.push(currentChunk.trim());
            currentChunk = trimmedSentence;
        } else {
            currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
        }
    }
    
    if (currentChunk.trim()) {
        processedChunks.push(currentChunk.trim());
    }
    
    console.log(`[emotionDetection] Processing ${processedChunks.length} chunks`);
    
    // Process each chunk with AI
    const emotionPrompt = `Add emotion tags to this text for Fish Audio TTS. Available emotions: (angry), (sad), (excited), (surprised), (satisfied), (delighted), (scared), (worried), (upset), (nervous), (frustrated), (depressed), (empathetic), (embarrassed), (disgusted), (moved), (proud), (relaxed), (grateful), (confident), (interested), (curious), (confused), (joyful), (disdainful), (unhappy), (anxious), (hysterical), (indifferent), (impatient), (guilty), (scornful), (panicked), (furious), (reluctant), (keen), (disapproving), (negative), (denying), (astonished), (serious), (sarcastic), (conciliative), (comforting), (sincere), (sneering), (hesitating), (yielding), (painful), (awkward), (amused), (in a hurry tone), (shouting), (screaming), (whispering), (soft tone), (laughing), (chuckling), (sobbing), (crying loudly), (sighing), (panting), (groaning).

Return ONLY the text with emotion tags added. No explanations.`;
    
    const processedChunksResult = [];
    
    for (let i = 0; i < Math.min(processedChunks.length, 3); i++) { // Limit to 3 chunks to avoid rate limits
        const chunk = processedChunks[i];
        console.log(`[emotionDetection] Processing chunk ${i + 1}/${Math.min(processedChunks.length, 3)}`);
        
        try {
            const response = await axios.post('https://mkstqjtsujvcaobdksxs.functions.supabase.co/functions/v1/uncensoredlm-api', {
                model: 'uncensored-lm',
                messages: [
                    { role: 'user', content: `${emotionPrompt}\n\nText: "${chunk}"` }
                ],
                temperature: 0.7,
                max_tokens: 300
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${uncensoredApiKey}`
                }
            });
            
            const enhancedChunk = response.data?.choices?.[0]?.message?.content?.trim();
            if (enhancedChunk && enhancedChunk.includes('(')) {
                processedChunksResult.push(enhancedChunk);
            } else {
                processedChunksResult.push(chunk);
            }
        } catch (error) {
            console.log(`[emotionDetection] Chunk ${i + 1} processing failed, using original`);
            processedChunksResult.push(chunk);
        }
    }
    
    // Add remaining chunks without processing
    for (let i = 3; i < processedChunks.length; i++) {
        processedChunksResult.push(processedChunks[i]);
    }
    
    return processedChunksResult.join('. ');
}

/**
 * Analyzes text and determines TTS parameters based on emotion content
 * @param {string} text - The original text to analyze
 * @returns {Promise<{text: string, ttsParams: object, displayText: string}>} - Object with clean text, TTS params, and display text with emotions
 */
async function addEmotionTags(text) {
    // First clean the text for TTS
    const cleanedText = cleanTextForTTS(text);
    console.log(`[emotionDetection] Processing text: "${cleanedText}"`);
    console.log(`[emotionDetection] Text length: ${cleanedText.length} characters`);
    
    const uncensoredApiKey = process.env.UNCENSOREDLM_API;
    
    // Default TTS parameters
    let ttsParams = {
        temperature: 0.7,
        top_p: 0.7,
        chunk_length: 200
    };
    
    // Default return object
    let result = {
        text: cleanedText, // Clean text for TTS (no emotion tags)
        ttsParams: ttsParams,
        displayText: cleanedText // Display text (will be enhanced with emotions)
    };

    if (!uncensoredApiKey) {
        console.log(`[emotionDetection] No UNCENSOREDLM_API key found, returning default parameters`);
        return result;
    }
    
    // For very long text (>1000 chars), try chunked AI processing first, then fallback
    if (cleanedText.length > 1000) {
        console.log(`[emotionDetection] Text too long (${cleanedText.length} chars), attempting chunked AI processing`);
        
        try {
            const chunkedResult = await processTextInChunks(cleanedText);
            if (chunkedResult && chunkedResult.includes('(')) {
                console.log(`[emotionDetection] ✅ Chunked AI processing successful`);
                const filteredChunked = filterOfficialEmotions(chunkedResult);
                result.displayText = filteredChunked;
                result.ttsParams = adjustTtsParamsForEmotion(filteredChunked);
                return result;
            }
        } catch (chunkError) {
            console.log(`[emotionDetection] Chunked AI processing failed, using fallback: ${chunkError.message}`);
        }
        
        console.log(`[emotionDetection] Using advanced fallback emotion detection`);
        const fallbackResult = addFallbackEmotions(cleanedText);
        const filteredFallback = filterOfficialEmotions(fallbackResult);
        result.displayText = filteredFallback;
        result.ttsParams = adjustTtsParamsForEmotion(filteredFallback);
        return result;
    }
    
    try {
        const emotionPrompt = `You are an expert at adding emotion tags for Fish Audio's s1 TTS model. 

TASK: Add emotion tags to make the text more expressive for voice synthesis.

AVAILABLE EMOTION TAGS: (angry), (sad), (excited), (surprised), (satisfied), (delighted), (scared), (worried), (upset), (nervous), (frustrated), (depressed), (empathetic), (embarrassed), (disgusted), (moved), (proud), (relaxed), (grateful), (confident), (interested), (curious), (confused), (joyful), (disdainful), (unhappy), (anxious), (hysterical), (indifferent), (impatient), (guilty), (scornful), (panicked), (furious), (reluctant), (keen), (disapproving), (negative), (denying), (astonished), (serious), (sarcastic), (conciliative), (comforting), (sincere), (sneering), (hesitating), (yielding), (painful), (awkward), (amused), (in a hurry tone), (shouting), (screaming), (whispering), (soft tone), (laughing), (chuckling), (sobbing), (crying loudly), (sighing), (panting), (groaning)

TEXT TO ENHANCE: "${cleanedText}"

RULES:
- Add emotion tags where they would enhance the speech
- Keep the original text mostly intact
- Add 2-5 emotion tags maximum
- Use tags that match the emotional tone
- Return ONLY the enhanced text, no explanations

EXAMPLE: "Hello there!" → "Hello (confident) there!"`;
        
        console.log(`[emotionDetection] Making request to Uncensored.AI with prompt length: ${emotionPrompt.length}`);
        
        const emotionResponse = await axios.post('https://mkstqjtsujvcaobdksxs.functions.supabase.co/functions/v1/uncensoredlm-api', {
            model: 'uncensored-lm',
            messages: [
                { role: 'user', content: emotionPrompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${uncensoredApiKey}`
            }
        });
        
        console.log(`[emotionDetection] Uncensored.AI response status: ${emotionResponse.status}`);
        console.log(`[emotionDetection] Uncensored.AI response data:`, emotionResponse.data);
        
        const emotionEnhanced = emotionResponse.data?.choices?.[0]?.message?.content?.trim();
        console.log(`[emotionDetection] Enhanced text: "${emotionEnhanced}"`);
        console.log(`[emotionDetection] Enhanced text length: ${emotionEnhanced?.length || 0}`);
        console.log(`[emotionDetection] Has parentheses: ${emotionEnhanced?.includes('(') || false}`);
        console.log(`[emotionDetection] Is different from cleaned text: ${emotionEnhanced !== cleanedText}`);
        
               if (emotionEnhanced && emotionEnhanced.length > 0 && emotionEnhanced !== cleanedText && emotionEnhanced.includes('(')) {
                   console.log(`[emotionDetection] ✅ Using enhanced text with emotions`);
                   const filteredEmotions = filterOfficialEmotions(emotionEnhanced);
                   result.displayText = filteredEmotions;
                   result.ttsParams = adjustTtsParamsForEmotion(filteredEmotions);
                   return result;
               }
               
               // Fallback: Try to add basic emotions based on content analysis
               if (!emotionEnhanced || !emotionEnhanced.includes('(')) {
                   console.log(`[emotionDetection] 🔄 Attempting fallback emotion detection`);
                   const fallbackResult = addFallbackEmotions(cleanedText);
                   const filteredFallback = filterOfficialEmotions(fallbackResult);
                   result.displayText = filteredFallback;
                   result.ttsParams = adjustTtsParamsForEmotion(filteredFallback);
                   return result;
               }
               
               console.log(`[emotionDetection] ❌ Returning default parameters (no enhancements possible)`);
               return result; // Return cleaned text if processing failed or no changes
    } catch (emotionError) {
        console.error('[emotionDetection] Error:', emotionError?.response?.data || emotionError.message);
        return result; // Return default result if emotion detection fails
    }
}

/**
 * Adjusts TTS parameters based on detected emotions in text
 * @param {string} textWithEmotions - Text containing emotion tags
 * @returns {object} - Adjusted TTS parameters
 */
function adjustTtsParamsForEmotion(textWithEmotions) {
    let temperature = 0.7;
    let top_p = 0.7;
    let chunk_length = 200;
    
    // Analyze emotion patterns and adjust parameters
    const emotions = textWithEmotions.match(/\(([^)]+)\)/g) || [];
    
    // Count different emotion types
    const emotionCounts = {};
    emotions.forEach(emotion => {
        const cleanEmotion = emotion.replace(/[()]/g, '').toLowerCase();
        emotionCounts[cleanEmotion] = (emotionCounts[cleanEmotion] || 0) + 1;
    });
    
    // Adjust temperature based on emotion intensity
    const intenseEmotions = ['angry', 'excited', 'furious', 'screaming', 'shouting', 'intense'];
    const softEmotions = ['whispering', 'soft tone', 'gentle', 'calm'];
    const dramaticEmotions = ['screaming', 'shouting', 'excited', 'furious'];
    
    const hasIntenseEmotions = intenseEmotions.some(emotion => emotionCounts[emotion]);
    const hasSoftEmotions = softEmotions.some(emotion => emotionCounts[emotion]);
    const hasDramaticEmotions = dramaticEmotions.some(emotion => emotionCounts[emotion]);
    
    if (hasIntenseEmotions || hasDramaticEmotions) {
        temperature = 0.9; // Higher temperature for more expressive/emotional speech
        top_p = 0.8;
    } else if (hasSoftEmotions) {
        temperature = 0.6; // Lower temperature for softer speech
        top_p = 0.6;
    }
    
    // Adjust chunk length for longer emotional content
    if (textWithEmotions.length > 500) {
        chunk_length = 300;
    }
    
    console.log(`[emotionDetection] Adjusted TTS params - temperature: ${temperature}, top_p: ${top_p}, chunk_length: ${chunk_length}`);
    console.log(`[emotionDetection] Detected emotions:`, emotionCounts);
    
    return {
        temperature: temperature,
        top_p: top_p,
        chunk_length: chunk_length
    };
}

module.exports = { addEmotionTags, cleanTextForTTS, addFallbackEmotions, processTextInChunks, filterOfficialEmotions };
