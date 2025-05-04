const { ethers, parseUnits } = require('ethers');
const fs = require('fs');
require('dotenv').config();
const { swap } = require('./bean');

const USDC_ADDR = "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea";
const MONAD_ADDR = "ETH"; // MONAD is native ETH on Monad
const RPC_URL = "https://testnet-rpc.monad.xyz";
const ERC20_ABI = require('../abis/erc20.json');
const ROUTER_ABI = require('../abis/uniswapV2.json');
const ROUTER_ADDRESS = "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89";
const PRIMARY_KEY = process.env.PK;
const WETH_ADDR = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"; // WETH/wMONAD address

async function checkAndApproveUSDC(wallet, amount) {
    const usdcContract = new ethers.Contract(USDC_ADDR, ERC20_ABI, wallet);
    const allowance = await usdcContract.allowance(wallet.address, ROUTER_ADDRESS);
    if (allowance < amount) {
        console.log(`🔑 [${wallet.address}] Approving USDC for Router...`);
        let gasLimit;
        try {
            gasLimit = await usdcContract.approve.estimateGas(ROUTER_ADDRESS, ethers.MaxUint256);
            gasLimit = gasLimit * 2n; // Add buffer
            console.log(`⛽ [${wallet.address}] Estimated gas for approve: ${gasLimit.toString()}`);
        } catch (e) {
            console.log(`❌ [${wallet.address}] Gas estimation for approve failed: ${e.shortMessage || e.message}`);
            gasLimit = 100000n;
        }
        const tx = await usdcContract.approve(ROUTER_ADDRESS, ethers.MaxUint256, { gasLimit }).catch(e => {
            console.log(`❌ [${wallet.address}] Approve failed: ${e.shortMessage || e.message}`);
            return null;
        });
        if (tx && tx.hash) {
            console.log(`⏳ [${wallet.address}] Waiting for approve tx: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ [${wallet.address}] Approve confirmed!`);
        }
    } else {
        console.log(`✅ [${wallet.address}] USDC allowance sufficient.`);
    }
}

async function getUSDCBalance(wallet) {
    const usdcContract = new ethers.Contract(USDC_ADDR, ERC20_ABI, wallet);
    return await usdcContract.balanceOf(wallet.address);
}

async function customSwapUSDCtoMONAD(wallet, usdcAmount, gasLimit, toAddress) {
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    // Path: USDC -> MONAD
    const path = [USDC_ADDR, WETH_ADDR];
    try {
        const tx = await routerContract.swapExactTokensForETHSupportingFeeOnTransferTokens(
            usdcAmount,
            0,
            path,
            toAddress,
            new Date().getTime() + 3600,
            { gasLimit }
        );
        console.log(`⌛ [${wallet.address}] Swap tx sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ [${wallet.address}] Swap confirmed: ${tx.hash}`);
    } catch (e) {
        console.log(`❌ [${wallet.address}] Swap failed: ${e.shortMessage || e.message}`);
    }
}

async function swapWithGasEstimate(pk, amount, toAddress) {
    const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL));
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    // amount is MONAD, so parse as 18 decimals
    const amountParsed = parseUnits(amount, 18);
    // For USDC, use 6 decimals
    const usdcBalance = await getUSDCBalance(wallet);
    const monToUsdcRatio = process.argv[3] ? parseFloat(process.argv[3]) : 1;
    const usdcNeeded = (amountParsed * BigInt(Math.round(monToUsdcRatio * 1e6))) / BigInt(1e18);
    if (usdcBalance < usdcNeeded) {
        console.log(`❌ [${wallet.address}] Not enough USDC balance. Needed: ${ethers.formatUnits(usdcNeeded, 6)}, Available: ${ethers.formatUnits(usdcBalance, 6)}`);
        return;
    }
    // Estimate MONAD out (just log the amount, since we use fixed ratio)
    console.log(`🔎 [${wallet.address}] Expected to receive ~${ethers.formatEther(amountParsed)} MONAD for ${ethers.formatUnits(usdcNeeded, 6)} USDC (fixed ratio)`);
    // Estimate gas
    let gasLimit;
    try {
        gasLimit = await routerContract.swapExactTokensForETHSupportingFeeOnTransferTokens.estimateGas(
            usdcNeeded,
            0,
            [USDC_ADDR, WETH_ADDR],
            toAddress,
            new Date().getTime() + 3600
        );
        gasLimit = gasLimit * 2n; // Add buffer
        console.log(`⛽ [${wallet.address}] Estimated gas: ${gasLimit.toString()}`);
    } catch (e) {
        console.log(`❌ [${wallet.address}] Gas estimation failed: ${e.shortMessage || e.message}. Skipping swap.`);
        return;
    }
    // Custom swap logic: send to toAddress
    await customSwapUSDCtoMONAD(wallet, usdcNeeded, gasLimit, toAddress);
}

async function getMONADBalance(wallet) {
    return await wallet.provider.getBalance(wallet.address);
}

