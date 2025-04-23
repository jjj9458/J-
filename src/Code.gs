// 功能: 核心業務與指令分發

// 工作表名稱常數
var SHEET_USER_LIST = "使用者清單";
var SHEET_LOG       = "訊息紀錄";
var SHEET_VARS      = "變數";
var SHEET_SUBSCRIBE = "訂閱設定";
var SHEET_RAW       = "原始JSON紀錄";

// 主選單按鈕常數（已重命名）
var Function_buttons_1 = "訂閱通知";
var Function_buttons_2 = "網頁工具";
var Function_buttons_3 = "賽事轉播";
var BTN_DONATE        = "贊助";
var BTN_FEEDBACK      = "意見/BUG提供";
var BTN_CLOSE_MENU    = "關閉選單";

// 2. 合併 #3／#6：所有 slash-commands 共用
function handleSlashCommand(chatId, userId, userName, text, msgId) {
  switch (text) {
    case "/start":
      recordUser(userName, userId, msgId);
      sendMessage(chatId, "歡迎，" + userName + "！您的 ID 是 " + userId, {remove_keyboard:true});
      break;
    case "/help":
      var help = "/help                - 顯示指令"
               + "\n/menu             - 選單"
               + "\n/view_notify    - 查詢已訂閱種類"
               + "\n/clear_notify   - 清除所有訂閱項目"
               + "\n/manual          - 說明書";
      sendMessage(chatId, help, {remove_keyboard:true});
      break;
    case "/view_notify":
      sendMessage(chatId, querySubscription(userId), {remove_keyboard:true});
      break;
    case "/clear_notify":
      sendMessage(chatId, clearSubscription(userId), {remove_keyboard:true});
      break;
    case "/command3":
      sendMessage(chatId, "", {remove_keyboard:true});
      break;
    case "/manual":
      sendMessage(chatId, "!@#$%^&*()_+\nhttps://telegra.ph/大祕寶-04-21", {remove_keyboard:true});
      break;
    default:
      sendMessage(chatId, "⚠️ 無效的指令", {remove_keyboard:true});
  }
}

/**
 * 功能: 處理所有 Telegram POST 請求，包括 /Del_All、其他 / 開頭指令與按鈕
 */
