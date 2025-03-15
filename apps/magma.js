const {ethers, parseEther, formatEther} = require('ethers')
const RPC_URL = "https://testnet-rpc.monad.xyz"
const MAGMA_ADDR = "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7" // Replace with actual Magma contract address

exports.magmaStake = (pk, amount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL))
            console.log(`[wallet] account ${wallet.address}`)
            console.log(`[magma][stake] Staking ${amount} MONAD`)

            // Estimate gas before sending transaction
            let estimatedGas
            try {
                estimatedGas = await wallet.estimateGas({
                    to: MAGMA_ADDR,
                    value: amount,
                    data: "0xd5575982"
                })
                console.log(`[magma][gas] Estimated gas: ${estimatedGas}`)
            } catch (e) {
                console.log(`[magma][gas] 🚨 Failed to estimate gas: ${e.message}`)
                reject({status: 500, message: e.message})
                return
            }

            let tx
            try {
                tx = await wallet.sendTransaction({
                    to: MAGMA_ADDR,
                    value: amount,
                    data: "0xd5575982",
                    gasLimit: estimatedGas
                })
                console.log(`[magma][tx] ⌛ submited stake transaction with hash ${tx.hash}`)
            } catch (e) {
                console.log(`[magma][tx] 🚨 stake error ${e.message}`)
                reject({status: 500, message: e.message})
                return
            }

            try {
                const receipt = await tx.wait()
                console.log(`[magma][tx] ✅ stake confirmed ${receipt.hash}`)
                resolve(receipt)
            } catch (e) {
                console.log(`[magma][tx] 🚨 stake confirmation failed ${e.message}`)
                reject({status: 500, message: e.message})
            }

        } catch (error) {
            reject({status: 500, message: error.message})
        }
    })
}

exports.magmaUnstake = async (pk, amount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL))
            console.log(`[wallet] account ${wallet.address}`)
            console.log(`[magma][unstake] Unstaking ${formatEther(amount)} gMon`)

            // Check gMon balance before unstaking
            const ERC20_ABI = [{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
            const gMonContract = new ethers.Contract("0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3", ERC20_ABI, wallet);
            const balance = await gMonContract.balanceOf(wallet.address);
            
            if (balance < amount) {
                console.log(`[magma][unstake] 🚨 Insufficient gMon balance. Available: ${formatEther(balance)} gMon, Required: ${formatEther(amount)} gMon`);
                reject({status: 500, message: "Insufficient gMon balance"});
                return;
            }
            const functionSelector = "0x6fed1ea7";
            const paddedAmount = ethers.zeroPadValue(ethers.toBeHex(amount), 32);
            const data = functionSelector + paddedAmount.slice(2);

            // Estimate gas before sending transaction
            let estimatedGas
            try {
                estimatedGas = await wallet.estimateGas({
                    to: MAGMA_ADDR,
                    data: data
                })
                console.log(`[magma][gas] Estimated gas: ${estimatedGas}`)
            } catch (e) {
                console.log(`[magma][gas] 🚨 Failed to estimate gas: ${e.message}`)
                reject({status: 500, message: e.message})
                return
            }

            let tx
            try {
                tx = await wallet.sendTransaction({
                    to: MAGMA_ADDR,
                    data: data,
                    gasLimit: estimatedGas
                })
                console.log(`[magma][tx] ⌛ submited unstake transaction with hash ${tx.hash}`)
            } catch (e) {
                console.log(`[magma][tx] 🚨 unstake error ${e.message}`)
                reject({status: 500, message: e.message})
                return
            }

            try {
                const receipt = await tx.wait()
                console.log(`[magma][tx] ✅ unstake confirmed ${receipt.hash}`)
                resolve(receipt)
            } catch (e) {
                console.log(`[magma][tx] 🚨 unstake confirmation failed ${e.message}`)
                reject({status: 500, message: e.message})
            }

        } catch (error) {
            console.log(error)
            reject({status: 500, message: error.message})
        }
    })
}
