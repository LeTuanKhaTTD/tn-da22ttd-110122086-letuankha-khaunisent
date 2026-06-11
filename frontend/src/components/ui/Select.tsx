import { Select as AntSelect } from 'antd';
import type { SelectProps } from 'antd';

export function Select<ValueType = unknown>(props: SelectProps<ValueType>) {
  return <AntSelect {...props} />;
}
