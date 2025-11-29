/**
 * 勤怠管理アプリ - Google Apps Script
 * スプレッドシートID: 1MaCsDpwYOtNn8hqywq300hThzMIXOhPnkS6LvcUskuk
 */

const SPREADSHEET_ID = '1MaCsDpwYOtNn8hqywq300hThzMIXOhPnkS6LvcUskuk';
const SHEET_NAMES = {
  TRAINEE_MASTER: '研修生マスタ',
  ATTENDANCE: '打刻記録',
  TASK_COMPLETE: '課題完了記録'
};

// LINE Messaging API設定
const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * POSTリクエストを受け取る
 */
function doPost(e) {
  try {
    console.log('========================================');
    console.log('📥 リクエスト受信:', new Date().toLocaleString('ja-JP'));

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('リクエストデータが不正です');
    }

    const data = JSON.parse(e.postData.contents);
    console.log('📦 受信データ:', JSON.stringify(data, null, 2));

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('📊 スプレッドシートを開きました:', ss.getName());

    switch (data.action) {
      case 'clockIn':
        console.log('⏰ 出勤打刻を処理します');
        handleClockIn(ss, data);
        break;
      case 'clockOut':
        console.log('🏠 退勤打刻を処理します');
        handleClockOut(ss, data);
        break;
      case 'taskComplete':
        console.log('✅ 課題完了を処理します');
        handleTaskComplete(ss, data);
        break;
      default:
        throw new Error('不明なアクション: ' + data.action);
    }

    console.log('✅ 処理完了');
    console.log('========================================');

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, timestamp: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('❌ エラー発生:', error.message);
    console.error('スタックトレース:', error.stack);
    console.log('========================================');

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 出勤打刻を記録
 */
function handleClockIn(ss, data) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);

  if (!sheet) {
    throw new Error('打刻記録シートが見つかりません');
  }

  // 最終行を取得
  const lastRow = sheet.getLastRow();
  let existingRow = -1;

  // データ行がある場合のみ検索を行う
  if (lastRow > 1) {
    // 同じ日付の出勤記録があるかチェック
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    existingRow = dataRange.findIndex(row =>
      row[0] === data.date &&
      row[1] === data.userId &&
      row[3] !== '' // 出勤時刻がある
    );
  }

  if (existingRow !== -1) {
    console.log('既に出勤記録があります');
    // 既存の行を更新（出勤時刻のみ更新）
    sheet.getRange(existingRow + 2, 4).setValue(data.clockInTime);
  } else {
    // 新規行を追加
    sheet.appendRow([
      data.date,
      data.userId,
      data.userName,
      data.clockInTime,
      '', // 退勤時刻
      '勤務中'  // 勤務時間
    ]);
  }

  // LINE通知
  const message = `【出勤】\n${data.userName}\n${data.date.replace(/-/g, '/')} ${data.clockInTime}`;
  sendLineMessage(message);
}

/**
 * 退勤打刻を記録
 */
function handleClockOut(ss, data) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);

  if (!sheet) {
    throw new Error('打刻記録シートが見つかりません');
  }

  const lastRow = sheet.getLastRow();
  let existingRowIndex = -1;

  // データ行がある場合のみ検索を行う
  if (lastRow > 1) {
    // ユーザーの最新の「退勤していない」記録を探す（後ろから検索）
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    for (let i = dataRange.length - 1; i >= 0; i--) {
      const row = dataRange[i];
      // ユーザーIDが一致 かつ 退勤時刻(index 4)が空
      if (row[1] === data.userId && row[4] === '') {
        existingRowIndex = i;
        break;
      }
    }
  }

  if (existingRowIndex !== -1) {
    // 既存の行を更新
    const rowNumber = existingRowIndex + 2;
    sheet.getRange(rowNumber, 5).setValue(data.clockOutTime); // 退勤時刻
    sheet.getRange(rowNumber, 6).setValue(data.workDuration); // 勤務時間
  } else {
    // 出勤記録がない場合は新規追加（例外的なケース）
    sheet.appendRow([
      data.date,
      data.userId,
      data.userName,
      data.clockInTime,
      data.clockOutTime,
      data.workDuration
    ]);
  }

  // LINE通知
  const message = `【退勤】\n${data.userName}\n出勤：${data.clockInTime}\n退勤：${data.clockOutTime}\n勤務：${data.workDuration}`;
  sendLineMessage(message);
}

