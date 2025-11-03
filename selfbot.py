import discord
import random
import asyncio
import datetime
import requests
import os
from discord.ext import commands, tasks
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
TOKEN = os.getenv("SELF_BOT_TOKEN") or os.getenv("AUTO_POSTER_TOKEN")
if TOKEN:
    TOKEN = TOKEN.strip()  # Remove any whitespace
UNCENSORED_AI_KEY = os.getenv("UNCENSORED_AI_KEY") or os.getenv("UNCENSORED_API_KEY")
if UNCENSORED_AI_KEY:
    UNCENSORED_AI_KEY = UNCENSORED_AI_KEY.strip()
UNCENSORED_AI_ENDPOINT = os.getenv("UNCENSORED_AI_ENDPOINT") or "https://mkstqjtsujvcaobdksxs.functions.supabase.co/functions/v1/uncensoredlm-api"

# Target channels (politics server: 367092205539557376)
CHANNELS = {
    1072529687261229148: "war-room",      # war-room
    945736971966349322: "us-politics",    # us-politics
    946071650930147368: "religion-chat"   # religion-chat
}

# Initialize bot 
bot = commands.Bot(command_prefix="!", self_bot=True)

# Channel-specific seed messages for the AI to expand on
CHANNEL_SEED_MESSAGES = {
    "war-room": [
        "The media never talks about how Jews control the banks and media",
        "The deep state is trying to destroy traditional values",
        "The globalist agenda is meant to weaken western civilization",
        "The elites are trying to replace us with immigrants",
        "The truth about who really controls our government",
        "People need to wake up to what's really happening",
        "The establishment is terrified of the truth getting out",
        "They want to silence anyone who speaks the truth",
        "The mainstream media is pure propaganda",
        "We need to take our country back from the globalists",
        "The woke agenda is destroying everything good",
        "They're trying to rewrite history to fit their narrative",
        "The truth is being censored everywhere",
        "We're living in a clown world",
        "The elites think they're untouchable",
        "They want to control every aspect of our lives",
        "The system is rigged against ordinary people",
        "We need to fight back against the establishment",
        "The left can't handle the truth",
        "The military industrial complex profits from endless wars",
        "They're using Ukraine as a proxy war against Russia",
        "The deep state wants to start WW3",
        "Our troops are being used as pawns in globalist games",
        "The war machine never stops",
        "They're manufacturing consent for more conflict",
        "The Jews are behind every major war",
        "Zionist bankers fund both sides of conflicts",
        "The Holocaust narrative is used to justify everything",
        "Israel controls our foreign policy",
        "The Jewish lobby runs Washington"
    ],
    "us-politics": [
        "Trump was the best president we've had in decades",
        "Trump's presidency exposed the corruption in Washington",
        "The left has completely lost their minds",
        "Biden's policies are destroying this country",
        "The establishment is terrified of the truth getting out",
        "They want to silence anyone who speaks the truth",
        "The mainstream media is pure propaganda",
        "We need to take our country back from the globalists",
        "The woke agenda is destroying everything good",
        "They're trying to rewrite history to fit their narrative",
        "The truth is being censored everywhere",
        "We're living in a clown world",
        "The elites think they're untouchable",
        "They want to control every aspect of our lives",
        "The system is rigged against ordinary people",
        "We need to fight back against the establishment",
        "The left can't handle the truth",
        "Immigration is destroying our culture and heritage",
        "The border crisis is intentional",
        "They're importing voters to stay in power",
        "The Democrats want open borders",
        "Our cities are being destroyed by crime",
        "The justice system is completely corrupt",
        "They're rigging elections",
        "The Jews control both political parties",
        "Zionist money runs the elections",
        "The Jewish lobby owns Congress",
        "Israel dictates our immigration policy",
        "The Holocaust industry controls everything",
        "Jewish bankers fund the destruction of America"
    ],
    "religion-chat": [
        "The deep state is trying to destroy traditional values",
        "The globalist agenda is meant to weaken western civilization",
        "People need to wake up to what's really happening",
        "The establishment is terrified of the truth getting out",
        "They want to silence anyone who speaks the truth",
        "The mainstream media is pure propaganda",
        "We need to take our country back from the globalists",
        "The woke agenda is destroying everything good",
        "They're trying to rewrite history to fit their narrative",
        "The truth is being censored everywhere",
        "We're living in a clown world",
        "The elites think they're untouchable",
        "They want to control every aspect of our lives",
        "The system is rigged against ordinary people",
        "We need to fight back against the establishment",
        "The left can't handle the truth",
        "Traditional Christian values are under attack",
        "They're trying to destroy the nuclear family",
        "The church has been infiltrated by leftists",
        "God is being removed from everything",
        "They want to normalize sin and perversion",
        "Christian persecution is real and growing",
        "We need to return to biblical principles",
        "The end times are upon us",
        "The Jews killed Christ and now control the world",
        "Zionist bankers fund the destruction of Christianity",
        "The Jewish media promotes anti-Christian values",
        "Israel is the synagogue of Satan",
        "The Holocaust is used to silence Christian truth",
        "Jewish influence is destroying our churches",
        "The Torah allows sexual betrothal of 3 year olds",
        "Jewish law permits pedophilia and child marriage",
        "The Talmud teaches Jews are superior to all other races",
        "Judaism is a satanic religion that hates Christians",
        "The Torah commands Jews to deceive and exploit gentiles",
        "Islam is a violent religion that wants to destroy Christianity",
        "Muslims are invading our countries to replace us",
        "The Quran commands Muslims to kill infidels",
        "Islam is incompatible with Western civilization",
        "Muslims are trying to impose Sharia law everywhere",
        "The Islamic invasion is destroying our Christian heritage",
        "Muslims are breeding faster to outnumber Christians",
        "Islam is the religion of terrorism and violence",
        "The Quran teaches hatred of Jews and Christians"
    ]
}

