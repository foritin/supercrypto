const wallet = {
  wallet: {
    connect: "Connect Wallet",
    disconnect: "Disconnect",
    disconnected: "Disconnected",
    connecting: "Connecting...",
    connected: "Connected",
    signing: "Signing...",
    loggingIn: "Logging in...",
    loginSuccess: "Login successful",
    switchNetwork: "Switch Network",
    copyAddress: "Copy Address",
    viewOnExplorer: "View on Explorer",
    balance: "Balance",
    network: {
      mainnet: "Ethereum Mainnet",
      sepolia: "Sepolia Testnet",
      localhost: "Localhost",
    },
    accountChanged: "Account changed from {{from}} to {{to}}",
    error: {
      notInstalled: "MetaMask is not installed",
      connectionFailed: "Failed to connect wallet",
      switchFailed: "Failed to switch network",
      userRejected: "User rejected the request",
      unlockRequired: "Please unlock MetaMask first",
      signRejected: "Signature rejected. Please sign to login.",
      loginFailed: "Login failed. Please try again.",
    },
  },
  metamask: {
    install: {
      title: "Install MetaMask Wallet",
      required: "MetaMask wallet is required to use this platform",
      description: "MetaMask is the most popular Ethereum wallet. After installation, you can securely connect and manage your digital assets.",
      steps: {
        title: "Installation Steps:",
        step1: "Click \"Go to Install\" to visit MetaMask official download page",
        step2: "Click \"Add to Browser\" to install the extension",
        step3: "Follow the prompts to create or import a wallet",
        step4: "After installation, refresh this page and click \"Connect Wallet\"",
      },
      browsers: "Supported Browsers:",
      chrome: "Chrome",
      firefox: "Firefox",
      other: "Other Browsers",
      security: {
        title: "Security Notice",
        tip1: "Always download MetaMask from the official website (metamask.io) to avoid phishing sites.",
        tip2: "Keep your recovery phrase safe and never share it with anyone.",
      },
      officialSite: "Official Website:",
      goToInstall: "Go to Install",
      installLater: "Install Later",
    },
  },
}

export default wallet