function doPost(e) {
  // #1 解析更新與訊息
  var update    = JSON.parse(e.postData.contents);
  var msg       = update.message || update.edited_message;
  var userId    = msg.from.id;
  var userName  = getUserName(msg.from);
  var chatId    = msg.chat.id;
  var text      = msg.text || "";
  var msgId     = msg.message_id;

  // #2 確保工作表並記錄
  //ensureSheets();
  logRawUpdate(JSON.stringify(update));
  logMessage("接收", userId, userName, text, msgId);

  // #3 初始化狀態 key
  var props           = PropertiesService.getScriptProperties();
  var ctxKey          = "context_"            + userId;    // idle/menu/delete_self/delete_admin/feedback
  var warnedKey       = ctxKey + "_warned_slash";
  var ctx             = props.getProperty(ctxKey) || "idle";
  var stateKey        = "state_delall_"       + userId;    // 自刪流程
  var adminStateKey   = "state_delall_admin_" + userId;    // 管理員刪除流程
  var subState        = props.getProperty("state_" + userId); // 訂閱流程

  // #4 /menu → 進主選單，重設狀態與提醒旗標
  if (text === "/menu") {
    props.setProperty(ctxKey, "menu");
    props.deleteProperty(warnedKey);
    sendMessage(chatId, "主選單：\n如果未出現選項請清空輸入欄再重新 /menu ", getMainMenu());
    return HtmlService.createHtmlOutput("OK");
  }

  // #5 觸發自刪流程
  if (text === "/Del_All") {
    props.setProperty(stateKey, "pending");
    props.setProperty(stateKey + "_ts", Date.now());
    props.setProperty(ctxKey, "delete_self");
    var prompt = userName + " (" + userId + ") 是否確定要刪除所有資料？ 請輸入：\n刪除" + userId;
    sendMessage(chatId, prompt, { remove_keyboard: true });
    logMessage("發送", userId, userName, prompt, null);
    return HtmlService.createHtmlOutput("OK");
  }

  // #6 觸發管理員刪除流程
  if (userId === 5865480796 && text.startsWith("/Del_All ")) {
    var parts  = text.split(" ");
    var target = parts[1];
    props.setProperty(adminStateKey, "pending");
    props.setProperty(adminStateKey + "_ts", Date.now());
    props.setProperty("delall_target_admin_" + userId, target);
    props.setProperty(ctxKey, "delete_admin");
    var promptA = "管理員你好，是否確認刪除 " + target + " 的資料？ 請輸入：\n確定 Del_All " + target;
    sendMessage(chatId, promptA, { remove_keyboard: true });
    logMessage("發送", userId, userName, promptA, null);
    return HtmlService.createHtmlOutput("OK");
  }

  // #7 自刪二階段確認
  if (ctx === "delete_self") {
    var ts = props.getProperty(stateKey + "_ts");
    if (ts && (Date.now() - Number(ts) > 60000)) {
      props.deleteProperty(stateKey);
      props.deleteProperty(stateKey + "_ts");
      props.deleteProperty(ctxKey);
      sendMessage(chatId, "操作已取消，資料未刪除。", { remove_keyboard: true });
      return HtmlService.createHtmlOutput("OK");
    }
    var expect = "刪除" + userId;
    var reply  = (text === expect)
               ? (deleteUserData(userId), "✅ 已刪除您的所有資料。")
               : "操作已取消，資料未刪除。";
    props.deleteProperty(stateKey);
    props.deleteProperty(stateKey + "_ts");
    props.deleteProperty(ctxKey);
    sendMessage(chatId, reply, { remove_keyboard: true });
    logMessage("發送", userId, userName, reply, null);
    return HtmlService.createHtmlOutput("OK");
  }

  // #8 管理員刪除二階段確認
  if (ctx === "delete_admin") {
    var tsA    = props.getProperty(adminStateKey + "_ts");
    var target = props.getProperty("delall_target_admin_" + userId);
    if (tsA && (Date.now() - Number(tsA) > 60000)) {
      props.deleteProperty(adminStateKey);
      props.deleteProperty(adminStateKey + "_ts");
      props.deleteProperty("delall_target_admin_" + userId);
      props.deleteProperty(ctxKey);
      sendMessage(chatId, "操作已取消，資料未刪除。", { remove_keyboard: true });
      return HtmlService.createHtmlOutput("OK");
    }
    var expectA = "確定 Del_All " + target;
    var replyA  = (text === expectA)
                ? (deleteUserData(target), "✅ 已刪除用戶 " + target + " 的所有資料。")
                : "操作已取消，資料未刪除。";
    props.deleteProperty(adminStateKey);
    props.deleteProperty(adminStateKey + "_ts");
    props.deleteProperty("delall_target_admin_" + userId);
    props.deleteProperty(ctxKey);
    sendMessage(chatId, replyA, { remove_keyboard: true });
    logMessage("發送", userId, userName, replyA, null);
    return HtmlService.createHtmlOutput("OK");
  }

  // #9 訂閱子流程（只要 state_<userId> 存在，就交給 handleSubscription）
  if (subState) {
    // 清除 slash-reminder，讓訂閱裡面也只提醒一次
    props.deleteProperty(warnedKey);
    return handleSubscription(userId, userName, chatId, text, msgId);
  }

  // #10 全域 Slash‑command 攔截：只要不在 idle context，就提醒一次
  if (text.startsWith("/") && ctx !== "idle") {
    if (!props.getProperty(warnedKey)) {
      props.setProperty(warnedKey, "1");
      sendMessage(
        chatId,
        "⚠️ 選單開啟中無法使用預設指令，請先完成操作或 /menu 回主選單。"
      );
      return HtmlService.createHtmlOutput("OK");
    }
    // 第二次之後放行
    props.deleteProperty(warnedKey);
  }

  // #11 Slash‑commands 處理（非子選單，或已提醒後）
  if (text.startsWith("/")) {
    handleSlashCommand(chatId, userId, userName, text, msgId);
    return HtmlService.createHtmlOutput("OK");
  }

  // #12 根據 context 分流
  switch (ctx) {
    case "idle":
    case "menu":
      if (isMainButton(text)) {
        var nextCtx = mapButtonToContext(text);
        props.setProperty(ctxKey, nextCtx);
        props.deleteProperty(warnedKey);
        handleMainButton(chatId, userId, text);
      } else {
        sendMessage(chatId, "⚠️ 無效的訊息或指令，請使用 /help 查看可用指令。");
      }
      break;

    case "feedback":
      // 存回饋到「回饋紀錄」工作表
      var ss      = SpreadsheetApp.getActiveSpreadsheet();
      var sheet   = ss.getSheetByName("回饋紀錄");
      if (!sheet) {
        sheet = ss.insertSheet("回饋紀錄");
        sheet.appendRow(["時間", "用戶ID", "用戶名稱", "回饋內容"]);
      }
      sheet.appendRow([new Date(), userId, userName, text]);
      // 回覆並回到 idle
      sendMessage(chatId, "謝謝您的回饋，我們已收到！", { remove_keyboard: true });
      logMessage("發送", userId, userName, "回饋：" + text, null);
      props.setProperty(ctxKey, "idle");
      break;

    default:
      props.setProperty(ctxKey, "menu");
      props.deleteProperty(warnedKey);
      sendMessage(chatId, "系統錯誤，已回到主選單。", getMainMenu());
  }

  return HtmlService.createHtmlOutput("OK");
}

