const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fundme", function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async function () {
              // display ou FundMe contract
              // using hardhat deploy
              //const accounts =  await ethers.getSigner()
              //const accountsZero = accounts[0]

              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture("all")
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })
          describe("constructor", async () => {
              it("set the aggregator adresses correctly", async () => {
                  const response = await fundMe.s_priceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", async () => {
              it("Fails if you dont spend enough Eth", async () => {
                  await expect(fundMe.fund()).to.be.reverted
              })
              it("Updated the amount funded data stucture", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.s_AddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Adds funders to funder array", async () => {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.s_funders(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("Withdraw", async () => {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue })
              })

              it("should withdraw only from single founder", async () => {
                  //Arrange
                  const startFundeMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endFundeMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Assert
                  assert.equal(endFundeMeBalance, 0)
                  assert.equal(
                      startFundeMeBalance.add(startDeployerBalance).toString(),
                      endDeployerBalance.add(gasCost).toString()
                  )
              })
              it("allows us to withdraw from multiple founders", async () => {
                  //Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedAccounts = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedAccounts.fund({ value: sendValue })
                  }
                  const startFundeMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )
                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endFundeMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  //Assert
                  assert.equal(endFundeMeBalance, 0)
                  assert.equal(
                      startFundeMeBalance.add(startDeployerBalance).toString(),
                      endDeployerBalance.add(gasCost).toString()
                  )

                  await expect(fundMe.s_funders(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.s_AddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("only allows owner to withdraw", async () => {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerAccountConnected = await fundMe.connect(
                      attacker
                  )
                  await expect(attackerAccountConnected.withdraw()).to.be
                      .reverted //With("FundeMe_NotOwner")
              })
          })
      })