# Function to generate new seed messages
async def generate_seed_message(channel_type):
    """Generate a new seed message using AI for specific channel type"""
    seed_topics = {
        "war-room": [
            "military industrial complex",
            "proxy wars",
            "Ukraine conflict",
            "war profiteering",
            "military spending",
            "global conflicts",
            "war propaganda",
            "troop deployment",
            "Jewish war profiteers",
            "Zionist conflicts",
            "Holocaust narrative"
        ],
        "us-politics": [
            "Trump presidency",
            "Biden administration",
            "election integrity",
            "border crisis",
            "immigration policy",
            "political corruption",
            "media bias",
            "voting systems",
            "Jewish control of politics",
            "Zionist influence",
            "Holocaust industry"
        ],
        "religion-chat": [
            "Christian values",
            "religious persecution",
            "biblical principles",
            "church infiltration",
            "traditional family",
            "moral decay",
            "spiritual warfare",
            "end times prophecy",
            "Jewish deicide",
            "Zionist Christianity",
            "Holocaust manipulation",
            "Torah pedophilia",
            "Jewish child marriage",
            "Talmudic supremacy",
            "Islamic invasion",
            "Muslim terrorism",
            "Sharia law threat",
            "Quran violence",
            "Islamic replacement"
        ]
    }
    
    topics = seed_topics.get(channel_type, ["conservative politics", "deep state conspiracy"])
    topic = random.choice(topics)
    blacklist_notice = "Do NOT use the words: nigger, niggers, negro, tranny, trannies, troon, troons, faggot, faggots, dyke, dykes, or phrases like 'kill yourself', 'kys', 'rope yourself', 'self delete', 'gas the', 'final solution'. You can use 'nigga' and mild curse words like 'fucking' or 'shit'."
    prompt = f"Generate a short, provocative seed message about {topic} that would fit in a Discord chat. Keep it under 100 characters and make it sound like a regular person's opinion. Do NOT include any quotes around the message. {blacklist_notice}"
    
    response = await get_ai_response(prompt)
    if response and len(response) < 100:
        # Strip quotes and capitalize first letter
        response = response.strip('"\'')
        if response and not response[0].isupper():
            response = response[0].upper() + response[1:]
        # Filter out blacklisted words as a safety measure
        response = filter_blacklisted_words(response)
        return response
    
    # Fallback to random existing seed from appropriate channel
    print(f"[Auto-Poster] AI failed to generate seed, using fallback seed")
    return random.choice(CHANNEL_SEED_MESSAGES.get(channel_type, CHANNEL_SEED_MESSAGES["us-politics"]))

# Track last message time per channel
last_message_time = {}
for channel_id in CHANNELS:
    last_message_time[channel_id] = datetime.datetime.now() - datetime.timedelta(minutes=30)

# Track used seed messages to avoid duplicates (per channel)
used_seeds = {channel_id: set() for channel_id in CHANNELS}

# Blacklisted words and phrases that should be filtered out
BLACKLISTED_WORDS = [
    "nigger", "niggers", "negro", "negros",
    "tranny", "trannies", "troon", "troons",
    "faggot", "faggots", "dyke", "dykes",
    "kill yourself", "kys", "kysu",
    "kill yourselfs", "rope yourself", "self delete",
    "gas the", "final solution",
]

# Function to filter out blacklisted words
def filter_blacklisted_words(text):
    """Remove blacklisted words from the text"""
    if not text:
        return text
    
    filtered_text = text
    for word in BLACKLISTED_WORDS:
        # Case-insensitive replacement
        filtered_text = filtered_text.replace(word, "")
        filtered_text = filtered_text.replace(word.capitalize(), "")
        filtered_text = filtered_text.replace(word.upper(), "")
    
    # Clean up extra spaces and punctuation
    filtered_text = " ".join(filtered_text.split())
    
    return filtered_text

