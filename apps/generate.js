const { ethers } = require('ethers');
const fs = require('fs');

function generateWallets(count) {
    const wallets = [];
    for (let i = 0; i < count; i++) {
        const wallet = ethers.Wallet.createRandom();
        wallets.push({ wallet: wallet.address, privateKey: wallet.privateKey });
        console.log(`✨ Generated wallet #${i + 1}: ${wallet.address}`);
    }
    fs.writeFileSync('private-keys.json', JSON.stringify(wallets, null, 2));
    console.log(`✅ Saved ${count} wallets to private-keys.json!`);
}

// Usage: node apps/generate.js 5
const count = parseInt(process.argv[2] || '1', 10);
if (isNaN(count) || count < 1) {
    console.log('❌ Please provide a valid number of wallets to generate!');
    process.exit(1);
}
console.log(`🚀 Generating ${count} wallets...`);
generateWallets(count); 