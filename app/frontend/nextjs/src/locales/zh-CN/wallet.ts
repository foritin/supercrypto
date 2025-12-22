const wallet = {
  wallet: {
    connect: "连接钱包",
    disconnect: "断开连接",
    disconnected: "已断开连接",
    connecting: "连接中...",
    connected: "已连接",
    signing: "签名中...",
    loggingIn: "登录中...",
    loginSuccess: "登录成功",
    switchNetwork: "切换网络",
    copyAddress: "复制地址",
    viewOnExplorer: "在浏览器查看",
    balance: "余额",
    network: {
      mainnet: "以太坊主网",
      sepolia: "Sepolia 测试网",
      localhost: "本地网络",
    },
    accountChanged: "账户已从 {{from}} 切换到 {{to}}",
    error: {
      notInstalled: "未安装 MetaMask",
      connectionFailed: "连接钱包失败",
      switchFailed: "切换网络失败",
      userRejected: "用户拒绝了请求",
      unlockRequired: "请先解锁 MetaMask",
      signRejected: "签名被拒绝，请签名以完成登录",
      loginFailed: "登录失败，请重试",
    },
  },
  metamask: {
    install: {
      title: "安装 MetaMask 钱包",
      required: "需要安装 MetaMask 钱包才能使用本平台",
      description: "MetaMask 是最流行的以太坊钱包，安装后您可以安全地连接并管理您的数字资产。",
      steps: {
        title: "安装步骤：",
        step1: "点击「前往安装」按钮，跳转到 MetaMask 官方下载页面",
        step2: "点击「添加到浏览器」安装扩展程序",
        step3: "按照提示创建或导入钱包",
        step4: "安装完成后，刷新本页面并点击「连接钱包」",
      },
      browsers: "支持的浏览器：",
      chrome: "Chrome",
      firefox: "Firefox",
      other: "其他浏览器",
      security: {
        title: "安全提示",
        tip1: "请务必从官方网站 (metamask.io) 下载 MetaMask，谨防钓鱼网站。",
        tip2: "安装后请妥善保管您的助记词，切勿泄露给任何人。",
      },
      officialSite: "官方网站：",
      goToInstall: "前往安装",
      installLater: "稍后安装",
    },
  },
}

export default wallet

