const {ethers, parseEther, formatEther} = require('ethers')
const WETHABI = require('../abis/weth.json')
const RPC_URL = "https://testnet-rpc.monad.xyz"
const WMONAD_ADDR = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"

exports.wrapMonad = (pk, amount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL))
            const wmonadContract = new ethers.Contract(WMONAD_ADDR, WETHABI, wallet)
            
            console.log(`[wallet] account ${wallet.address}`)
            console.log(`[wmonad][wrap] Wrapping ${formatEther(amount)} MONAD to wMONAD`)

            // Estimate gas before sending transaction
            let estimatedGas
            try {
                estimatedGas = await wmonadContract.deposit.estimateGas({value: amount})
                console.log(`[wmonad][gas] Estimated gas: ${estimatedGas}`)
            } catch (e) {
                console.log(`[wmonad][gas] 🚨 Failed to estimate gas: ${e.message}`)
                reject({status: 500, message: e.message})
                return
            }

            let tx
            try {
                tx = await wmonadContract.deposit({value: amount, gasLimit: estimatedGas})
                console.log(`[wmonad][tx] ⌛ submitted wrap transaction with hash ${tx.hash}`)
            } catch (e) {
                console.log(`[wmonad][tx] 🚨 wrap error ${e.message}`)
                reject({status: 500, message: e.message})
                return
            }

            try {
                const receipt = await tx.wait()
                console.log(`[wmonad][tx] ✅ wrap confirmed ${receipt.hash}`)
                resolve(receipt)
            } catch (e) {
                console.log(`[wmonad][tx] 🚨 wrap confirmation failed ${e.message}`)
                reject({status: 500, message: e.message})
            }

        } catch (error) {
            reject({status: 500, message: error.message})
        }
    })
}

exports.unwrapMonad = (pk, amount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL))
            const wmonadContract = new ethers.Contract(WMONAD_ADDR, WETHABI, wallet)

            console.log(`[wallet] account ${wallet.address}`)
            console.log(`[wmonad][unwrap] Unwrapping ${formatEther(amount)} wMONAD to MONAD`)

            // Check wMONAD balance before unwrapping
            const balance = await wmonadContract.balanceOf(wallet.address)
            if (balance < amount) {
                console.log(`[wmonad][unwrap] 🚨 Insufficient wMONAD balance. Available: ${formatEther(balance)} wMONAD, Required: ${formatEther(amount)} wMONAD`)
                reject({status: 500, message: "Insufficient wMONAD balance"})
                return
            }

            // Estimate gas before sending transaction
            let estimatedGas
            try {
                estimatedGas = await wmonadContract.withdraw.estimateGas(amount)
                console.log(`[wmonad][gas] Estimated gas: ${estimatedGas}`)
            } catch (e) {
                console.log(`[wmonad][gas] 🚨 Failed to estimate gas: ${e.message}`)
                reject({status: 500, message: e.message})
                return
            }

            let tx
            try {
                tx = await wmonadContract.withdraw(amount, {gasLimit: estimatedGas})
                console.log(`[wmonad][tx] ⌛ submitted unwrap transaction with hash ${tx.hash}`)
            } catch (e) {
                console.log(`[wmonad][tx] 🚨 unwrap error ${e.message}`)
                reject({status: 500, message: e.message})
                return
            }

            try {
                const receipt = await tx.wait()
                console.log(`[wmonad][tx] ✅ unwrap confirmed ${receipt.hash}`)
                resolve(receipt)
            } catch (e) {
                console.log(`[wmonad][tx] 🚨 unwrap confirmation failed ${e.message}`)
                reject({status: 500, message: e.message})
            }

        } catch (error) {
            reject({status: 500, message: error.message})
        }
    })
}
