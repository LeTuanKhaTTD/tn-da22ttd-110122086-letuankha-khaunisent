import { Input as AntInput } from 'antd';
import type { InputProps } from 'antd';

export function Input(props: InputProps) {
  return <AntInput {...props} />;
}

export function PasswordInput(props: React.ComponentProps<typeof AntInput.Password>) {
  return <AntInput.Password {...props} />;
}
