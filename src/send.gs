/**
 * 取得「變數」工作表中指定名稱的變數值。
 * @param {string} key 變數名稱，如「Telegram Token」或「臨時訊息」。
 * @return {any} 對應的變數值，找不到則回傳 null。
 */
function getConfigValue(key) {
  Logger.log("getConfigValue 開始，查找變數：" + key);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName("變數");
  if (!configSheet) {
    Logger.log("找不到「變數」工作表！");
    return null;
  }
  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      Logger.log("找到 " + key + " ：" + data[i][1]);
      return data[i][1];
    }
  }
  Logger.log("變數 " + key + " 未找到");
  return null;
}

/**
 * 檢查訂閱欄位的內容，判斷是否包含與事件運動名稱完全相符的字串。
 * @param {string} subField 訂閱欄位內容，如 "足球,網球"、"電競" 等。
 * @param {string} eventSport 事件的運動種類，如 "足球"。
 * @return {boolean} 若包含則回傳 true，否則 false。
 */
function checkSubscription(subField, eventSport) {
  Logger.log("checkSubscription 開始，比對訂閱欄位值：" + subField + " 與事件運動：" + eventSport);
  if (!subField) return false;
  var tokens = subField.toString().split(",");
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i].trim();
    Logger.log("比對 token: " + token);
    if (token === eventSport) {      
      Logger.log("比對成功，token 與事件運動相符：" + token);
      return true;
    }
  }
  Logger.log("比對結果不符，不含 " + eventSport);
  return false;
}

/**
 * 每15分鐘自動執行的函式：
 * 讀取「Lately」工作表中的賽事資料，根據賽事時間、描述、運動種類與底色決定是否發送通知。
 *
 * 時間規則：賽事時間需落在目前時間的前5分鐘到後10分鐘內（UTC+8時區）。
 *
 * 活動資料格式（工作表 "Lately"）：  
 * Time, Sport, League, HomeTeam, AwayTeam, Desc  
 *
 * 判斷邏輯：  
 * 1. Desc 為「場中」：僅通知訂閱「場中」的用戶。  
 * 2. Desc 為「單場」：僅通知訂閱「單場」的用戶。  
 * 3. Desc 為「單場+場中」：僅視同場中，通知場中訂閱者。  
 *
 * 底色判斷：  
 * 若該活動所在列第一欄背景色為 "#4285F4"，則在訊息末尾加上  
 * "\n本賽事可能是臨時增加，請謹慎"
 *
 * 訊息格式（編碼前）：  
 * 【提醒！】{Sport} {類型} 即將開始：{Time(MM/DD HH:MM)}
 * {League} {HomeTeam} vs {AwayTeam}
 *
 * ※ 時間格式使用 24 小時制並補零（格式：MM/dd HH:mm）。
 */
