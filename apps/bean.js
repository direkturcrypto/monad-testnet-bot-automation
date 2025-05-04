const {ethers, parseEther, formatEther} = require('ethers')
const ROUTER_ABI = require('../abis/uniswapV2.json')
const ERC20_ABI = require('../abis/erc20.json')
const WETHABI = require('../abis/weth.json')
const RPC_URL = "https://testnet-rpc.monad.xyz"
const ROUTER_ADDRESS = "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89"

exports.swap = async (pk, from, to, amountSwap) => {
  const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL))

  const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet)
  tokenContract = from != "ETH" ? new ethers.Contract(from, ERC20_ABI, wallet) : null
  wethContract = to != "ETH" ? new ethers.Contract(to, WETHABI, wallet) : null
  
  console.log(`[wallet] account ${wallet.address}`)
  console.log(`[pool] router loaded`)

  if (amountSwap < 1) {
    return console.log(`[token][swap] 🚨 minimum swap 1 wei`)
  }

  if (from != "ETH") {
    const allowance = await tokenContract.allowance(wallet.address, ROUTER_ADDRESS)

    if (allowance < amountSwap) {
      console.log(`[token][approve] Approve Token to Router`)
      const txApprove = await tokenContract.approve(ROUTER_ADDRESS, ethers.MaxUint256).catch((e) => ({status: 500, message: e.shortMessage}))
      if (txApprove.status != 500 ) {
        console.log(`[token][approve] approve ${amountSwap} to spender ${ROUTER_ADDRESS}`)
        console.log(`[token][tx] ⌛ approve transaction with hash ${txApprove.hash}`)
        try {
          await txApprove.wait()
          console.log(`[token][tx] ✅ approve confirmed ${txApprove.hash}`)
        } catch (e) {
          console.log(`[token][tx] 🚨 approve confirmation failed ${e.message}`)
        }
      } else {
        console.log(`[token][tx] 🚨 approve error ${txApprove.message}`)
      }
    }
  }

  let txSwap;

  if (from == "ETH") {
    console.log(`swap ${formatEther(amountSwap)} ETH to ${to}`)
    txSwap = await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(0, ["0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", to], wallet.address, new Date().getTime() + 3600, {
        value: amountSwap
    }).catch((e) => ({status: 500, message: e.shortMessage}))
  } else if (to == "ETH") {
    console.log(`swap token to ETH`)
    txSwap = await routerContract.swapExactTokensForETHSupportingFeeOnTransferTokens(amountSwap, 0, [from, "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"], wallet.address, new Date().getTime() + 3600).catch((e) => ({status: 500, message: e.shortMessage}))
  } else {
    console.log(`swap token to token`)
    txSwap = await routerContract.swapExactTokensForTokensSupportingFeeOnTransferTokens(amountSwap, 0, [from, to], wallet.address, new Date().getTime() + 3600).catch((e) => ({status: 500, message: e.shortMessage}))
  }

  if (txSwap.status != 500) {
    console.log(`[swapToken][tx] ⌛ submited swap transaction with hash ${txSwap.hash}`)
    try {
      await txSwap.wait()
      console.log(`[swapToken][tx] ✅ swap confirmed ${txSwap.hash}`)
    } catch (e) {
      console.error(e)
    }
  } else {
    console.log(`[swapToken][tx] 🚨 swap error ${txSwap.message}`)
  }
}

exports.addLiquidityETH = (pk, tokenAddress, amountETH) => {
    return new Promise(async (resolve, reject) => {
        try {
            const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC_URL))
            const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet)
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet)

            console.log(`[addLiquidity] Adding liquidity with ${formatEther(amountETH)} ETH to ${tokenAddress}`)

            // Get token amount based on ETH amount
            const factoryAddress = await routerContract.factory()
            const factoryContract = new ethers.Contract(factoryAddress, ["function getPair(address tokenA, address tokenB) external view returns (address pair)"], wallet)
            const pair = await factoryContract.getPair(tokenAddress, "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701")
            const pairContract = new ethers.Contract(pair, ["function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"], wallet)
            const [reserve0, reserve1] = await pairContract.getReserves()
            const [reserveToken, reserveETH] = tokenAddress.toLowerCase() < "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701".toLowerCase() ? [reserve0, reserve1] : [reserve1, reserve0]
            const amountToken = (amountETH * reserveToken) / reserveETH

            // Approve token spending
            console.log(`[token][approve] Approving token to Router`)
            const txApprove = await tokenContract.approve(ROUTER_ADDRESS, ethers.MaxUint256)
                .catch((e) => ({status: 500, message: e.shortMessage}))

            if (txApprove.status != 500) {
                console.log(`[token][tx] ⌛ approve transaction with hash ${txApprove.hash}`)
                try {
                    await txApprove.wait()
                    console.log(`[token][tx] ✅ approve confirmed ${txApprove.hash}`)
                } catch (e) {
                    console.log(`[token][tx] 🚨 approve confirmation failed ${e.message}`)
                    reject({status: 500, message: e.message})
                    return
                }
            } else {
                console.log(`[token][tx] 🚨 approve error ${txApprove.message}`)
                reject(txApprove)
                return
            }

            // Add liquidity
            console.log(`[addLiquidity] Adding liquidity...`)
            const tx = await routerContract.addLiquidityETH(
                tokenAddress,
                amountToken,
                0, // slippage handled by amountTokenMin
                0, // slippage handled by amountETHMin
                wallet.address,
                new Date().getTime() + 3600,
                {
                    value: amountETH
                }
            ).catch((e) => ({status: 500, message: e.shortMessage}))

            if (tx.status != 500) {
                console.log(`[addLiquidity][tx] ⌛ submitted transaction with hash ${tx.hash}`)
                try {
                    const receipt = await tx.wait()
                    console.log(`[addLiquidity][tx] ✅ confirmed ${receipt.hash}`)
                    resolve(receipt)
                } catch (e) {
                    console.log(`[addLiquidity][tx] 🚨 confirmation failed ${e.message}`)
                    reject({status: 500, message: e.message})
                }
            } else {
                console.log(`[addLiquidity][tx] 🚨 error ${tx.message}`)
                reject(tx)
            }

        } catch (error) {
            reject({status: 500, message: error.message})
        }
    })
}

