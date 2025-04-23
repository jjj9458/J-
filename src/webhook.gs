// 功能: Webhook 相關設定與管理

/**
 * 功能: 驗證 Webhook 是否正常運作
 */
function doGet(e) {
  return ContentService.createTextOutput('Webhook 連線正常')
           .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 功能: 設定 Telegram Webhook
 */
function setWebhook() {
  ensureSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var varSheet = ss.getSheetByName("變數");
  var token = "";
  var webAppUrl = "";
  var values = varSheet.getDataRange().getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === "Telegram Token" && values[i][1]) {
      token = values[i][1];
    }
    if (values[i][0] === "Webhook URL" && values[i][1]) {
      webAppUrl = values[i][1];
    }
  }
  if (!token || !webAppUrl) {
    Logger.log("請先在【變數】工作表填入 Telegram Token 與 Webhook URL。");
    return;
  }
  try {
    var deleteUrl = "https://api.telegram.org/bot" + token + "/deleteWebhook?drop_pending_updates=true";
    UrlFetchApp.fetch(deleteUrl);
    var setUrl = "https://api.telegram.org/bot" + token + "/setWebhook?url=" + encodeURIComponent(webAppUrl);
    UrlFetchApp.fetch(setUrl);
    Logger.log("setWebhook 完成");
  } catch (error) {
    Logger.log("setWebhook 錯誤：" + error);
  }
}

/**
 * 功能: 檢查目前 Webhook 狀態
 */
function checkWebhookStatus() {
  ensureSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var varSheet = ss.getSheetByName("變數");
  var token = "";
  var values = varSheet.getDataRange().getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === "Telegram Token" && values[i][1]) {
      token = values[i][1];
      break;
    }
  }
  if (!token) {
    Logger.log("請在【變數】工作表填入 Telegram Token。");
    return;
  }
  var infoUrl = "https://api.telegram.org/bot" + token + "/getWebhookInfo";
  try {
    var response = UrlFetchApp.fetch(infoUrl);
    var info = JSON.parse(response.getContentText());
    if (info.ok) {
      var result = info.result;
      Logger.log("Webhook URL: " + (result.url || "(未設定)"));
      Logger.log("等待中更新數量: " + result.pending_update_count);
      if (result.last_error_date) {
        var errDate = new Date(result.last_error_date * 1000);
        Logger.log("最後錯誤時間: " + errDate.toLocaleString());
        Logger.log("最後錯誤訊息: " + result.last_error_message);
      } else {
        Logger.log("Webhook 狀態正常，無錯誤。");
      }
    } else {
      Logger.log("取得 Webhook 狀態失敗：" + info.description);
    }
  } catch (error) {
    Logger.log("checkWebhookStatus 錯誤：" + error);
  }
}

/**
 * 功能: 清除待處理更新（並移除 Webhook）
 */
function clearPendingUpdates() {
  ensureSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var varSheet = ss.getSheetByName("變數");
  var token = "";
  var values = varSheet.getDataRange().getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === "Telegram Token" && values[i][1]) {
      token = values[i][1];
      break;
    }
  }
  if (!token) {
    Logger.log("請在【變數】工作表填入 Telegram Token。");
    return;
  }
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/deleteWebhook?drop_pending_updates=true");
    Logger.log("Pending updates 已清除，請重新執行 setWebhook()");
  } catch (error) {
    Logger.log("clearPendingUpdates 錯誤：" + error);
  }
}