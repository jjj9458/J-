// 功能: 訂閱通知相關功能

/**
 * 功能: 啟動訂閱流程
 */
function handleSubscriptionStart(chatId, userId) {
  PropertiesService.getScriptProperties().setProperty("state_" + userId, "subscribe_main");
  sendMessage(chatId, "請選擇你要訂閱的類型：", getSubscribeMainMenu());
}

/******************************************************
 * 功能: 處理訂閱互動流程
 * 更新說明
 * handleSubscription(userId, userName, chatId, text, msgId)：
 * 處理「訂閱通知」互動選單流程，
 * 根據使用者在訂閱流程中的狀態及選擇，更新暫存設定 (利用 PropertiesService)，
 * 最終將設定寫入訂閱設定工作表。
 ******************************************************/
function handleSubscription(userId, userName, chatId, text, msgId) {
  var stateKey            = "state_" + userId;
  var currentState        = PropertiesService.getScriptProperties().getProperty(stateKey);
  var replyText           = "";
  var replyMarkup         = null;
  var subSelectionKey     = "sub_" + userId;
  var currentSelection    = PropertiesService.getScriptProperties().getProperty(subSelectionKey);
  var subConfig           = currentSelection ? JSON.parse(currentSelection) : { "單場": [], "場中": [] };
  var validSports         = ["足球", "籃球", "網球", "冰球", "棒球", "電競", "其他"];
  var cate = "";

  if (currentState === "subscribe_main") {
    if (text === "單場" || text === "場中") {
      cate = text;
      PropertiesService.getScriptProperties().setProperty(stateKey, "subscribe_" + cate);
      // 同步現有設定
      var sheetSubs = getUserSubscriptionFromSheet(userId);
      subConfig["單場"] = sheetSubs.single;
      subConfig["場中"] = sheetSubs.half;
      PropertiesService.getScriptProperties().setProperty(subSelectionKey, JSON.stringify(subConfig));
      var currentSubs = subConfig[cate].length ? subConfig[cate].join("、") : "無";
      replyText = "請選擇項目（點擊選項可加入／移除）\n" + cate + "目前已訂閱項目：" + currentSubs +
                  "\n\n【【全部清除】　　清空已選擇項目\n【完成並儲存】　儲存設定\n【返回】　　　　返回上一層" +
                  "\n\n*點擊返回將不會儲存本次設定";
      replyMarkup = getSubscribeDetailMenu(cate);
    }
    else if (text === "返回主選單") {
      PropertiesService.getScriptProperties().deleteProperty(stateKey);
      PropertiesService.getScriptProperties().deleteProperty(subSelectionKey);
      replyText = "返回主選單";
      replyMarkup = getMainMenu();
    }
    else {
      replyText   = "⚠️ 選單開啟中無法使用預設指令，請先完成操作或 /menu 回主選單。";
      replyMarkup = getSubscribeMainMenu();
    }
  }
  else if (currentState.startsWith("subscribe_")) {
    cate = currentState.split("_")[1];
    if (validSports.includes(text)) {
      var arr   = subConfig[cate];
      var idx   = arr.indexOf(text);
      if (idx === -1) {
        arr.push(text);
        replyText = "已加入" + text;
      } else {
        arr.splice(idx, 1);
        replyText = "已移除" + text;
      }
      subConfig[cate] = arr.filter(s => validSports.includes(s));
      PropertiesService.getScriptProperties().setProperty(subSelectionKey, JSON.stringify(subConfig));
      replyText += "\n\n目前已訂閱：" + (subConfig[cate].length ? subConfig[cate].join("、") : "無");
      replyMarkup = getSubscribeDetailMenu(cate);
    }
    else if (text === "全部清除") {
      subConfig[cate] = [];
      PropertiesService.getScriptProperties().setProperty(subSelectionKey, JSON.stringify(subConfig));
      replyText   = "已取消所有" + cate + "選項。\n請點擊完成並儲存完成儲存";
      replyMarkup = getSubscribeDetailMenu(cate);
    }
    else if (text === "完成並儲存") {
      saveSubscription(userId, userName, subConfig);
      // 呼叫 formatSubscriptionOverview 回傳後兩行訂閱總覽
      replyText = "✅ 已儲存項目\n" + formatSubscriptionOverview(subConfig);
      replyMarkup = getSubscribeMainMenu();
      PropertiesService.getScriptProperties().setProperty(stateKey, "subscribe_main");
    }
    else if (text === "返回") {
      replyText = "已返回上一層 (⚠️本次設定未儲存)\n" + formatSubscriptionOverview(subConfig);
      replyMarkup = getSubscribeMainMenu();
      PropertiesService.getScriptProperties().setProperty(stateKey, "subscribe_main");
    }
    else {
      replyText   = "⚠️ 選單開啟中無法使用預設指令，請先完成操作或 /menu 回主選單。";
      replyMarkup = getSubscribeDetailMenu(cate);
    }
  }

  var sentMessage = sendMessage(chatId, replyText, replyMarkup);
  if (sentMessage) {
    logMessage("發送", userId, userName, replyText, sentMessage.message_id);
  }
  return HtmlService.createHtmlOutput('OK');
}

