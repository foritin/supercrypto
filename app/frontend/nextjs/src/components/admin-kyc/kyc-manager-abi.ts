/**
 * KYC Manager Contract ABI
 * KYCManager 智能合约 ABI 定义
 *
 * 包含链上准入/解除准入所需的函数签名:
 * - addInvestor: 添加投资者 (准入)
 * - removeInvestor: 移除投资者 (解除准入)
 * - getInvestorInfo: 获取投资者链上信息
 * - verifiers: 检查地址是否为验证者
 * - isVerified: 检查投资者是否已验证
 *
 * @validates Requirements 2.3
 */

export const KYC_MANAGER_ABI = [
  'function addInvestor(address _investor, string _country, bool _accreditedInvestor)',
  'function removeInvestor(address _investor, string _reason)',
  'function getInvestorInfo(address _investor) view returns ((bool, string, bool, uint256, uint256, uint256, bool))',
  'function verifiers(address) view returns (bool)',
  'function isVerified(address _investor) view returns (bool)',
] as const