function autoNotifyEvents() {
  Logger.log("autoNotifyEvents 開始執行");
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var latelySheet = ss.getSheetByName("Lately");
  var subsSheet = ss.getSheetByName("訂閱設定");
  if (!latelySheet || !subsSheet) {
    Logger.log("找不到 Lately 或 訂閱設定 工作表！");
    return;
  }
  
  // 從「變數」工作表讀取 Telegram Bot Token
  var telegramToken = getConfigValue("Telegram Token");
  if (!telegramToken) {
    Logger.log("Telegram Token 未設定！");
    return;
  }
  
  // 取得目前 UTC+8 的時間與時間範圍（前5分鐘 ～ 後10分鐘）
  var now = new Date();
  Logger.log("目前時間：" + now);
  var nowTs = now.getTime();
  var timeWindowStart = nowTs - 1.5 * 60 * 1000;
  var timeWindowEnd   = nowTs + 15 * 60 * 1000;
  Logger.log("時間範圍：" + new Date(timeWindowStart) + " 至 " + new Date(timeWindowEnd));
  
  // 讀取「Lately」工作表的所有活動資料、顯示值及背景色
  var dataRange = latelySheet.getDataRange();
  var allValues = dataRange.getValues();
  var displayValues = dataRange.getDisplayValues();
  var backgrounds = dataRange.getBackgrounds();
  
  Logger.log("Lately 資料列數：" + allValues.length);
  
  // 從第二列開始逐列檢查（第一列為標題）
  for (var i = 1; i < allValues.length; i++) {
    var row = allValues[i];
    var displayRow = displayValues[i];
    Logger.log("處理第 " + (i+1) + " 列： " + JSON.stringify(row));
    if (!row || row.length < 6) {
      Logger.log("資料不完整，跳過該列");
      continue;
    }
    
    var eventTime = row[0],    // 時間欄
        sport = row[1],        // 運動種類
        league = row[2],       // 聯盟或賽事名稱
        homeTeam = row[3],     // 主隊
        awayTeam = row[4],     // 客隊
        desc = row[5];         // 活動描述
    
    // 解析賽事時間取得毫秒值
    var eventTs;
    if (eventTime instanceof Date) {
      eventTs = eventTime.getTime();
    } else {
      eventTs = new Date(eventTime.replace(/-/g, "/")).getTime();
    }
    Logger.log("活動時間： " + eventTime + " 解析後 timestamp：" + eventTs);
    
    // 時間不在範圍內則跳過該活動
    if (!eventTs || eventTs < timeWindowStart || eventTs > timeWindowEnd) {
      Logger.log("該活動時間不在預設範圍內，跳過");
      continue;
    }
    
    // 決定通知類型及顯示用文字
    var notifyCategory = "", typeText = "";
    if (desc === "場中") {
      notifyCategory = "場中";
      typeText = "場中";
    } else if (desc === "單場") {
      notifyCategory = "單場";
      typeText = "單場";
    } else if (desc === "單場+場中") {
      notifyCategory = "場中";
      typeText = "單場+場中";
    } else {
      Logger.log("描述 " + desc + " 不符合規則，跳過");
      continue;
    }
    Logger.log("通知類型設定為：" + notifyCategory + ", 顯示文字：" + typeText);
    
    // 取得活動時間的格式化字串 (24小時制)
    var eventDate = (eventTime instanceof Date) ? eventTime : new Date(eventTs);
    var formattedTime = Utilities.formatDate(eventDate, "GMT+8", "MM/dd HH:mm");
    
    // 詳細記錄背景顏色檢查：抓取該列第一欄的背景顏色
    var cellBackground = backgrounds[i][0];
    Logger.log("第 " + (i+1) + " 列背景顏色為：" + cellBackground);
    var temporaryMsg = "";
    if (cellBackground === "#4285f4") {
      temporaryMsg = "\n⚠️本賽事可能有臨時調整";
      Logger.log("判斷結果：背景顏色符合 #4285f4，因此將加入臨時提示訊息");
    } else {
      Logger.log("判斷結果：背景顏色為"+cellBackground+"，不加入臨時提示訊息");
    }
    
    // 組合完整訊息字串
    var message = "【提醒！】" + sport + " " + typeText + " 即將開始：" + formattedTime + "\n" +
                  league + " " + homeTeam + " vs " + awayTeam + temporaryMsg;
    Logger.log("初始訊息內容：" + message);
    
    // 將訊息字串只編碼一次
    var encodedMessage = encodeURIComponent(message);
    Logger.log("最終訊息(編碼後)：" + encodedMessage);
    
    // 讀取訂閱設定，用來決定哪些用戶需接收此通知
    var subsData = subsSheet.getDataRange().getValues();
    Logger.log("--------------------------\n訂閱設定用戶數：" + subsData.length);
    for (var j = 1; j < subsData.length; j++) {  // 從第二列開始（第一列為標題）
      var userRow = subsData[j];
      if (!userRow || userRow.length < 5) continue;
      
      var userId = userRow[1],
          subSingle = userRow[3],
          subLive = userRow[4];
      
      var notifyThisUser = false;
      if (notifyCategory === "單場" && checkSubscription(subSingle, sport)) {
        notifyThisUser = true;
      } else if (notifyCategory === "場中" && checkSubscription(subLive, sport)) {
        notifyThisUser = true;
      }
      
      if (notifyThisUser && userId) {
        Logger.log("發送訊息給用戶 " + userId + "，其訂閱內容符合運動：" + sport);
        var url = "https://api.telegram.org/bot" + telegramToken + "/sendMessage?chat_id=" + userId + "&text=" + encodedMessage;
        Logger.log("API URL: " + url);
        UrlFetchApp.fetch(url);
      } else {
        Logger.log("用戶 " + userId + " 不符合通知條件或用戶ID缺失");
      }
    }
  }
  
  Logger.log("autoNotifyEvents 執行結束");
}

/**
 * 手動廣播訊息函式：
 * 從「變數」工作表讀取臨時訊息內容，傳送給所有訂閱用戶。
 */
function sendManualBroadcast() {
  Logger.log("sendManualBroadcast 開始執行");
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var subsSheet = ss.getSheetByName("訂閱設定");
  if (!subsSheet) {
    Logger.log("找不到 訂閱設定 工作表！");
    return;
  }
  
  // 讀取 Telegram Bot Token 與臨時訊息
  var telegramToken = getConfigValue("Telegram Token");
  var broadcastMessage = getConfigValue("臨時訊息");
  if (!telegramToken || !broadcastMessage) {
    Logger.log("廣播訊息或 Telegram Token 未設定！");
    return;
  }
  
  var subsData = subsSheet.getDataRange().getValues();
  var encodedMsg = encodeURIComponent(broadcastMessage);
  Logger.log("廣播訊息內容(編碼後)：" + encodedMsg);
  
  for (var i = 1; i < subsData.length; i++) { // 跳過標題列
    var userRow = subsData[i];
    if (!userRow || userRow.length < 2) continue;
    var userId = userRow[1];
    if (userId) {
      var url = "https://api.telegram.org/bot" + telegramToken + "/sendMessage?chat_id=" + userId + "&text=" + encodedMsg;
      Logger.log("發送廣播訊息給用戶 " + userId + "，API URL: " + url);
      UrlFetchApp.fetch(url);
    } else {
      Logger.log("用戶ID缺失，無法發送廣播訊息");
    }
  }
  
  Logger.log("sendManualBroadcast 執行結束");
}