// 以下輔助函式請貼回原程式
function isMainButton(text) {
  return [
    Function_buttons_1,
    Function_buttons_2,
    Function_buttons_3,
    BTN_DONATE,
    BTN_FEEDBACK,
    BTN_CLOSE_MENU
  ].indexOf(text) !== -1;
}
function mapButtonToContext(text) {
  switch (text) {
    case Function_buttons_1: return "menu";      // 訂閱由 subState 管理
    case Function_buttons_2: return "menu";      // 網頁工具執行一次後仍留在 menu
    case Function_buttons_3: return "menu";      // 賽事轉播執行一次後仍留在 menu
    case BTN_DONATE:        return "idle";
    case BTN_FEEDBACK:      return "feedback";
    case BTN_CLOSE_MENU:    return "idle";
    default:                return "idle";
  }
}
function handleMainButton(chatId, userId, text) {
  switch (text) {
    case Function_buttons_1:
      handleSubscriptionStart(chatId, userId);
      break;
    case Function_buttons_2:
      onWebTools(chatId, userId);
      break;
    case Function_buttons_3:
      onBroadcast(chatId, userId);
      break;
    case BTN_DONATE:
      sendMessage(chatId, "支持作者，前往投幣支持：https://…", { remove_keyboard: true });
      break;
    case BTN_FEEDBACK:
      sendMessage(chatId, "請一次性輸入意見或BUG", { remove_keyboard: true });
      break;
    case BTN_CLOSE_MENU:
      sendMessage(chatId, "選單已關閉。如需再次使用，請輸入 /menu", { remove_keyboard: true });
      break;
  }
}

/**
 * 功能: 刪除指定用戶在多個工作表中的資料
 */
function deleteUserData(deleteId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [SHEET_USER_LIST, SHEET_SUBSCRIBE].forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    for (var i = data.length-1; i>=1; i--) {
      if (data[i][1] == deleteId || data[i][2] == deleteId) {
        sheet.deleteRow(i+1);
      }
    }
  });
}

// 以下核心輔助函數請與原實作貼齊：ensureSheets, logMessage, logRawUpdate,
// getUserName, recordUser, sendMessage, getMainMenu

/******************************************************
 * 共用輔助函數與工作表初始化功能
 ******************************************************/
function logMessage(direction, userId, userName, content, messageId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEET_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOG);
    logSheet.appendRow(["時間", "用戶ID", "用戶名稱", "方向", "訊息內容", "訊息ID"]);
    Logger.log("已建立「" + SHEET_LOG + "」工作表。");
  }
  logSheet.appendRow([new Date(), userId, userName, direction, content, messageId]);
  Logger.log("記錄" + direction + "訊息：" + content);
}

function ensureSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(SHEET_USER_LIST)) {
    var userSheet = ss.insertSheet(SHEET_USER_LIST);
    userSheet.appendRow(["時間", "用戶ID", "用戶名稱", "訊息ID"]);
    Logger.log("已建立「" + SHEET_USER_LIST + "」工作表。");
  }
  
  if (!ss.getSheetByName(SHEET_LOG)) {
    var logSheet = ss.insertSheet(SHEET_LOG);
    logSheet.appendRow(["時間", "用戶ID", "用戶名稱", "方向", "訊息內容", "訊息ID"]);
    Logger.log("已建立「" + SHEET_LOG + "」工作表。");
  }
  
  if (!ss.getSheetByName(SHEET_VARS)) {
    var varSheet = ss.insertSheet(SHEET_VARS);
    varSheet.appendRow(["變數", "值"]);
    varSheet.appendRow(["Telegram Token", ""]);
    varSheet.appendRow(["Webhook URL", ""]);
    Logger.log("已建立「" + SHEET_VARS + "」工作表，請填入相關內容。");
  }
  
  if (!ss.getSheetByName(SHEET_SUBSCRIBE)) {
    var subSheet = ss.insertSheet(SHEET_SUBSCRIBE);
    subSheet.appendRow(["時間", "用戶ID", "用戶名稱", "單場", "場中"]);
    Logger.log("已建立「" + SHEET_SUBSCRIBE + "」工作表。");
  }
  
  if (!ss.getSheetByName(SHEET_RAW)) {
    var rawSheet = ss.insertSheet(SHEET_RAW);
    rawSheet.appendRow(["時間", "原始JSON"]);
    Logger.log("已建立「" + SHEET_RAW + "」工作表。");
  }
}

function logRawUpdate(rawJson) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_RAW);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RAW);
    sheet.appendRow(["時間", "原始JSON"]);
    Logger.log("已建立「" + SHEET_RAW + "」工作表。");
  }
  sheet.appendRow([new Date(), rawJson]);
  Logger.log("記錄原始 JSON 資料。");
}

function getUserName(user) {
  var name = user.first_name || "";
  if (user.last_name) {
    name += " " + user.last_name;
  }
  return name;
}

/******************************************************
 * 更新說明
 * recordUser(userName, userId, msgId)：
 * 收到 /start 指令時，直接記錄用戶資料至使用者清單工作表（每次均記錄，不做判重）
 ******************************************************/
function recordUser(userName, userId, msgId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userSheet = ss.getSheetByName(SHEET_USER_LIST);
  userSheet.appendRow([new Date(), userId, userName, msgId]);
  Logger.log("記錄使用者：" + userName + " (" + userId + ")");
}

/******************************************************
 * sendMessage()：
 * 使用 Telegram Bot API 發送訊息
 * 從變數工作表讀取 Telegram Token（請手動填入）
 ******************************************************/
function sendMessage(chatId, text, replyMarkup) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var vs    = ss.getSheetByName(SHEET_VARS).getDataRange().getValues();
  var token = "";
  for (var i = 0; i < vs.length; i++) {
    if (vs[i][0] === "Telegram Token" && vs[i][1]) {
      token = vs[i][1];
      break;
    }
  }
  if (!token) {
    Logger.log("請在【變數】工作表填入 Telegram Token");
    return;
  }

  // 組基本 payload
  var payload = {
    chat_id: chatId,
    text:    text
  };

  // 如果有 replyMarkup，就自動處理成字串
  if (replyMarkup) {
    // 如果你傳的是物件，就幫你 JSON.stringify，
    // 如果是字串，就沿用舊行為
    payload.reply_markup =
      (typeof replyMarkup === "string")
        ? replyMarkup
        : JSON.stringify(replyMarkup);
  }

  var options = {
    method:            "post",
    contentType:       "application/json",
    payload:           JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var res = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + token + "/sendMessage",
    options
  );
  var j = JSON.parse(res.getContentText());
  if (!j.ok) {
    Logger.log("sendMessage 失敗：" + j.description);
    return null;
  }
  return j.result;
}

// 產生主選單，包含 "訂閱通知"、"網頁工具"、"賽事轉播"、"贊助"
function getMainMenu(){
  return {keyboard:[[{text:Function_buttons_1}],
                   [{text:Function_buttons_2},{text:Function_buttons_3},{text:BTN_DONATE}],
                   [{text:BTN_FEEDBACK},{text:BTN_CLOSE_MENU}]],
          resize_keyboard:true,one_time_keyboard:false};
}

