// 測試腳本：驗證詞彙分析 API
// 用法: node test-vocabulary-api.js

const testAPI = async () => {
  const testCases = [
    {
      videoId: 'test123',
      subtitleIndex: 0,
      text: 'This is a sophisticated algorithm that demonstrates the efficacy of our approach.',
    },
    {
      videoId: 'test123',
      subtitleIndex: 1,
      text: 'The quick brown fox jumps.',
    },
    {
      videoId: 'test123',
      subtitleIndex: 2,
      text: 'Hi',
    },
  ];

  console.log('開始測試詞彙分析 API...\n');

  for (const testCase of testCases) {
    console.log(`\n測試 ${testCase.subtitleIndex + 1}:`);
    console.log(`文本: "${testCase.text}"`);
    console.log(`長度: ${testCase.text.length} 字符`);

    try {
      const response = await fetch('http://localhost:3000/api/analyze-vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ 成功 - 狀態: ${response.status}`);
        console.log(`難字數量: ${data.vocabulary?.length || 0}`);
        if (data.vocabulary && data.vocabulary.length > 0) {
          console.log('難字列表:');
          data.vocabulary.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.word} - ${item.translation}`);
          });
        } else {
          console.log('沒有找到難字');
        }
      } else {
        console.log(`❌ 失敗 - 狀態: ${response.status}`);
        console.log(`錯誤: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ 請求失敗: ${error.message}`);
    }
  }

  console.log('\n測試完成！');
};

// 檢查開發服務器是否運行
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch {
    return false;
  }
};

(async () => {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('❌ 開發服務器未運行！');
    console.log('請先運行: npm run dev');
    process.exit(1);
  }

  await testAPI();
})();
