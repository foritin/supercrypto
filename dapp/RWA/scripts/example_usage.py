"""
RWA 系统使用示例
展示完整的用户交互流程
"""
from ape import accounts, Contract, chain
import json


def load_addresses():
    """加载已部署的合约地址"""
    with open("deployed_addresses.json", "r") as f:
        return json.load(f)


def print_section(title):
    """打印分隔符"""
    print("\n" + "="*60)
    print(title)
    print("="*60)


def main():
    # 加载合约
    addresses = load_addresses()
    
    usdt = Contract(addresses['usdt'])
    rwa_token = Contract(addresses['rwa_token'])
    platform_token = Contract(addresses['platform_token'])
    subscription = Contract(addresses['subscription'])
    staking = Contract(addresses['staking'])
    liquidity_mining = Contract(addresses['liquidity_mining'])
    
    # 使用测试账户
    alice = accounts.test_accounts[1]
    bob = accounts.test_accounts[2]
    
    print_section("RWA 系统使用示例")
    print(f"Alice: {alice.address}")
    print(f"Bob: {bob.address}")
    
    # ===== Alice 的故事：认购 + 质押挖矿 =====
    
    print_section("场景 1: Alice 认购权益代币并质押挖矿")
    
    # 1. Alice 获取 USDT
    print("\n1. Alice 获取 50,000 USDT")
    usdc_amount = 50_000 * 10**6
    usdt.mint(alice.address, usdc_amount, sender=alice)
    print(f"   ✓ Alice USDT 余额: {usdt.balanceOf(alice.address) / 10**6:,.0f}")
    
    # 2. Alice 认购权益代币（6个月期）
    print("\n2. Alice 认购权益代币（6个月期，年化12%）")
    usdt.approve(subscription.address, usdc_amount, sender=alice)
    
    lock_periods = subscription.getLockPeriods()
    lock_6_months = lock_periods[2]  # 6个月
    
    subscription.subscribe(usdc_amount, lock_6_months, sender=alice)
    
    rwa_balance = rwa_token.balanceOf(alice.address)
    print(f"   ✓ Alice 收到 RWA Token: {rwa_balance / 10**18:,.0f}")
    
    # 查看认购信息
    sub_info = subscription.getSubscription(alice.address, 0)
    print(f"   - 本金: {sub_info.principal / 10**6:,.0f} USDT")
    print(f"   - 锁定期: {sub_info.lockPeriod / (24*3600)} 天")
    print(f"   - 年化收益: {sub_info.apy / 100}%")
    
    # 计算预期利息
    expected_interest = subscription.getPendingReward(alice.address, 0)
    print(f"   - 预期利息: {expected_interest / 10**6:,.2f} USDT")
    
    # 3. Alice 质押 RWA Token
    print("\n3. Alice 质押 RWA Token 进行挖矿")
    rwa_token.approve(staking.address, rwa_balance, sender=alice)
    staking.stake(rwa_balance, 0, sender=alice)
    print(f"   ✓ 质押成功: {rwa_balance / 10**18:,.0f} RWA")
    print(f"   - 质押 APY: {staking.stakingAPY() / 100}%")
    print(f"   - 每日释放: {staking.dailyEmission() / 10**18:,.0f} PLT")
    
    # 4. 时间流逝 30 天
    print("\n4. ⏰ 时间流逝 30 天...")
    chain.pending_timestamp += 30 * 24 * 3600
    chain.mine()
    
    # 5. Alice 领取质押奖励
    print("\n5. Alice 领取质押奖励")
    reward = staking.calculateReward(alice.address, 0)
    print(f"   - 待领取奖励: {reward / 10**18:,.2f} PLT")
    
    staking.claimReward(0, sender=alice)
    plt_balance = platform_token.balanceOf(alice.address)
    print(f"   ✓ Alice PLT 余额: {plt_balance / 10**18:,.2f}")
    
    # 6. 查看赎回期顺延
    new_redeem_time = staking.getNewRedeemTime(alice.address, 0)
    original_redeem_time = sub_info.redeemTime
    delay = new_redeem_time - original_redeem_time
    print(f"\n6. 赎回期顺延")
    print(f"   - 原赎回期: {original_redeem_time}")
    print(f"   - 新赎回期: {new_redeem_time}")
    print(f"   - 顺延天数: {delay / (24*3600):.0f} 天")
    
    # ===== Bob 的故事：提供流动性 =====
    
    print_section("场景 2: Bob 提供流动性并进行流动性挖矿")
    
    # 检查是否有 LP Token
    lp_token_address = liquidity_mining.lpToken()
    if lp_token_address == "0x0000000000000000000000000000000000000000":
        print("\n⚠️  流动性池未设置，跳过流动性挖矿示例")
        print("   提示: 运行 setup_uniswap_liquidity.py 设置流动性池")
    else:
        # 1. Bob 获取 LP Token（模拟）
        print("\n1. Bob 在 Uniswap 添加流动性获得 LP Token")
        lp_token = Contract(lp_token_address)
        
        # 注意：实际使用中，Bob 需要在 Uniswap 添加流动性
        # 这里我们模拟 Bob 获得了 LP Token
        print("   （在实际场景中，Bob 需要：")
        print("    - 准备 USDT 和 PLT")
        print("    - 通过 Uniswap Router 添加流动性")
        print("    - 获得 LP Token）")
        
        # 模拟：从部署者转一些 LP Token 给 Bob（测试用）
        try:
            deployer = accounts.test_accounts[0]
            lp_amount = 1000 * 10**18
            if lp_token.balanceOf(deployer.address) >= lp_amount:
                lp_token.transfer(bob.address, lp_amount, sender=deployer)
                print(f"   ✓ Bob 获得 LP Token: {lp_amount / 10**18:,.0f}")
                
                # 2. Bob 质押 LP Token
                print("\n2. Bob 质押 LP Token 进行流动性挖矿")
                lp_token.approve(liquidity_mining.address, lp_amount, sender=bob)
                liquidity_mining.stakeLPToken(lp_amount, sender=bob)
                print(f"   ✓ 质押成功: {lp_amount / 10**18:,.0f} LP")
                
                # 3. 时间流逝 15 天
                print("\n3. ⏰ 时间流逝 15 天...")
                chain.pending_timestamp += 15 * 24 * 3600
                chain.mine()
                
                # 4. Bob 领取流动性挖矿奖励
                print("\n4. Bob 领取流动性挖矿奖励")
                lp_reward = liquidity_mining.calculateLPReward(bob.address, 0)
                print(f"   - 待领取奖励: {lp_reward / 10**18:,.2f} PLT")
                
                liquidity_mining.claimLPReward(0, sender=bob)
                bob_plt_balance = platform_token.balanceOf(bob.address)
                print(f"   ✓ Bob PLT 余额: {bob_plt_balance / 10**18:,.2f}")
            else:
                print("   ⚠️  LP Token 余额不足，跳过")
        except Exception as e:
            print(f"   ⚠️  无法转移 LP Token: {e}")
    
    # ===== Alice 继续：解除质押和赎回 =====
    
    print_section("场景 3: Alice 解除质押并赎回")
    
    # 1. Alice 再等待一段时间
    remaining_days = (new_redeem_time - chain.pending_timestamp) / (24 * 3600)
    if remaining_days > 0:
        print(f"\n1. ⏰ 等待赎回期到期（剩余 {remaining_days:.0f} 天）...")
        chain.pending_timestamp = new_redeem_time + 1
        chain.mine()
    
    # 2. Alice 解除质押
    print("\n2. Alice 解除质押")
    stake_info = staking.getStake(alice.address, 0)
    if not stake_info.unstaked:
        staking.unstake(0, sender=alice)
        print("   ✓ 解除质押成功")
        
        # 查看最终 PLT 余额
        final_plt = platform_token.balanceOf(alice.address)
        print(f"   - Alice 总 PLT 收益: {final_plt / 10**18:,.2f}")
    else:
        print("   ✓ 已解除质押")
    
    # 3. 给认购合约充值 USDT（用于支付利息）
    print("\n3. 准备赎回资金")
    interest = subscription.getPendingReward(alice.address, 0)
    total_needed = sub_info.principal + interest
    current_balance = usdt.balanceOf(subscription.address)
    
    if current_balance < total_needed:
        needed = total_needed - current_balance
        usdt.mint(subscription.address, needed, sender=alice)
        print(f"   ✓ 充值 {needed / 10**6:,.2f} USDT 到认购合约")
    
    # 4. Alice 赎回
    print("\n4. Alice 赎回权益代币")
    initial_usdc = usdt.balanceOf(alice.address)
    
    subscription.redeem(0, sender=alice)
    
    final_usdc = usdt.balanceOf(alice.address)
    received = final_usdc - initial_usdc
    
    print(f"   ✓ 赎回成功")
    print(f"   - 收到 USDT: {received / 10**6:,.2f}")
    print(f"   - 本金: {sub_info.principal / 10**6:,.2f}")
    print(f"   - 利息: {interest / 10**6:,.2f}")
    
    # ===== 最终总结 =====
    
    print_section("最终总结")
    
    print("\nAlice 的收益:")
    print(f"  - 初始投资: 50,000 USDT")
    print(f"  - 认购利息: {interest / 10**6:,.2f} USDT")
    print(f"  - 质押奖励: {platform_token.balanceOf(alice.address) / 10**18:,.2f} PLT")
    print(f"  - 总 USDT: {usdt.balanceOf(alice.address) / 10**6:,.2f}")
    
    if lp_token_address != "0x0000000000000000000000000000000000000000":
        print("\nBob 的收益:")
        print(f"  - LP 挖矿奖励: {platform_token.balanceOf(bob.address) / 10**18:,.2f} PLT")
    
    print("\n系统状态:")
    print(f"  - RWA Token 总供应: {rwa_token.totalSupply() / 10**18:,.0f}")
    print(f"  - Platform Token 总供应: {platform_token.totalSupply() / 10**18:,.2f}")
    print(f"  - 总质押 RWA: {staking.totalStaked() / 10**18:,.0f}")
    
    if lp_token_address != "0x0000000000000000000000000000000000000000":
        print(f"  - 总质押 LP: {liquidity_mining.totalLPStaked() / 10**18:,.0f}")
    
    print("\n" + "="*60)
    print("示例完成！")
    print("="*60)


if __name__ == "__main__":
    main()

