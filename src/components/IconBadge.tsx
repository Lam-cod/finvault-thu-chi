import React from 'react';
import {
  ArrowLeftRight,
  Briefcase,
  Car,
  CreditCard,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Layers,
  PiggyBank,
  Plane,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Utensils,
  Wallet,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet,
  Landmark,
  CreditCard,
  Smartphone,
  PiggyBank,
  Utensils,
  Car,
  ShoppingBag,
  Home,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Gift,
  Briefcase,
  Sparkles,
  TrendingUp,
  Layers,
  Target,
  Plane,
  Laptop,
  ShieldCheck,
  Tag,
  Receipt,
  ArrowLeftRight,
};

export const AVAILABLE_ICON_NAMES = [
  'Utensils',
  'Car',
  'ShoppingBag',
  'Home',
  'Gamepad2',
  'HeartPulse',
  'GraduationCap',
  'Gift',
  'Briefcase',
  'Sparkles',
  'TrendingUp',
  'PiggyBank',
  'Wallet',
  'Landmark',
  'Smartphone',
  'CreditCard',
  'Plane',
  'Laptop',
  'ShieldCheck',
  'Target',
];

interface IconBadgeProps {
  icon: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  icon,
  color = '#10B981',
  size = 'md',
  className = '',
}) => {
  const IconComp = ICON_MAP[icon] || Tag;
  const sizeClasses =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : size === 'lg'
        ? 'h-12 w-12 rounded-2xl'
        : 'h-10 w-10 rounded-xl';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center ${sizeClasses} ${className}`}
      style={{
        backgroundColor: `${color}1F`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      <IconComp className={iconSize} />
    </div>
  );
};
