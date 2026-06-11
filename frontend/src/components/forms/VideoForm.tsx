import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Slider, Space, Tooltip } from 'antd';
import type { FormProps } from 'antd';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import type { VideoAnalysisPayload } from '@/types/analysis';

interface VideoFormProps {
  loading?: boolean;
  initialValues?: Partial<VideoAnalysisPayload>;
  apifyConfigured?: boolean;
  onSubmit: (values: VideoAnalysisPayload) => void | Promise<void>;
}

interface VideoFormValues extends VideoAnalysisPayload {}

export default function VideoForm({ loading = false, initialValues, apifyConfigured = false, onSubmit }: VideoFormProps) {
  const [form] = Form.useForm<VideoFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      max_comments: 50,
      model: 'phobert',
      ...initialValues,
      apify_token: apifyConfigured ? undefined : initialValues?.apify_token,
    });
  }, [form, initialValues, apifyConfigured]);

  const handleValuesChange: FormProps<VideoFormValues>['onValuesChange'] = () => undefined;

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit} onValuesChange={handleValuesChange}>
      <Form.Item name="model" hidden initialValue="phobert">
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

      {!apifyConfigured ? (
        <Form.Item
          label="Apify Token tạm thời"
          name="apify_token"
          rules={[{ required: true, message: 'Backend chưa có APIFY_API_TOKEN, hãy nhập token tạm thời' }]}
          extra="Khuyến nghị: cấu hình APIFY_API_TOKEN trong .env backend để không nhập token trên giao diện."
        >
          <PasswordInput placeholder="apify_api_xxx" visibilityToggle={false} allowClear autoComplete="off" />
        </Form.Item>
      ) : null}

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
