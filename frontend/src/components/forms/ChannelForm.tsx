import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Slider, Space, Tooltip } from 'antd';
import type { FormProps } from 'antd';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ChannelAnalysisPayload } from '@/types/analysis';

interface ChannelFormProps {
  loading?: boolean;
  initialValues?: Partial<ChannelAnalysisPayload>;
  onSubmit: (values: ChannelAnalysisPayload) => void | Promise<void>;
}

interface ChannelFormValues extends ChannelAnalysisPayload {}

export default function ChannelForm({ loading = false, initialValues, onSubmit }: ChannelFormProps) {
  const [form] = Form.useForm<ChannelFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      max_videos: 3,
      comments_per_video: 30,
      model: 'phobert',
      ...initialValues,
      apify_token: '',
    });
  }, [form, initialValues]);

  const handleValuesChange: FormProps<ChannelFormValues>['onValuesChange'] = () => undefined;

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit} onValuesChange={handleValuesChange}>
      <Form.Item name="model" hidden initialValue="phobert">
        <Input />
      </Form.Item>
      <Form.Item name="apify_token" hidden initialValue="">
        <Input />
      </Form.Item>

      <Form.Item label="Username kênh TikTok" name="username" rules={[{ required: true, message: 'Nhập username kênh TikTok' }]}>
        <Input placeholder="travinhuniversity hoặc @travinhuniversity" allowClear />
      </Form.Item>

      <Form.Item
        label={
          <Space>
            <span>Số video tối đa</span>
            <Tooltip title="Gợi ý 1-3 video nếu đang dùng Apify free vì mỗi video cần crawl comment riêng">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="max_videos"
        rules={[{ required: true, message: 'Chọn số video tối đa' }]}
      >
        <Slider min={1} max={50} step={1} tooltip={{ formatter: (value) => `${value}` }} />
      </Form.Item>

      <Form.Item
        label={
          <Space>
            <span>Bình luận mỗi video</span>
            <Tooltip title="Gợi ý 20-50 bình luận mỗi video nếu đang dùng Apify free">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="comments_per_video"
        rules={[{ required: true, message: 'Chọn số bình luận mỗi video' }]}
      >
        <Slider min={10} max={500} step={10} tooltip={{ formatter: (value) => `${value}` }} />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={loading} block>
        Phân tích kênh bằng PhoBERT
      </Button>
    </Form>
  );
}
