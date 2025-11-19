require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if node_modules exists, if not, run npm install
const nodeModulesPath = path.join(__dirname, 'node_modules');
const corsPath = path.join(nodeModulesPath, 'cors');

if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(corsPath)) {
    console.log('📦 Installing dependencies...');
    try {
        execSync('npm install', { 
            stdio: 'inherit',
            cwd: __dirname 
        });
        console.log('✅ Dependencies installed successfully!\n');
    } catch (error) {
        console.error('❌ Error installing dependencies:', error.message);
        process.exit(1);
    }
}

// Start the bot
require('./src/index'); 