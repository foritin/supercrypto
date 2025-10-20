/**
 * Uniswap V2 部署辅助脚本
 * 
 * 本脚本用于在 Hardhat 本地节点上部署 Uniswap V2
 * 注意：需要在 hardhat 项目中安装 @uniswap/v2-core 和 @uniswap/v2-periphery
 * 
 * 安装依赖：
 * npm install --save-dev @uniswap/v2-core @uniswap/v2-periphery
 * 
 * 运行：
 * npx hardhat run scripts/deploy_uniswap_helper.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("使用账户部署:", deployer.address);
  console.log("账户余额:", (await deployer.getBalance()).toString());
  
  // 1. 部署 WETH
  console.log("\n部署 WETH9...");
  const WETH = await hre.ethers.getContractFactory("WETH9");
  const weth = await WETH.deploy();
  await weth.deployed();
  console.log("WETH9 地址:", weth.address);
  
  // 2. 部署 UniswapV2Factory
  console.log("\n部署 UniswapV2Factory...");
  const Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address); // feeToSetter
  await factory.deployed();
  console.log("UniswapV2Factory 地址:", factory.address);
  
  // 3. 部署 UniswapV2Router02
  console.log("\n部署 UniswapV2Router02...");
  const Router = await hre.ethers.getContractFactory("UniswapV2Router02");
  const router = await Router.deploy(factory.address, weth.address);
  await router.deployed();
  console.log("UniswapV2Router02 地址:", router.address);
  
  // 保存地址
  const addresses = {
    weth: weth.address,
    factory: factory.address,
    router: router.address,
    deployer: deployer.address
  };
  
  console.log("\n=== Uniswap V2 部署完成 ===");
  console.log(JSON.stringify(addresses, null, 2));
  
  // 保存到文件
  const fs = require("fs");
  fs.writeFileSync(
    "./uniswap_addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n地址已保存到: uniswap_addresses.json");
  
  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

