# 快速指引配置說明

## 📝 檔案位置

快速指引的所有內容現在都存放在 **`guide-config.js`** 檔案中，企劃人員可以直接修改此檔案來更新遊戲說明。

## 🎯 如何修改

### 1. 修改標題
```javascript
title: "快速指引",  // 改成你想要的標題
```

### 2. 修改開場說明
```javascript
intro: "右側圖鑑讓你在遊戲開始前就知道每位勇者的能力與敵人的樣貌。",
```

### 3. 新增/修改角色或物品說明

在 `items` 陣列中，每個項目包含：
- `image`: 圖片檔名（例如 "leader.png"）
- `alt`: 圖片替代文字（用於無障礙）
- `name`: 角色/物品名稱
- `description`: 說明文字

**範例：新增一個角色**
```javascript
{
  image: "new-hero.png",
  alt: "新角色圖示",
  name: "新角色",
  description: "這是新角色的說明文字。"
}
```

**範例：修改現有角色說明**
```javascript
{
  image: "leader.png",
  alt: "隊長圖示",
  name: "隊長",
  description: "修改後的說明文字。"
}
```

### 4. 修改操作提示
```javascript
tip: "操作方式：WASD / 方向鍵控制；保持隊伍迴旋可避開敵人。",
```

## ⚠️ 注意事項

1. **圖片路徑**：圖片檔名必須與專案根目錄中的實際檔案名稱一致
2. **JSON 格式**：修改時請注意逗號和引號的正確使用
3. **文字長度**：建議說明文字不要太長，避免版面過於擁擠
4. **重新整理**：修改後請重新整理瀏覽器頁面以看到更新

## 📋 完整結構範例

```javascript
window.GUIDE_CONFIG = {
  title: "快速指引",
  intro: "開場說明文字",
  items: [
    {
      image: "leader.png",
      alt: "隊長圖示",
      name: "隊長",
      description: "說明文字"
    },
    // ... 更多項目
  ],
  tip: "操作提示文字"
};
```

