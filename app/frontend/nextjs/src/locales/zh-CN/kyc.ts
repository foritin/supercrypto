const kyc = {
  kyc: {
    title: "KYC 身份认证",
    connectWalletFirst: "请先连接钱包",
    connectWalletDescription: "请连接您的钱包以查看和管理 KYC 状态。",
    accreditedInvestor: "合格投资者",
    status: {
      notStarted: "未开始",
      pending: "审核中",
      approved: "已认证",
      rejected: "已拒绝",
    },
    notStarted: {
      title: "需要完成 KYC 认证",
      description: "为了参与 RWA 投资，您需要完成 KYC（了解您的客户）身份认证。",
      requirements: "所需材料：",
      req1: "有效的政府签发身份证件",
      req2: "地址证明（水电账单、银行对账单）",
      req3: "手持证件自拍照",
      startButton: "开始认证",
    },
    pending: {
      title: "认证审核中",
      description: "您的 KYC 申请正在审核中，通常需要 24-48 小时。",
      submitted: "提交于 {{date}}",
      refresh: "刷新状态",
    },
    approved: {
      title: "认证已通过",
      description: "您的身份已验证，现在可以参与 RWA 投资。",
      date: "认证于 {{date}}",
    },
    rejected: {
      title: "认证未通过",
      description: "很抱歉，您的 KYC 申请未通过审核。",
      reason: "拒绝原因：",
      reapply: "重新申请",
    },
    error: {
      loadFailed: "加载 KYC 状态失败",
      applyFailed: "提交 KYC 申请失败",
    },
    guard: {
      title: "需要完成 KYC 认证",
      description: "您需要完成 KYC 认证后才能访问此功能。",
      startButton: "开始 KYC 认证",
    },
  },
}

export default kyc

