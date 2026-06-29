import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Slider, Space, Tooltip } from 'antd';
import type { FormProps } from 'antd';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { VideoAnalysisPayload } from '@/types/analysis';

interface VideoFormProps {
  loading?: boolean;
  initialValues?: Partial<VideoAnalysisPayload>;
  onSubmit: (values: VideoAnalysisPayload) => void | Promise<void>;
}

interface VideoFormValues extends VideoAnalysisPayload {}

export default function VideoForm({ loading = false, initialValues, onSubmit }: VideoFormProps) {
  const [form] = Form.useForm<VideoFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      max_comments: 50,
      model: 'phobert',
      ...initialValues,
      apify_token: '',
    });
  }, [form, initialValues]);

  const handleValuesChange: FormProps<VideoFormValues>['onValuesChange'] = () => undefined;

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit} onValuesChange={handleValuesChange}>
      <Form.Item name="model" hidden initialValue="phobert">
        <Input />
      </Form.Item>
      <Form.Item name="apify_token" hidden initialValue="">
        <Input />
      </Form.Item>

      <Form.Item
        label="URL video TikTok"
        name="url"
        rules={[
          { required: true, message: 'Nhập URL video TikTok' },
          { type: 'url', message: 'URL không hợp lệ' },
        ]}
      >
        <Input placeholder="https://www.tiktok.com/@.../video/..." allowClear />
      </Form.Item>

      <Form.Item
        label={
          <Space>
            <span>Số bình luận tối đa</span>
            <Tooltip title="Gợi ý dùng 30-100 bình luận nếu đang dùng Apify free">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
        name="max_comments"
        rules={[{ required: true, message: 'Chọn số bình luận tối đa' }]}
      >
        <Slider min={10} max={500} step={10} tooltip={{ formatter: (value) => `${value}` }} />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={loading} block>
        Phân tích video bằng PhoBERT
      </Button>
    </Form>
  );
}
