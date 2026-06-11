import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';

export type ButtonPreset = 'primary' | 'danger' | 'ghost';

interface ButtonProps extends AntButtonProps {
  preset?: ButtonPreset;
}

export default function Button({ preset = 'primary', danger, ghost, type, children, ...props }: ButtonProps) {
  const resolvedDanger = preset === 'danger' || danger;
  const resolvedGhost = preset === 'ghost' || ghost;
  const resolvedType = type ?? (preset === 'primary' ? 'primary' : 'default');

  return (
    <AntButton type={resolvedType} danger={resolvedDanger} ghost={resolvedGhost} {...props}>
      {children}
    </AntButton>
  );
}