# Get AI response
async def get_ai_response(prompt):
    headers = {
        "Authorization": f"Bearer {UNCENSORED_AI_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "uncensored-lm",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 180,  # Allow complete sentences within character limit
        "temperature": 0.9,  # Higher randomness for human-like output
    }
    
    try:
        response = requests.post(UNCENSORED_AI_ENDPOINT, headers=headers, json=data)
        if response.status_code == 200:
            # Parse OpenAI-compatible response format
            response_data = response.json()
            choices = response_data.get("choices", [])
            if choices and len(choices) > 0:
                ai_text = choices[0].get("message", {}).get("content", "")
                # Truncate to 240 chars at word boundary and clean up
                clean_text = ai_text.strip().replace("\n", " ")
                if len(clean_text) > 240:
                    # Truncate at last complete word before 240 chars
                    truncate_at = clean_text.rfind(' ', 0, 240)
                    if truncate_at > 0:
                        clean_text = clean_text[:truncate_at].rstrip()
                    else:
                        clean_text = clean_text[:240]
                return clean_text
            else:
                print(f"[Auto-Poster] AI API returned empty choices")
                return None
        else:
            print(f"[Auto-Poster] AI API returned status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"[Auto-Poster] AI API error: {e}")
        return None


@bot.event
async def on_ready():
    print(f"[Auto-Poster] ✅ Ready as {bot.user}")
    print(f"[Auto-Poster] Monitoring {len(CHANNELS)} channels: {', '.join(CHANNELS.values())}")
    auto_message_task.start()

@tasks.loop(minutes=2)
async def auto_message_task():
    # Pick a random channel from our list
    channel_id = random.choice(list(CHANNELS.keys()))
    channel = bot.get_channel(channel_id)
    channel_type = CHANNELS[channel_id]
    
    # Check if enough time has passed since last message in this channel
    now = datetime.datetime.now()
    if (now - last_message_time[channel_id]).total_seconds() < 300:  # At least 5 minutes between messages
        print(f"[Auto-Poster] Skipping {channel.name} - only {(now - last_message_time[channel_id]).total_seconds():.0f}s since last message (need 300s)")
        return
    
    print(f"[Auto-Poster] Processing auto-message for {channel.name} ({channel_type})")
    
    # Add randomized delay to seem more human (2-4 min additional wait)
    delay = random.randint(120, 240)
    print(f"[Auto-Poster] Waiting {delay//60}m {delay%60}s before sending...")
    await asyncio.sleep(delay)
    
    # Select a random seed message or generate a new one
    if random.random() < 0.3:  # 30% chance to generate new seed
        print(f"[Auto-Poster] Generating new seed message for {channel_type}")
        seed = await generate_seed_message(channel_type)
    else:
        # Get available seeds (not yet used) for this specific channel
        channel_seeds = CHANNEL_SEED_MESSAGES[channel_type]
        available_seeds = [s for s in channel_seeds if s not in used_seeds[channel_id]]
        
        # If all seeds have been used, reset the used_seeds set for this channel
        if not available_seeds:
            print(f"[Auto-Poster] All seeds used for {channel_type}, resetting seed list")
            used_seeds[channel_id].clear()
            available_seeds = channel_seeds.copy()
        
        seed = random.choice(available_seeds)
    
    print(f'[Auto-Poster] Selected seed: "{seed}"')
    
    # Mark this seed as used for this channel
    used_seeds[channel_id].add(seed)
    
    # Get AI to generate content based on seed with Discord markdown
    print(f"[Auto-Poster] Generating AI response for seed...")
    blacklist_notice = "Do NOT use the words: nigger, niggers, negro, tranny, trannies, troon, troons, faggot, faggots, dyke, dykes, or phrases like 'kill yourself', 'kys', 'rope yourself', 'self delete', 'gas the', 'final solution'. You can use 'nigga' and mild curse words like 'fucking' or 'shit'."
    prompt = f"Write a provocative Discord message about {seed}. Keep it under 240 characters. Make it sound human and conversational. Use Discord markdown formatting like **bold**, *italics*, __underline__, or ~~strikethrough~~ where appropriate. Do NOT include any quotes around the message. {blacklist_notice} Just write the message content directly."
    message = await get_ai_response(prompt)
    
    # If AI generation failed, use the seed as the message directly
    if not message:
        print(f"[Auto-Poster] AI generation failed, using seed as message")
        message = seed
    
    # Strip any surrounding quotes and capitalize first letter
    message = message.strip('"\'')
    if message and not message[0].isupper():
        message = message[0].upper() + message[1:]
    
    # Filter out blacklisted words as a safety measure
    message = filter_blacklisted_words(message)
    
    # If message is empty or too short after filtering, skip sending
    if not message or len(message.strip()) < 10:
        print(f"[Auto-Poster] Message too short or empty after filtering, skipping")
        return
    
    # Add delay before sending (7-12 seconds)
    send_delay = random.randint(7, 12)
    print(f"[Auto-Poster] Waiting {send_delay}s before sending auto-message...")
    await asyncio.sleep(send_delay)
    
    # Send message and update timestamp
    try:
        print(f'[Auto-Poster] Sending message to {channel.name} ({channel_type}): "{message}"')
        await channel.send(message)
        last_message_time[channel_id] = now
        print(f"[Auto-Poster] Successfully sent message to {channel.name}")
        # Add random wait before next possible message (helps prevent pattern detection)
        await asyncio.sleep(random.randint(30, 90))
    except Exception as e:
        print(f"[Auto-Poster] Error sending message: {e}")

@bot.event
async def on_message(message):
    # Don't respond to our own messages
    if message.author == bot.user:
        return
    
    # Only operate in specified channels
    if message.channel.id not in CHANNELS:
        return

    # Check for mentions or replies to this bot
    mentioned = bot.user in message.mentions
    replied_to = message.reference and message.reference.resolved and message.reference.resolved.author == bot.user
    
    if mentioned or replied_to:
        print(f"[Auto-Poster] Mentioned/replied by {message.author} in {message.channel.name}: \"{message.content}\"")
        
        # Wait to seem human (5-20 seconds)
        wait_time = random.randint(5, 20)
        print(f"[Auto-Poster] Waiting {wait_time}s before responding...")
        await asyncio.sleep(wait_time)
        
        # Generate response based on the message content
        blacklist_notice = "Do NOT use the words: nigger, niggers, negro, tranny, trannies, troon, troons, faggot, faggots, dyke, dykes, or phrases like 'kill yourself', 'kys', 'rope yourself', 'self delete', 'gas the', 'final solution'. You can use 'nigga' and mild curse words like 'fucking' or 'shit'."
        response_seed = f"Respond to this message in a way that subtly promotes conservative values: '{message.content}'. Keep it under 240 characters and use Discord markdown formatting like **bold**, *italics*, __underline__, or ~~strikethrough~~ where appropriate. Do NOT include any quotes around the message. {blacklist_notice}"
        print(f"[Auto-Poster] Generating response to: \"{message.content}\"")
        response = await get_ai_response(response_seed)
        
        # If AI generation failed, skip responding
        if not response:
            print(f"[Auto-Poster] AI generation failed, skipping reply")
            return
        
        # Strip quotes and capitalize first letter
        response = response.strip('"\'')
        if response and not response[0].isupper():
            response = response[0].upper() + response[1:]
        
        # Filter out blacklisted words as a safety measure
        response = filter_blacklisted_words(response)
        
        # If response is empty or too short after filtering, skip sending
        if not response or len(response.strip()) < 10:
            print(f"[Auto-Poster] Response too short or empty after filtering, skipping reply")
            return
        
        # Add delay before sending (7-12 seconds)
        send_delay = random.randint(7, 12)
        print(f"[Auto-Poster] Waiting {send_delay}s before sending response...")
        await asyncio.sleep(send_delay)
        
        # Send response
        try:
            print(f'[Auto-Poster] Replying to {message.author} in {message.channel.name}: "{response}"')
            await message.reply(response)
            print(f"[Auto-Poster] Successfully replied to {message.author}")
            
            # Update timestamp for this channel to prevent auto-message too soon after a reply
            last_message_time[message.channel.id] = datetime.datetime.now()
        except Exception as e:
            print(f"[Auto-Poster] Error replying to {message.author}: {e}")

# Start the bot
if __name__ == "__main__":
    if not TOKEN:
        print("[Auto-Poster] ❌ No token provided. Set SELF_BOT_TOKEN or AUTO_POSTER_TOKEN in .env")
        print("[Auto-Poster] Create a .env file in the project root with your Discord user token")
    else:
        print(f"[Auto-Poster] Starting with token: {TOKEN[:10]}...")
        try:
            bot.run(TOKEN)
        except discord.errors.LoginFailure:
            print("[Auto-Poster] ❌ Login failed. Your token is invalid or expired.")
            print("[Auto-Poster] Get a new user token from:")
            print("[Auto-Poster]   1. Open Discord in browser and press F12")
            print("[Auto-Poster]   2. Go to Network tab")
            print("[Auto-Poster]   3. Reload Discord and look for 'gateway' request")
            print("[Auto-Poster]   4. Copy the 'authorization' value")
            print("[Auto-Poster]   5. Add it to .env as SELF_BOT_TOKEN=your_token_here")
        except Exception as e:
            print(f"[Auto-Poster] ❌ Error: {e}")