/**
 * 課題完了を記録
 */
function handleTaskComplete(ss, data) {
  const sheet = ss.getSheetByName(SHEET_NAMES.TASK_COMPLETE);

  if (!sheet) {
    throw new Error('課題完了記録シートが見つかりません');
  }

  // 課題完了記録を追加
  sheet.appendRow([
    data.completedAt,
    data.userId,
    data.userName,
    data.appUrl,
    '合格' // 判定列（デフォルトで合格）
  ]);

  // 研修生マスタのステータスを更新
  updateTraineeStatus(ss, data.userId, '完了');

  // LINE通知
  const message = `【🎉課題完了報告🎉】\n研修生：${data.userName}（${data.userId}）\n完了：${data.completedAt}\n\nアプリURL:\n${data.appUrl}\n\n確認をお願いします！`;
  sendLineMessage(message);
}

/**
 * 研修生マスタのステータスを更新
 */
function updateTraineeStatus(ss, userId, status) {
  const sheet = ss.getSheetByName(SHEET_NAMES.TRAINEE_MASTER);

  if (!sheet) {
    console.warn('研修生マスタシートが見つかりません');
    return;
  }

  const lastRow = sheet.getLastRow();

  // データ行がない場合は何もしない
  if (lastRow <= 1) {
    console.warn('研修生マスタにデータがありません');
    return;
  }

  const dataRange = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

  const userRowIndex = dataRange.findIndex(row => row[0] === userId);

  if (userRowIndex !== -1) {
    // ステータスを更新
    sheet.getRange(userRowIndex + 2, 3).setValue(status);
  } else {
    console.warn('研修生マスタにユーザーが見つかりません:', userId);
  }
}

/**
 * LINEにメッセージを送信する
 */
function sendLineMessage(messageText) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const accessToken = scriptProperties.getProperty('LINE_ACCESS_TOKEN');
  const groupId = scriptProperties.getProperty('LINE_GROUP_ID');

  if (!accessToken || !groupId) {
    console.warn('LINE通知設定（スクリプトプロパティ）が不足しています');
    return;
  }

  const payload = {
    to: groupId,
    messages: [
      {
        type: 'text',
        text: messageText
      }
    ]
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(LINE_API_URL, options);
    console.log('LINE通知送信:', response.getResponseCode(), response.getContentText());
  } catch (e) {
    console.error('LINE通知送信エラー:', e);
  }
}

/**
 * スクリプトプロパティ設定用関数（初回のみ実行）
 * 実行後、この関数内の値は削除することを推奨します
 */
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    'LINE_ACCESS_TOKEN': 'gwKw29HGCgZ/PM24eomFs8gaKD6q9UGnOS3/ZaAp9QK9IxPSVDnCT5HWjAfYA2XFEUPh2gmzP8KRAihvaBL6vpVFO5t687zhdBXC5fYjYnaITRfPEmowhPWrYEOTx+04Mi/yFoKKMs/GyAb98hQmwAdB04t89/1O/w1cDnyilFU=',
    // ⚠️ 注意: ユーザーID(U...) または グループID(C...) を設定してください
    // チャンネルID(数値)では通知が届かない場合があります
    'LINE_GROUP_ID': 'C4287d8c3ffc1c5aed156ab127d45093f'
  });
  console.log('✅ スクリプトプロパティを設定しました');
}

/**
 * テスト用関数
 */
function testClockIn() {
  const testData = {
    action: 'clockIn',
    userId: 'user01',
    userName: 'テストユーザー',
    date: '2025-11-29',
    clockInTime: '09:00'
  };

  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  const result = doPost(e);
  console.log(result.getContent());
}

function testClockOut() {
  const testData = {
    action: 'clockOut',
    userId: 'user01',
    userName: 'テストユーザー',
    date: '2025-11-29',
    clockInTime: '09:00',
    clockOutTime: '18:00',
    workDuration: '9時間0分'
  };

  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  const result = doPost(e);
  console.log(result.getContent());
}

function testTaskComplete() {
  const testData = {
    action: 'taskComplete',
    userId: 'user01',
    userName: 'テストユーザー',
    completedAt: '2025/11/29 18:30',
    appUrl: 'https://example.com/app'
  };

  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  const result = doPost(e);
  console.log(result.getContent());
}