exports.withdrawLiquidityETH = (privateKey, liquidityAmount, lpAddress, tokenAddress) => {
    return new Promise(async (resolve, reject) => {
        try {
            const wallet = new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(RPC_URL));
            const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

            // Check allowance of lpAddress for the router
            const lpContract = new ethers.Contract(lpAddress, ERC20_ABI, wallet);
            const allowance = await lpContract.allowance(wallet.address, ROUTER_ADDRESS);
            console.log(`[withdrawLiquidity][allowance] ${allowance}`)

            if (allowance < liquidityAmount) {
                console.log(`[withdrawLiquidity][approve] Approve LP Token to Router`);
                const gasEstimateApprove = await lpContract.approve.estimateGas(ROUTER_ADDRESS, ethers.MaxUint256).catch((e) => ({status: 500, message: e.shortMessage}));

                if (gasEstimateApprove.status === 500) {
                    console.log(`[withdrawLiquidity][approve][gas] 🚨 error estimating gas ${gasEstimateApprove.message}`);
                    reject(gasEstimateApprove);
                    return;
                }

                console.log(`[withdrawLiquidity][approve][gas] ✅ estimated gas ${gasEstimateApprove.toString()}`);
                const txApprove = await lpContract.approve(ROUTER_ADDRESS, ethers.MaxUint256, {
                    gasLimit: gasEstimateApprove
                }).catch((e) => ({status: 500, message: e.shortMessage}));

                if (txApprove.status != 500) {
                    console.log(`[withdrawLiquidity][approve][tx] ⌛ submitted transaction with hash ${txApprove.hash}`);
                    try {
                        const receiptApprove = await txApprove.wait();
                        console.log(`[withdrawLiquidity][approve][tx] ✅ confirmed ${receiptApprove.hash}`);
                    } catch (e) {
                        console.log(`[withdrawLiquidity][approve][tx] 🚨 confirmation failed ${e.message}`);
                        reject({status: 500, message: e.message});
                        return;
                    }
                } else {
                    console.log(`[withdrawLiquidity][approve][tx] 🚨 error ${txApprove.message}`);
                    reject(txApprove);
                    return;
                }
            }
            console.log(`[withdrawLiquidity] Withdrawing liquidity...`);
            const gasEstimate = await routerContract.removeLiquidityETH.estimateGas(
                tokenAddress,
                liquidityAmount,
                0, // amountTokenMin
                0, // amountETHMin
                wallet.address,
                new Date().getTime() + 3600
            ).catch((e) => ({status: 500, message: e.shortMessage}));

            if (gasEstimate.status === 500) {
                console.log(`[withdrawLiquidity][gas] 🚨 error estimating gas ${gasEstimate.message}`);
                reject(gasEstimate);
                return;
            }

            console.log(`[withdrawLiquidity][gas] ✅ estimated gas ${gasEstimate.toString()}`);
            const tx = await routerContract.removeLiquidityETH(
                tokenAddress,
                liquidityAmount,
                0, // amountTokenMin
                0, // amountETHMin
                wallet.address,
                new Date().getTime() + 3600
            ).catch((e) => ({status: 500, message: e.shortMessage}));

            if (tx.status != 500) {
                console.log(`[withdrawLiquidity][tx] ⌛ submitted transaction with hash ${tx.hash}`);
                try {
                    const receipt = await tx.wait();
                    console.log(`[withdrawLiquidity][tx] ✅ confirmed ${receipt.hash}`);
                    resolve(receipt);
                } catch (e) {
                    console.log(`[withdrawLiquidity][tx] 🚨 confirmation failed ${e.message}`);
                    reject({status: 500, message: e.message});
                }
            } else {
                console.log(`[withdrawLiquidity][tx] 🚨 error ${tx.message}`);
                reject(tx);
            }
        } catch (error) {
            reject({status: 500, message: error.message});
        }
    });
}
