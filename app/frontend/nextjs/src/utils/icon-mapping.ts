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
  Bank,
  FileText,
  Zap,
  Gift,
  User,
  TrendingUp,
  Users,
  RefreshCw,
  BarChart3,
  Check,
  X,
  Eye,
  EyeOff,
  Tool,
  Api,
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
  Environment,
  Team,
  Clock,
  Delete,
  Warning,
  AlertCircle,
  CheckCircle,
  Lock,
  ArrowRight,
  Down,
  Swap,
  Disconnect,
  Loading as LoadingIcon,
  Safety,
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
  BankOutlined: Bank,

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
  ToolOutlined: Tool,
  ApiOutlined: Api,
  RocketOutlined: Rocket,

  // Stats & Charts
  TrendingUpOutlined: TrendingUp,
  UserOutlined: User,
  TeamOutlined: Users,

  // UI Elements
  DownOutlined: Down,
  DisconnectOutlined: Disconnect,
  LoadingOutlined: LoadingIcon,
  SwapOutlined: Swap,

  // Development Tools
  PlusOutlined: Plus,
  EditOutlined: Edit,
  PauseCircleOutlined: Pause,
  PlayCircleOutlined: Play,
  DollarOutlined: DollarSign,
  LinkOutlined: Link,
  CalendarOutlined: Calendar,
  HomeWorkOutlined: HomeIcon,
  EnvironmentOutlined: Environment,
  FieldTimeOutlined: Clock,

  // Status & Feedback
  DeleteOutlined: Delete,
  WarningOutlined: Warning,
  ExclamationCircleOutlined: AlertCircle,
  SafetyCertificateOutlined: Check,
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
