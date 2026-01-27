import { XStack, Text, styled, GetProps, useTheme } from 'tamagui';

/**
 * StatusBadge - A badge component for displaying status indicators
 *
 * Used for: Research card status, challenge status, workout difficulty, etc.
 */

type StatusType = 'active' | 'completed' | 'pending' | 'expired' | 'draft' | 'published' | 'review' | 'custom';

interface StatusConfig {
  backgroundColor: string;
  textColor: string;
  label: string;
}

const STATUS_CONFIG: Record<Exclude<StatusType, 'custom'>, StatusConfig> = {
  active: {
    backgroundColor: '$successMuted',
    textColor: '$success',
    label: 'Active',
  },
  completed: {
    backgroundColor: '$primaryMuted',
    textColor: '$primary',
    label: 'Completed',
  },
  pending: {
    backgroundColor: '$warningMuted',
    textColor: '$warning',
    label: 'Pending',
  },
  expired: {
    backgroundColor: '$errorMuted',
    textColor: '$error',
    label: 'Expired',
  },
  draft: {
    backgroundColor: '$backgroundHover',
    textColor: '$colorMuted',
    label: 'Draft',
  },
  published: {
    backgroundColor: '$successMuted',
    textColor: '$success',
    label: 'Published',
  },
  review: {
    backgroundColor: '$infoMuted',
    textColor: '$info',
    label: 'In Review',
  },
};

const BadgeContainer = styled(XStack, {
  name: 'StatusBadge',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$full',
  gap: '$1',

  variants: {
    size: {
      sm: {
        paddingHorizontal: '$1.5',
        paddingVertical: '$0.5',
      },
      md: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
      },
      lg: {
        paddingHorizontal: '$3',
        paddingVertical: '$1.5',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

type StatusBadgeProps = {
  status: StatusType;
  customLabel?: string;
  customBackgroundColor?: string;
  customTextColor?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function StatusBadge({
  status,
  customLabel,
  customBackgroundColor,
  customTextColor,
  icon,
  size = 'md',
}: StatusBadgeProps) {
  const config = status === 'custom'
    ? {
        backgroundColor: customBackgroundColor || '$backgroundHover',
        textColor: customTextColor || '$color',
        label: customLabel || 'Custom',
      }
    : STATUS_CONFIG[status];

  const fontSize = size === 'sm' ? '$2' : size === 'lg' ? '$3' : '$3';

  return (
    <BadgeContainer
      size={size}
      backgroundColor={config.backgroundColor}
    >
      {icon}
      <Text
        color={config.textColor}
        fontSize={fontSize}
        fontWeight="600"
      >
        {customLabel || config.label}
      </Text>
    </BadgeContainer>
  );
}

export default StatusBadge;
