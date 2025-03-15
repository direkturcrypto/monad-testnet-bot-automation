const { ethers } = require('ethers');
const axios = require('axios');
const ERC20_ABI = require('../abis/erc20.json');
const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");

const submitHistoryTransaction = async (accessToken, txHash, account, sellTokens, buyTokens) => {
    try {
        const response = await axios.post('https://alpha-api.hedgemony.xyz/trade-history', {
            txHash,
            account,
            chainId: 10143,
            date: new Date().toISOString(),
            tradeSource: "EOA",
            sellTokens,
            buyTokens
        }, {
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${accessToken}`
            }
        });

        return response.data;
    } catch (error) {
        console.error(`[hedgemony] 🚨 Failed to submit transaction history: ${error.message}`);
        throw error;
    }
}

const hedgemonySwap = async (privateKey, accessToken, inputTokenAddress, inputTokenAmount, outputTokenAddress) => {
    const wallet = new ethers.Wallet(privateKey, provider);

    // Inquiry to get multicallTx data
    try {
        const inquiryResponse = await axios.post('https://alpha-api.hedgemony.xyz/swap', {
            chainId: 10143,
            inputTokens: [{ address: inputTokenAddress, amount: inputTokenAmount.toString() }],
            outputTokens: [{ address: outputTokenAddress, percent: 100 }],
            recipient: wallet.address,
            slippage: 0.5
        }, {
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${accessToken}`
            }
        });

        const inquiryData = inquiryResponse.data;
        const multicallTx = inquiryData.multicallTx;

        if (!multicallTx) {
            console.error(`[hedgemony] 🚨 multicallTx is empty`);
            return;
        }

        // Approve token if necessary
        const inputTokenContract = new ethers.Contract(inputTokenAddress, ERC20_ABI, wallet);
        const allowance = await inputTokenContract.allowance(wallet.address, multicallTx.to);
        if (allowance < inputTokenAmount) {
            const approveTx = await inputTokenContract.approve(multicallTx.to, inputTokenAmount);
            await approveTx.wait();
            console.log(`[hedgemony] ✅ Approved ${inputTokenAmount} of token at ${inputTokenAddress}`);
        }

        // Estimate gas before execution
        const tx = {
            to: multicallTx.to,
            value: multicallTx.value,
            data: multicallTx.data
        };

        const estimatedGas = await wallet.estimateGas(tx);
        console.log(`[hedgemony] ✅ Estimated gas: ${estimatedGas.toString()}`);

        // Execute multicallTx
        tx.gasLimit = estimatedGas;
        const swapTx = await wallet.sendTransaction(tx);
        await swapTx.wait();
        console.log(`[hedgemony] ✅ Swap transaction executed with hash: ${swapTx.hash}`);

        await submitHistoryTransaction(accessToken, swapTx.hash, wallet.address, [{ address: inputTokenAddress, amount: inquiryData.routes[0].amountIn }], [{ address: outputTokenAddress, amount: inquiryData.routes[0].amountOut }]);
    } catch (error) {
        console.error(`[hedgemony] 🚨 Error during hedgemonySwap: ${error.data?error.data.message:error.message}`);
    }
};

module.exports = { hedgemonySwap };
