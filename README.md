# 心理治療預約系統

這是一個使用React開發的心理治療預約系統前端專案。

## 技術棧

- React
- Material UI
- Vite
- Axios
- Date-fns

## 安裝與運行

### 本地開發

1. 安裝依賴：
   ```
   npm install
   ```

2. 運行開發服務器：
   ```
   npm run dev
   ```

### 建置生產環境版本

```
npm run build
```

生成的文件將位於 `dist` 目錄中。

## 環境變數配置

請在專案根目錄創建 `.env` 文件（或在部署環境中設置環境變數）：

```
# API設定
VITE_API_BASE_URL=http://your-api-server-url
```

公開註冊只會建立患者帳號；治療師及管理員角色須由現有管理員透過後端用戶管理 API 指派。部署後應檢查既有帳號的角色，並確認後端設定了強且保密的 `JWT_SECRET`；未設定時現有後端會使用不安全的預設備援金鑰。

### 重要注意事項

- 如果在Zeabur或其他雲服務部署，務必在環境設置中配置 `VITE_API_BASE_URL`，指向後端服務的URL
- 不設置此變數將導致API調用失敗

## 版本相容性問題

本專案使用以下關鍵依賴的特定版本：

- @mui/x-date-pickers: ^8.2.0
- date-fns: ^3.6.0

**重要:** 如果更新這些庫時請確保版本相容。日期選擇器組件需要date-fns v3+才能正常工作。

## 目錄結構

- `src/components` - 可重用的UI組件
- `src/context` - React上下文（如身份驗證）
- `src/pages` - 頁面組件
- `src/services` - API服務與工具函數
- `src/assets` - 靜態資源（圖像等） 