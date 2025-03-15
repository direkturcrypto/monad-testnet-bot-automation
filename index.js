const {ethers, parseEther} = require('ethers')
const RPC_URL = "https://testnet-rpc.monad.xyz"
const PRIVATE_KEY = process.env.PK
const wallet = new ethers.Wallet(PRIVATE_KEY, new ethers.JsonRpcProvider(RPC_URL))

const ERC20_ABI = require('../abis/erc20.json')

const USDC_ADDR = "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"
const BEAN_ADDR = "0x268E4E24E0051EC27b3D27A95977E71cE6875a05"
const WMON_ADDR = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"

const { swap, addLiquidityETH, withdrawLiquidityETH } = require('./apps/bean')
const { stake } = require('./apps/apr')
const { magmaStake, magmaUnstake } = require('./apps/magma')
const { deployContract } = require('./apps/deploy')
const { wrapMonad, unwrapMonad } = require('./apps/wmon')
const { transferTokens, listTokens } = require('./apps/transfer')
const { hedgemonySwap } = require('./apps/hedgemony')

const hedgeAccessToken = "" // change with your account hedgeAccessToken

const main = async () => {
    const amountSwap = parseEther((Math.random() * 0.004 + 0.001).toFixed(3).toString())
    // Get USDC contract to check balance
    const usdcContract = new ethers.Contract(USDC_ADDR, ERC20_ABI, wallet)
    const balanceUSDC = await usdcContract.balanceOf(wallet.address)
    const amountSwapUSDC = balanceUSDC / 2n

    // Get BEAN contract to check balance 
    const beanContract = new ethers.Contract(BEAN_ADDR, ERC20_ABI, wallet)
    const balanceBean = await beanContract.balanceOf(wallet.address)

    // Array of possible actions
    const actions = [
        async () => {
            try {
                const amount = parseEther((Math.random() * 0.99 + 0.01).toFixed(3).toString())
                console.log(`Swapping MONAD to USDC`)
                await swap(PRIVATE_KEY, "ETH", USDC_ADDR, amount)
            } catch (error) {
                console.error('MONAD to USDC swap failed:', error.message)
            }
        },
        async () => {
            try {
                if (balanceUSDC === 0n) {
                    console.error('Cannot swap USDC: Balance is 0')
                    return
                }
                console.log(`Swapping USDC to ETH`)
                await swap(PRIVATE_KEY, USDC_ADDR, "ETH", amountSwapUSDC)
            } catch (error) {
                console.error('USDC to ETH swap failed:', error.message) 
            }
        },
        async () => {
            try {
                if (balanceUSDC === 0n) {
                    console.error('Cannot swap USDC: Balance is 0')
                    return
                }
                console.log(`Swapping USDC to BEAN`)
                await swap(PRIVATE_KEY, USDC_ADDR, BEAN_ADDR, amountSwapUSDC)
            } catch (error) {
                console.error('USDC to BEAN swap failed:', error.message)
            }
        },
        async () => {
            try {
                if (balanceBean === 0n) {
                    console.error('Cannot swap BEAN: Balance is 0')
                    return
                }
                console.log(`Swapping BEAN to MONAD`)
                await swap(PRIVATE_KEY, BEAN_ADDR, "ETH", balanceBean)
            } catch (error) {
                console.error('BEAN to MONAD swap failed:', error.message)
            }
        },
        async () => {
            try {
                // Get random token from listTokens
                const randomToken = listTokens[Math.floor(Math.random() * listTokens.length)]
                const amount = parseEther((Math.random() * 0.99 + 0.01).toFixed(3).toString())
                console.log(`Swapping MONAD to ${randomToken.symbol}`)
                await swap(PRIVATE_KEY, "ETH", randomToken.address, amount)
            } catch (error) {
                console.error('MONAD to random token swap failed:', error.message)
            }
        },
        async () => {
            try {
                const amount = parseEther((Math.random() * 0.99 + 0.01).toFixed(3).toString())
                console.log(`Staking MONAD`)
                await stake(PRIVATE_KEY, amount)
            } catch (error) {
                console.error('Staking MONAD failed:', error.message)
            }
        },
        async () => {
            try {
                console.log(`Deploying contract`)
                await deployContract(PRIVATE_KEY)
            } catch (error) {
                console.error('Contract deployment failed:', error.message)
            }
        },
        async () => {
            // Generate random address
            const randomWallet = ethers.Wallet.createRandom()
            console.log(`Sending 0 ETH to random address: ${randomWallet.address}`)
            const tx = await wallet.sendTransaction({
                to: randomWallet.address,
                value: 0
            }).catch(error => {
                console.error('Transaction failed:', error.message)
                throw error
            })
            console.log('Transaction sent! Hash:', tx.hash)
            await tx.wait()
            console.log('Transaction confirmed!')
        },
        async () => {
            try {
                const amount = parseEther((Math.random() * 0.99 + 0.01).toFixed(3).toString())
                console.log(`Magma Staking ${amount} MONAD`)
                await magmaStake(PRIVATE_KEY, amount)
            } catch (error) {
                console.error('Magma Staking failed:', error.message)
            }
        },
        async () => {
            try {
                const amount = parseEther((Math.random() * 0.99 + 0.01).toFixed(3).toString())
                console.log(`Magma Unstaking ${amount} gMon`)
                await magmaUnstake(PRIVATE_KEY, amount)
            } catch (error) {
                console.error('Magma Unstaking failed:', error.message)
            }
        },
        async () => {
            try {
                const amount = parseEther((Math.random() * 0.99 + 0.01).toFixed(3).toString())
                console.log(`Wrapping ${amount} MONAD`)
                await wrapMonad(PRIVATE_KEY, amount)
            } catch (error) {
                console.error('Wrapping MONAD failed:', error.message)
            }
        },
        async () => {
            try {
                const amount = parseEther((Math.random() * 0.99 + 0.01).toFixed(3).toString())
                console.log(`Unwrapping ${amount} wMONAD`)
                await unwrapMonad(PRIVATE_KEY, amount)
            } catch (error) {
                console.error('Unwrapping wMONAD failed:', error.message)
            }
        },
        async () => {
            try {
                const amount = parseEther((Math.random() * 0.99 + 0.01).toFixed(3).toString())
                console.log(`Adding liquidity ETH-USDC with ${amount} ETH`)
                await addLiquidityETH(PRIVATE_KEY, USDC_ADDR, amount)
            } catch (error) {
                console.error('Adding liquidity failed:', error.message)
            }
        },
        async () => {
            try {
                console.log(`Transferring tokens`)
                await transferTokens(PRIVATE_KEY)
            } catch (error) {
                console.error('Transfer failed:', error.message)
            }
        },
        async () => {
            try {
                // Get the pair address for USDC/ETH
                const ROUTER_ABI = require('../abis/uniswapV2.json')
                const ROUTER_ADDRESS = "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89"
                const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
                const factoryAddress = await routerContract.factory();
                console.log(`Factory address: ${factoryAddress}`)
                const factoryContract = new ethers.Contract(factoryAddress, ["function getPair(address tokenA, address tokenB) external view returns (address pair)"], wallet);
                const pair = await factoryContract.getPair(USDC_ADDR, "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701");
                console.log(`Pair address: ${pair}`)
                // Get LP balance
                const lpContract = new ethers.Contract(pair, ERC20_ABI, wallet);
                const balanceLP = await lpContract.balanceOf(wallet.address);

                const liquidityAmount = balanceLP / 2n // 1000 USDC/ETH LP tokens
                console.log(`Withdrawing ${liquidityAmount} USDC/ETH LP tokens`);
                await withdrawLiquidityETH(PRIVATE_KEY, liquidityAmount, pair, USDC_ADDR);
            } catch (error) {
                console.error('Liquidity withdrawal failed:', error.message);   
            }
        },
        async () => {
            try {
                if (!hedgeAccessToken) {
                    console.log('[hedgemony] accessToken is not set');
                } else {
                    const usdcContract = new ethers.Contract(USDC_ADDR, ERC20_ABI, wallet);
                    const wmonContract = new ethers.Contract(WMON_ADDR, ERC20_ABI, wallet);

                    const balanceUSDC = await usdcContract.balanceOf(wallet.address);
                    const balanceWMON = await wmonContract.balanceOf(wallet.address);

                    const getRandomAmount = (min, max, decimals) => {
                        const randomAmount = Math.random() * (max - min) + min;
                        return ethers.parseUnits(randomAmount.toFixed(decimals).toString(), decimals);
                    };

                    const swapAmountUSDC = getRandomAmount(0.1, 0.5, 6);
                    const swapAmountWMON = getRandomAmount(0.5, 1, 18);

                    if (balanceUSDC > swapAmountUSDC) {
                        console.log(`Swapping ${ethers.formatUnits(swapAmountUSDC, 6)} USDC to WMON`);
                        await hedgemonySwap(PRIVATE_KEY, hedgeAccessToken, USDC_ADDR, swapAmountUSDC, WMON_ADDR);
                    } else {
                        console.log(`USDC balance is below the threshold. No swap executed.`);
                    }

                    if (balanceWMON > swapAmountWMON) {
                        console.log(`Swapping ${ethers.formatEther(swapAmountWMON)} WMON to USDC`);
                        await hedgemonySwap(PRIVATE_KEY, hedgeAccessToken, WMON_ADDR, swapAmountWMON, USDC_ADDR);
                    } else {
                        console.log(`WMON balance is below the threshold. No swap executed.`);
                    }
                }
            } catch (error) {
                console.error('Hedgemony swap failed:', error.message);
            }
        },
    ]

    // Execute 3 random actions
    for(let i = 0; i < 3; i++) {
        // Random delay between 30-60 seconds before each action
        const delaySeconds = Math.floor(Math.random() * 31) + 30;
        console.log(`Waiting ${delaySeconds} seconds before next action...`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        
        const randomAction = actions[Math.floor(Math.random() * actions.length)]
        await randomAction()
    }

    const currentHour = new Date().getUTCHours() + 7; // Convert UTC to WIB (UTC+7)
    if (currentHour >= 9 && currentHour < 17) {
        // Random delay between 5-10 minutes before restarting
        const delayMinutes = Math.floor(Math.random() * 6) + 5;
        console.log(`All actions completed. Waiting ${delayMinutes} minutes before restarting...`);
        await new Promise(resolve => setTimeout(resolve, delayMinutes * 60 * 1000));
        
        // Restart main function
        await main();
    } else {
        console.log(`Current time is outside of operating hours. Waiting until 9 AM WIB to restart...`);
        const nextStartTime = new Date();
        nextStartTime.setHours(9, 0, 0, 0); // Set to 9 AM
        if (currentHour >= 17) {
            nextStartTime.setDate(nextStartTime.getDate() + 1); // Move to next day if after 5 PM
        }
        const delayUntilNextStart = nextStartTime - new Date();
        await new Promise(resolve => setTimeout(resolve, delayUntilNextStart));
        await main();
    }
}

console.log(`loaded account: ${wallet.address}`)

main()
