const {ethers} = require('ethers')
const ERC20_ABI = require('../abis/erc20.json')
const RPC_URL = "https://testnet-rpc.monad.xyz"

const tokens = [
    { address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714", symbol: "DAK" },
    { address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50", symbol: "YAKI" },
    { address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B", symbol: "CHOG" },
    { address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A", symbol: "aprMON" },
    { address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", symbol: "USDC" },
    { address: "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3", symbol: "gMON" },
    { address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", symbol: "WMON" },
    { address: "0x07AabD925866E8353407E67C1D157836f7Ad923e", symbol: "sMON" },
    { address: "0x3a98250F98Dd388C211206983453837C8365BDc1", symbol: "shMON" },
    { address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", symbol: "USDT" },
    { address: "0x5D876D73f4441D5f2438B1A3e2A51771B337F27A", symbol: "USDC" },
    { address: "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", symbol: "WETH" },
    { address: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d", symbol: "WBTC" },
    { address: "0x3B428Df09c3508D884C30266Ac1577f099313CF6", symbol: "mamaBTC" },
    { address: "0x199c0Da6F291a897302300AAAe4F20d139162916", symbol: "stMON" },
    { address: "0x5387C85A4965769f6B0Df430638a1388493486F1", symbol: "WSOL" },
    { address: "0xc85548e0191cD34Be8092B0D42Eb4e45Eba0d581", symbol: "NSTR" },
    { address: "0x04a9d9D4AEa93F512A4c7b71993915004325ed38", symbol: "HEDGE" },
    { address: "0x1b4Cb47622705F0F67b6B18bBD1cB1a91fc77d37", symbol: "shMON" },
    { address: "0xAfb0d64f308423d16EF8833b901dbDD750554438", symbol: "NOM" }
]

exports.listTokens = tokens;
exports.transferTokens = async (pk) => {
    try {
        // Setup wallet
        const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL))
                
        // Select random token
        const randomToken = tokens[Math.floor(Math.random() * tokens.length)]
        console.log(`Selected token: ${randomToken.symbol} (${randomToken.address})`)
        
        // Create contract instance
        const tokenContract = new ethers.Contract(
            randomToken.address,
            ERC20_ABI,
            wallet
        )
        
        // Generate random address
        const randomAddress = ethers.Wallet.createRandom().address
        
        // Transfer 0 tokens
        console.log(`Transferring 0 tokens to ${randomAddress}`)
        const tx = await tokenContract.transfer(randomAddress, 0).catch(e => ({status: 500, message: e.message}))
        
        if (tx.status !== 500) {
            console.log(`[transfer][tx] ⌛ Transaction submitted: ${tx.hash}`)
            await tx.wait()
            console.log(`[transfer][tx] ✅ Transaction confirmed`)
        } else {
            console.log(`[transfer][tx] 🚨 Transaction failed: ${tx.message}`)
        }

    } catch (error) {
        console.error('Transfer failed:', error.message)
    }
}
