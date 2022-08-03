// async function deployFun(hre) {
//     console.log("Hi")
// hre.getNamedAccounts()
//hre.deployments
// }

// module.exports.default = deployFun
//hre stands for hardhat runtime environment

// module.exports = async (hre) => {
//     const { getNamedAccounts, deployments } = hre
// }

const { getNamedAccounts, deployments, network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    //if chain id is X use address Y
    //if chain id is Z use address A

    //if contract dooesn't exist we deploy a minimal version
    //for our local test

    //When going for a local or hardhat network  we want to use

    let ethUsdPriceFeedAddress
    if (chainId == 31337) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }
    log(ethUsdPriceFeedAddress)
    log("Deploying FundMe and waiting for confirmations...")

    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: [ethUsdPriceFeedAddress], //put price feed address
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, [ethUsdPriceFeedAddress])
    }
    log("---------------------------------------")
}
module.exports.tags = ["all", "fundme"]
