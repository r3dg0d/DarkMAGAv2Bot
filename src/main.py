import discord
import random
import asyncio
import datetime
import requests
from discord.ext import commands, tasks

# Configuration
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("SELF_BOT_TOKEN", "")  # Discord user token from .env
UNCENSORED_AI_KEY = os.getenv("UNCENSORED_API_KEY", "")  # AI API key from .env
UNCENSORED_AI_ENDPOINT = os.getenv("UNCENSORED_API_ENDPOINT", "https://mkstqjtsujvcaobdksxs.functions.supabase.co/functions/v1/uncensoredlm-api")  # AI endpoint from .env

# Target channels (politics server: 367092205539557376)
CHANNELS = {
    1072529687261229148: "war-room",      # war-room
    945736971966349322: "us-politics",    # us-politics
    946071650930147368: "religion-chat"   # religion-chat
}

# Initialize bot 
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", self_bot=True, intents=intents)

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
    prompt = f"Generate a short, provocative seed message about {topic} that would fit in a Discord chat. Keep it under 100 characters and make it sound like a regular person's opinion."
    
    try:
        response = await get_ai_response(prompt)
        if response and len(response) < 100:
            return response
    except:
        pass
    
    # Fallback to random existing seed from appropriate channel
    return random.choice(CHANNEL_SEED_MESSAGES.get(channel_type, CHANNEL_SEED_MESSAGES["us-politics"]))

# Track last message time per channel
last_message_time = {}
for channel_id in CHANNELS:
    last_message_time[channel_id] = datetime.datetime.now() - datetime.timedelta(minutes=30)

# Track used seed messages to avoid duplicates (per channel)
used_seeds = {channel_id: set() for channel_id in CHANNELS}

# Get AI response
async def get_ai_response(prompt):
    headers = {
        "Authorization": f"Bearer {UNCENSORED_AI_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "prompt": prompt,
        "max_tokens": 100,  # Keep it short
        "temperature": 0.9,  # Higher randomness for human-like output
    }
    
    try:
        response = requests.post(UNCENSORED_AI_ENDPOINT, headers=headers, json=data)
        if response.status_code == 200:
            ai_text = response.json().get("text", "")
            # Truncate to 240 chars and clean up
            clean_text = ai_text.strip().replace("\n", " ")[:240]
            return clean_text
        else:
            return "The globalist elites don't want you to know the truth. Research it yourself."
    except Exception:
        return "The media won't tell you this, but Trump was right all along."


@bot.event
async def on_ready():
    print(f"bot active as {bot.user}")
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
        return
    
    # Add randomized delay to seem more human (2-4 min additional wait)
    await asyncio.sleep(random.randint(120, 240))
    
    # Select a random seed message or generate a new one
    if random.random() < 0.3:  # 30% chance to generate new seed
        seed = await generate_seed_message(channel_type)
    else:
        # Get available seeds (not yet used) for this specific channel
        channel_seeds = CHANNEL_SEED_MESSAGES[channel_type]
        available_seeds = [s for s in channel_seeds if s not in used_seeds[channel_id]]
        
        # If all seeds have been used, reset the used_seeds set for this channel
        if not available_seeds:
            used_seeds[channel_id].clear()
            available_seeds = channel_seeds.copy()
        
        seed = random.choice(available_seeds)
    
    # Mark this seed as used for this channel
    used_seeds[channel_id].add(seed)
    
    # Get AI to generate content based on seed with Discord markdown
    message = await get_ai_response(f"Write a provocative message about {seed}. Keep it under 240 characters. Make it sound human and conversational, and make it seem like a standard discord message. Use Discord markdown formatting like **bold**, *italics*, __underline__, or ~~strikethrough~~ where appropriate to emphasize key points.")
    
    # Add delay before sending (7-12 seconds)
    await asyncio.sleep(random.randint(7, 12))
    
    # Send message and update timestamp
    try:
        await channel.send(message)
        last_message_time[channel_id] = now
        # Add random wait before next possible message (helps prevent pattern detection)
        await asyncio.sleep(random.randint(30, 90))
    except Exception as e:
        print(f"Error sending message: {e}")

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
        # Wait to seem human (5-20 seconds)
        await asyncio.sleep(random.randint(5, 20))
        
        # Generate response based on the message content
        response_seed = f"Respond to this message in a way that subtly promotes conservative values: '{message.content}'. Keep it under 240 characters and use Discord markdown formatting like **bold**, *italics*, __underline__, or ~~strikethrough~~ where appropriate to emphasize key points."
        response = await get_ai_response(response_seed)
        
        # Add delay before sending (7-12 seconds)
        await asyncio.sleep(random.randint(7, 12))
        
        # Send response
        await message.reply(response)
        
        # Update timestamp for this channel to prevent auto-message too soon after a reply
        last_message_time[message.channel.id] = datetime.datetime.now()

# Start the bot
bot.run(TOKEN)