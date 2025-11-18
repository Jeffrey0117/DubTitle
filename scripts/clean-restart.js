const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 專案根目錄
const projectRoot = path.resolve(__dirname, '..');

// 顏色輸出
const log = {
  info: (msg) => console.log(`🧹 ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️ ${msg}`),
  search: (msg) => console.log(`🔍 ${msg}`),
  rocket: (msg) => console.log(`🚀 ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`)
};

// 清理資料夾
function cleanDirectory(dirPath, displayName) {
  const fullPath = path.join(projectRoot, dirPath);

  log.info(`正在清理 ${displayName}...`);

  if (!fs.existsSync(fullPath)) {
    log.warning(`${displayName} 不存在，跳過`);
    return;
  }

  try {
    // Windows 使用 rmdir /s /q
    execSync(`rmdir /s /q "${fullPath}"`, { stdio: 'pipe' });
    log.success(`${displayName} 已清除`);
  } catch (error) {
    log.error(`清除 ${displayName} 失敗: ${error.message}`);
  }
}

// 終止佔用 port 3000 的進程
function killPort3000() {
  log.search('檢查 port 3000...');

  try {
    // 使用 netstat 找出佔用 port 3000 的進程
    const result = execSync('netstat -ano | findstr :3000 | findstr LISTENING', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 解析輸出，取得 PID
    const lines = result.trim().split('\n');
    const pids = new Set();

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    });

    if (pids.size === 0) {
      log.success('port 3000 沒有被佔用');
      return;
    }

    // 終止每個進程
    pids.forEach(pid => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
        log.warning(`終止進程 ${pid}`);
      } catch (err) {
        // 進程可能已經結束
      }
    });

    log.success('port 3000 已釋放');

  } catch (error) {
    // 如果 findstr 沒有找到結果會拋出錯誤，表示 port 沒有被佔用
    log.success('port 3000 沒有被佔用');
  }
}

// 啟動開發伺服器
function startDevServer() {
  log.rocket('啟動開發伺服器...');

  // 使用 spawn 啟動，讓輸出直接顯示在終端
  const child = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (error) => {
    log.error(`啟動失敗: ${error.message}`);
    process.exit(1);
  });
}

// 主函數
function main() {
  const args = process.argv.slice(2);
  const cleanOnly = args.includes('--clean-only');

  console.log('\n========================================');
  console.log('    🔧 Clean Restart Tool for Windows');
  console.log('========================================\n');

  // 清理 .next 資料夾
  cleanDirectory('.next', '.next 資料夾');

  // 清理 node_modules/.cache
  cleanDirectory('node_modules/.cache', 'node_modules/.cache');

  console.log('');

  if (cleanOnly) {
    log.success('清理完成！');
    return;
  }

  // 終止佔用 port 3000 的進程
  killPort3000();

  console.log('');

  // 啟動開發伺服器
  startDevServer();
}

// 執行
main();