/******************************************************
 * 更新說明
 * querySubscription(userId)：
 * 查詢訂閱設定工作表中該用戶的記錄，回覆已訂閱種類內容
 ******************************************************/
function querySubscription(userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SUBSCRIBE);
  var data = sheet.getDataRange().getValues();
  var result = "";
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == userId) {
      var single = data[i][3] || "";
      var half = data[i][4] || "";
      result = "您的訂閱項目：\n單場：" + (single ? single : "無") + "\n場中：" + (half ? half : "無");
      break;
    }
  }
  if (result === "") {
    result = "您尚未訂閱任何項目。";
  }
  Logger.log("查詢訂閱：" + result);
  return result;
}

/******************************************************
 * 更新說明
 * clearSubscription(userId)：
 * 清除訂閱設定工作表中該用戶的訂閱記錄，並回覆操作結果訊息
 ******************************************************/
function clearSubscription(userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("訂閱設定");
  var data = sheet.getDataRange().getValues();
  var cleared = false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == userId) {
      sheet.getRange(i + 1, 4).setValue("");
      sheet.getRange(i + 1, 5).setValue("");
      cleared = true;
      break;
    }
  }

  // ★★★ 重要：同時清除暫存設定 ★★★
  var subSelectionKey = "sub_" + userId;
  PropertiesService.getScriptProperties().deleteProperty(subSelectionKey);

  Logger.log("清除用戶 (" + userId + ") 的訂閱設定與暫存。");
  return cleared ? "訂閱設定已清除。" : "您尚未訂閱任何項目。";
}

function saveSubscription(userId, userName, subConfig) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("訂閱設定");

  if (!sheet) {
    sheet = ss.insertSheet("訂閱設定");
    sheet.appendRow(["時間", "用戶ID", "用戶名稱", "訂閱單場", "訂閱場中"]);
  }

  var data = sheet.getDataRange().getValues();
  var found = false;
  var single = subConfig["單場"].filter(Boolean).join(",");
  var half = subConfig["場中"].filter(Boolean).join(",");

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == userId) {
      sheet.getRange(i + 1, 4).setValue(single);
      sheet.getRange(i + 1, 5).setValue(half);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([new Date(), userId, userName, single, half]);
  }

  Logger.log("成功儲存用戶(" + userId + ")的訂閱：" + JSON.stringify(subConfig));
}

// 從工作表取得最新訂閱設定
function getUserSubscriptionFromSheet(userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("訂閱設定");
  var data = sheet.getDataRange().getValues();
  var result = { single: [], half: [] };

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == userId) {
      result.single = data[i][3] ? data[i][3].split(",") : [];
      result.half = data[i][4] ? data[i][4].split(",") : [];
      break;
    }
  }
  return result;
}

// 產生訂閱通知主選單，讓使用者選擇 "單場" 或 "場中" 或返回主選單
function getSubscribeMainMenu() {
  return {
    "keyboard": [
      [ { "text": "單場" }, { "text": "場中" } ],
      [ { "text": "返回主選單" } ]
    ],
    "resize_keyboard": true,
    "one_time_keyboard": false
  };
}

// 產生詳盡的訂閱選單（單場或場中），包含各運動選項及控制按鈕：全部清除、完成並儲存、返回
function getSubscribeDetailMenu(category) {
  var sports = ["足球", "籃球", "網球", "冰球", "棒球", "電競", "其他"];
  var keyboard = [sports.map(function(s) { return { "text": s }; })];
  keyboard.push([
    { "text": "全部清除" },
    { "text": "完成並儲存" },
    { "text": "返回" }
  ]);
  return {
    "keyboard": keyboard,
    "resize_keyboard": true,
    "one_time_keyboard": false
  };
}

/*更新說明: 新增格式化訂閱總覽的輔助函數*/
function formatSubscriptionOverview(subConfig) {
  var singleSubs = subConfig["單場"].length
    ? subConfig["單場"].join("、")
    : "無";
  var halfSubs = subConfig["場中"].length
    ? subConfig["場中"].join("、")
    : "無";
  return (
    "單場已訂閱項目：" + singleSubs + "\n" +
    "場中已訂閱項目：" + halfSubs
  );
}