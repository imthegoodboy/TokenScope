import Image from 'next/image';

export const LOGO_SRC = '/tokenscope-logo.png';

type LogoMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  rounded?: 'lg' | 'xl' | '2xl';
};

const roundedClass: Record<NonNullable<LogoMarkProps['rounded']>, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

export function LogoMark({
  size = 40,
  className = '',
  priority,
  rounded = 'xl',
}: LogoMarkProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="TokenScope"
      width={size}
      height={size}
      className={`${roundedClass[rounded]} object-cover shrink-0 ${className}`}
      priority={priority}
    />
  );
}