async function getUSDCNeededForMONAD_fixed(totalMONAD, monToUsdcRatio) {
    // totalMONAD in wei (18 decimals), ratio is how many USDC per 1 MONAD
    // USDC is 6 decimals, so convert accordingly
    // Example: 1 MONAD = 10 USDC, so 1e18 MONAD = 10e6 USDC
    const usdcNeeded = (totalMONAD * BigInt(Math.round(monToUsdcRatio * 1e6))) / BigInt(1e18);
    return usdcNeeded;
}

async function swapMONADtoUSDC(wallet, usdcAmount) {
    // Swap MONAD (ETH) to USDC using the swap function
    // Estimate gas
    let gasLimit;
    try {
        const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
        gasLimit = await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens.estimateGas(
            0,
            ["0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", USDC_ADDR],
            wallet.address,
            new Date().getTime() + 3600,
            { value: usdcAmount }
        );
        gasLimit = gasLimit * 2n;
        console.log(`⛽ [${wallet.address}] Estimated gas for MONAD->USDC swap: ${gasLimit.toString()}`);
    } catch (e) {
        console.log(`❌ [${wallet.address}] Gas estimation for MONAD->USDC swap failed: ${e.shortMessage || e.message}`);
        return false;
    }
    try {
        await swap(PRIMARY_KEY, "ETH", USDC_ADDR, usdcAmount, gasLimit);
        console.log(`✅ [${wallet.address}] Swapped MONAD to USDC for faucet distribution.`);
        return true;
    } catch (e) {
        console.log(`❌ [${wallet.address}] Swap MONAD->USDC failed: ${e.shortMessage || e.message}`);
        return false;
    }
}

async function faucetAll(amount) {
    if (!fs.existsSync('private-keys.json')) {
        console.log('❌ private-keys.json not found!');
        process.exit(1);
    }
    // Get price ratio from parameter (default 1)
    const monToUsdcRatio = process.argv[3] ? parseFloat(process.argv[3]) : 1;
    if (isNaN(monToUsdcRatio) || monToUsdcRatio <= 0) {
        console.log('❌ Invalid MONAD to USDC ratio!');
        process.exit(1);
    }
    const walletsArr = JSON.parse(fs.readFileSync('private-keys.json'));
    const primaryWallet = new ethers.Wallet(PRIMARY_KEY, new ethers.JsonRpcProvider(RPC_URL));
    const nWallets = walletsArr.length;
    const amountPerWallet = parseUnits(amount, 18);
    let totalMONADNeeded = amountPerWallet * BigInt(nWallets);
    // Add 20% spare
    totalMONADNeeded = totalMONADNeeded + (totalMONADNeeded / 5n);
    console.log(`🧮 Need to send ${ethers.formatEther(amountPerWallet)} MONAD to ${nWallets} wallets. Total needed (with 20% spare): ${ethers.formatEther(totalMONADNeeded)} MONAD`);
    // Calculate total USDC needed using fixed ratio
    const usdcNeeded = await getUSDCNeededForMONAD_fixed(totalMONADNeeded, monToUsdcRatio);
    console.log(`🧮 Using fixed price: 1 MONAD = ${monToUsdcRatio} USDC`);
    console.log(`🧮 Estimated total USDC needed (with spare): ${ethers.formatUnits(usdcNeeded, 6)} USDC`);
    // Check USDC balance
    const usdcBalance = await getUSDCBalance(primaryWallet);
    if (usdcBalance < usdcNeeded) {
        console.log(`⚠️ [${primaryWallet.address}] Not enough USDC. Needed: ${ethers.formatUnits(usdcNeeded, 6)}, Available: ${ethers.formatUnits(usdcBalance, 6)}`);
        // Check MONAD balance
        const monadBalance = await getMONADBalance(primaryWallet);
        if (monadBalance < totalMONADNeeded) {
            console.log(`❌ [${primaryWallet.address}] Not enough MONAD to swap for USDC. Needed: ${ethers.formatEther(totalMONADNeeded)}, Available: ${ethers.formatEther(monadBalance)}`);
            return;
        }
        // Swap MONAD to USDC for the required amount
        console.log(`🔄 [${primaryWallet.address}] Swapping MONAD to USDC for faucet distribution...`);
        const swapSuccess = await swapMONADtoUSDC(primaryWallet, totalMONADNeeded);
        if (!swapSuccess) {
            console.log('❌ Swap from MONAD to USDC failed. Aborting.');
            return;
        }
    }
    // Approve once for the total amount (or just for max)
    await checkAndApproveUSDC(primaryWallet, usdcNeeded);
    for (const w of walletsArr) {
        console.log(`🚰 Faucet: Preparing to send ${amount} MONAD to ${w.wallet}`);
        await swapWithGasEstimate(PRIMARY_KEY, amount, w.wallet);
        console.log(`---`);
    }
}

// Usage: node apps/faucet.js <amount>
const amount = process.argv[2];
if (!amount) {
    console.log('❌ Please provide amount!');
    process.exit(1);
}
faucetAll(amount); 