/**
 * スプレッドシート初期セットアップスクリプト
 *
 * 実行方法:
 * 1. Google Apps Scriptエディタでこのコードを新しいファイルとして追加
 * 2. setupSpreadsheet() 関数を実行
 * 3. 必要な権限を承認
 */

// グローバル変数の重複を避けるため、関数内で定義
function getSpreadsheetId() {
  return '1MaCsDpwYOtNn8hqywq300hThzMIXOhPnkS6LvcUskuk';
}

/**
 * スプレッドシートの初期セットアップを実行
 */
function setupSpreadsheet() {
  try {
    const ss = SpreadsheetApp.openById(getSpreadsheetId());

    // 既存のシートをすべて削除（デフォルトのシート1以外）
    const sheets = ss.getSheets();
    console.log('既存シート数:', sheets.length);

    // 必要な3つのシートを作成
    createTraineeMasterSheet(ss);
    createAttendanceSheet(ss);
    createTaskCompleteSheet(ss);

    // 不要なデフォルトシートを削除
    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      if (sheetName !== '研修生マスタ' &&
          sheetName !== '打刻記録' &&
          sheetName !== '課題完了記録') {
        ss.deleteSheet(sheet);
        console.log('削除したシート:', sheetName);
      }
    });

    console.log('✅ スプレッドシートのセットアップが完了しました');
    console.log('📊 作成されたシート:');
    console.log('  - 研修生マスタ');
    console.log('  - 打刻記録');
    console.log('  - 課題完了記録');

    // スプレッドシートを開く
    const url = ss.getUrl();
    console.log('🔗 スプレッドシートURL:', url);

    return {
      success: true,
      url: url,
      sheets: ['研修生マスタ', '打刻記録', '課題完了記録']
    };

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

/**
 * 研修生マスタシートを作成
 */
function createTraineeMasterSheet(ss) {
  const sheetName = '研修生マスタ';

  // 既存シートがあれば削除
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
    console.log('既存の' + sheetName + 'を削除しました');
  }

  // 新規作成
  sheet = ss.insertSheet(sheetName);

  // ヘッダー行を設定
  const headers = ['研修生ID', '氏名', 'ステータス'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ヘッダーのスタイル設定
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // サンプルデータを追加
  const sampleData = [
    ['user01', 'あなたの名前', '進行中']
  ];
  sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);

  // 列幅を調整
  sheet.setColumnWidth(1, 120); // 研修生ID
  sheet.setColumnWidth(2, 150); // 氏名
  sheet.setColumnWidth(3, 100); // ステータス

  // グリッド線を表示
  sheet.setFrozenRows(1); // ヘッダー行を固定

  console.log('✅ ' + sheetName + 'を作成しました');
}

/**
 * 打刻記録シートを作成
 */
function createAttendanceSheet(ss) {
  const sheetName = '打刻記録';

  // 既存シートがあれば削除
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
    console.log('既存の' + sheetName + 'を削除しました');
  }

  // 新規作成
  sheet = ss.insertSheet(sheetName);

  // ヘッダー行を設定
  const headers = ['日付', '研修生ID', '氏名', '出勤時刻', '退勤時刻', '勤務時間'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ヘッダーのスタイル設定
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#5CB85C');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 列幅を調整
  sheet.setColumnWidth(1, 120); // 日付
  sheet.setColumnWidth(2, 120); // 研修生ID
  sheet.setColumnWidth(3, 150); // 氏名
  sheet.setColumnWidth(4, 100); // 出勤時刻
  sheet.setColumnWidth(5, 100); // 退勤時刻
  sheet.setColumnWidth(6, 120); // 勤務時間

  // データの書式設定
  sheet.getRange('A2:A1000').setNumberFormat('yyyy-mm-dd'); // 日付列

  // グリッド線を表示
  sheet.setFrozenRows(1); // ヘッダー行を固定

  console.log('✅ ' + sheetName + 'を作成しました');
}

/**
 * 課題完了記録シートを作成
 */
function createTaskCompleteSheet(ss) {
  const sheetName = '課題完了記録';

  // 既存シートがあれば削除
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
    console.log('既存の' + sheetName + 'を削除しました');
  }

  // 新規作成
  sheet = ss.insertSheet(sheetName);

  // ヘッダー行を設定
  const headers = ['完了日時', '研修生ID', '氏名', 'アプリURL', '判定'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ヘッダーのスタイル設定
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#F0AD4E');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 列幅を調整
  sheet.setColumnWidth(1, 180); // 完了日時
  sheet.setColumnWidth(2, 120); // 研修生ID
  sheet.setColumnWidth(3, 150); // 氏名
  sheet.setColumnWidth(4, 400); // アプリURL
  sheet.setColumnWidth(5, 100); // 判定

  // データの書式設定
  sheet.getRange('E2:E1000').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['合格', '不合格', '保留'])
      .setAllowInvalid(false)
      .build()
  ); // 判定列にドロップダウンを追加

  // グリッド線を表示
  sheet.setFrozenRows(1); // ヘッダー行を固定

  console.log('✅ ' + sheetName + 'を作成しました');
}

/**
 * 既存データを削除して初期化
 */
function clearAllData() {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());

  const sheetNames = ['研修生マスタ', '打刻記録', '課題完了記録'];

  sheetNames.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        console.log(sheetName + 'のデータを削除しました');
      }
    }
  });

  // 研修生マスタにサンプルデータを再追加
  const masterSheet = ss.getSheetByName('研修生マスタ');
  if (masterSheet) {
    masterSheet.getRange(2, 1, 1, 3).setValues([
      ['user01', 'あなたの名前', '進行中']
    ]);
  }

  console.log('✅ すべてのデータを削除しました');
}

/**
 * シート構成を確認
 */
function checkSheets() {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const sheets = ss.getSheets();

  console.log('📊 現在のシート構成:');
  sheets.forEach(sheet => {
    const name = sheet.getName();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    console.log(`  - ${name} (${lastRow}行 x ${lastCol}列)`);
  });

  const requiredSheets = ['研修生マスタ', '打刻記録', '課題完了記録'];
  const missingSheets = requiredSheets.filter(name => !ss.getSheetByName(name));

  if (missingSheets.length > 0) {
    console.log('⚠️  不足しているシート:', missingSheets.join(', '));
    return false;
  } else {
    console.log('✅ すべての必須シートが存在します');
    return true;
  }
}
