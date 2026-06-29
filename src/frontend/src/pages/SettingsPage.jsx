import { useState } from 'react';
import Card from '@/components/shared/Card';
import { toastSuccess } from '@/utils/toast';

export default function SettingsPage() {
  const [defaultModel, setDefaultModel] = useState(localStorage.getItem('default_model') || 'phobert');
  const [defaultComments, setDefaultComments] = useState(Number(localStorage.getItem('default_comments') || 50));

  const handleSave = () => {
    localStorage.setItem('default_model', defaultModel);
    localStorage.setItem('default_comments', String(defaultComments));
    toastSuccess('Đã lưu cài đặt hiển thị');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-800">Cài đặt bảo mật API</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Không nên lưu Apify Token hoặc Gemini API Key trong trình duyệt. Hãy đặt các khóa này trong file
          <code className="mx-1 rounded bg-slate-100 px-2 py-1">.env</code>
          của backend để frontend chỉ gửi URL, username và số lượng cần crawl.
        </p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Cấu hình khuyến nghị:</p>
          <pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
{`APIFY_API_TOKEN=apify_api_xxx
GEMINI_API_KEY=...
PHOBERT_MODEL_PATH=./models/phobert-sentiment`}
          </pre>
          <p className="mt-3 text-slate-600">
            Sau khi sửa `.env`, khởi động lại backend để `/health` nhận trạng thái Apify đã cấu hình.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-800">Cài đặt giao diện</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Model mặc định</label>
            <select
              value={defaultModel}
              onChange={(event) => setDefaultModel(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="phobert">PhoBERT</option>
              <option value="auto">Tự động</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Số bình luận mặc định</label>
            <input
              type="number"
              min={10}
              max={500}
              value={defaultComments}
              onChange={(event) => setDefaultComments(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
        </div>
        <button type="button" onClick={handleSave} className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white">
          Lưu cài đặt
        </button>
      </Card>
    </div>
  );
}
