/**
 * ════════════════════════════════════════════════════════════════
 * Icon Mapping - Ant Design Icons to Lucide Icons
 * 图标映射表：Ant Design 图标 → Lucide 图标
 * ════════════════════════════════════════════════════════════════
 */

import {
  // Navigation
  Home,
  Settings,
  Wallet,
  Landmark, // 替代 Bank
  FileText,
  User,
  TrendingUp,
  Users,
  RefreshCw,
  BarChart3,
  X,
  Eye,
  EyeOff,
  Wrench, // 替代 Tool
  Cable, // 替代 Api
  Rocket,
  Flame,
  FileBarChart,
  Download,
  Chrome,
  Globe,
  Github,
  Twitter,
  Plus,
  Edit,
  Pause,
  Play,
  DollarSign,
  Link,
  Calendar,
  Home as HomeIcon,
  MapPin, // 替代 Environment
  Clock,
  Trash2, // 替代 Delete
  AlertTriangle, // 替代 Warning
  AlertCircle,
  CheckCircle,
  Lock,
  ArrowRight,
  ChevronDown, // 替代 Down
  ArrowLeftRight, // 替代 Swap
  Unplug, // 替代 Disconnect
  Loader2, // 替代 Loading
  ShieldCheck, // 替代 Safety
  Undo,
} from 'lucide-react';

// 图标映射类型
export type IconName = keyof typeof iconMap;

// Ant Design Icon 名称 → Lucide Icon 组件
export const iconMap: Record<string, React.ElementType> = {
  // Navigation Icons
  HomeOutlined: Home,
  HomeIcon: HomeIcon,
  SettingOutlined: Settings,
  WalletOutlined: Wallet,
  BankOutlined: Landmark,

  // Feature Icons
  FileTextOutlined: FileText,
  FireOutlined: Flame,
  DashboardOutlined: BarChart3,
  FileBarChart: FileBarChart,

  // Action Icons
  ReloadOutlined: RefreshCw,
  CheckCircleOutlined: CheckCircle,
  CloseCircleOutlined: X,
  EyeOutlined: Eye,
  EyeOffOutlined: EyeOff,

  // Admin Icons
  ToolOutlined: Wrench,
  ApiOutlined: Cable,
  RocketOutlined: Rocket,

  // Stats & Charts
  TrendingUpOutlined: TrendingUp,
  UserOutlined: User,
  TeamOutlined: Users,

  // UI Elements
  DownOutlined: ChevronDown,
  DisconnectOutlined: Unplug,
  LoadingOutlined: Loader2,
  SwapOutlined: ArrowLeftRight,

  // Development Tools
  PlusOutlined: Plus,
  EditOutlined: Edit,
  PauseCircleOutlined: Pause,
  PlayCircleOutlined: Play,
  DollarOutlined: DollarSign,
  LinkOutlined: Link,
  CalendarOutlined: Calendar,
  HomeWorkOutlined: HomeIcon,
  EnvironmentOutlined: MapPin,
  FieldTimeOutlined: Clock,

  // Status & Feedback
  DeleteOutlined: Trash2,
  WarningOutlined: AlertTriangle,
  ExclamationCircleOutlined: AlertCircle,
  SafetyCertificateOutlined: ShieldCheck,
  UndoOutlined: Undo,

  // Social & External
  GithubOutlined: Github,
  TwitterOutlined: Twitter,
  GlobalOutlined: Globe,
  DownloadOutlined: Download,
  ChromeOutlined: Chrome,

  // Wallet & Auth
  LockOutlined: Lock,
  ArrowRightOutlined: ArrowRight,
};

// 尺寸映射（像素）
export const iconSizes = {
  small: 14,
  default: 16,
  medium: 18,
  large: 20,
  xlarge: 24,
  xxlarge: 32,
} as const;

// 图标变体类型
export type IconVariant = 'gold' | 'cyan' | 'default' | 'inherit' | 'white' | 'gray';
