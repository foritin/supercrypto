/**
 * 合作伙伴数据配置
 * Partners data configuration
 */

export interface Partner {
  id: string;
  name: string;
  logo: string;
  website?: string;
}

/**
 * 金融机构合作伙伴
 * Financial institution partners
 */
export const INSTITUTION_PARTNERS: Partner[] = [
  { id: 'blackrock', name: 'BlackRock', logo: '/partners/blackrock.svg' },
  { id: 'morgan-stanley', name: 'Morgan Stanley', logo: '/partners/morgan-stanley.svg' },
  { id: 'vaneck', name: 'VanEck', logo: '/partners/vaneck.svg' },
  { id: 'bny', name: 'BNY', logo: '/partners/bny.svg' },
  { id: 'kkr', name: 'KKR', logo: '/partners/kkr.svg' },
  { id: 'apollo', name: 'Apollo', logo: '/partners/apollo.svg' },
  { id: 'hamilton-lane', name: 'Hamilton Lane', logo: '/partners/hamilton-lane.svg' },
  { id: 'blockchain-capital', name: 'Blockchain Capital', logo: '/partners/blockchain-capital.svg' },
  { id: 'science-blockchain', name: 'Science', logo: '/partners/science-blockchain.svg' },
];

/**
 * 区块链生态合作伙伴
 * Blockchain ecosystem partners
 */
export const BLOCKCHAIN_PARTNERS: Partner[] = [
  { id: 'ethereum', name: 'Ethereum', logo: '/partners/ethereum.svg' },
  { id: 'polygon', name: 'Polygon', logo: '/partners/polygon.svg' },
  { id: 'solana', name: 'Solana', logo: '/partners/solana.svg' },
  { id: 'avalanche', name: 'Avalanche', logo: '/partners/avalanche.svg' },
  { id: 'arbitrum', name: 'Arbitrum', logo: '/partners/arbitrum.svg' },
  { id: 'aptos', name: 'Aptos', logo: '/partners/aptos.svg' },
  { id: 'hedera', name: 'Hedera', logo: '/partners/hedera.svg' },
  { id: 'sei', name: 'Sei', logo: '/partners/sei.svg' },
  { id: 'frax', name: 'Frax', logo: '/partners/frax.svg' },
];
