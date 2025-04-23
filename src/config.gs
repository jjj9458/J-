/*
功能與流程
bot_project/
│
├─ config.gs
├─ webhook.gs
└─ core.gs
    ├─ Function_buttons_1.gs
    ├─ Function_buttons_2.gs
    └─ Function_buttons_3.gs

1.0 config.gs
變數名稱與替換
架構流程圖
各檔案與函數說明

1.1 webhook.gs
doGet(e)
處理 Telegram Webhook 的 GET 驗證，回傳文字「Webhook 連線正常」。

setWebhook()
讀取「變數」工作表中的 Telegram Token 與 Webhook URL。
刪除舊的 Webhook，設定新的 Webhook。

checkWebhookStatus()
讀取 Token，呼叫 getWebhookInfo，在 Apps Script log 顯示目前 URL、pending 更新數、最後錯誤資訊。

clearPendingUpdates()
刪除 Webhook（drop pending updates），並提示使用者重新執行 setWebhook()。


1.2 core.gs
常數區
工作表名稱：SHEET_USER_LIST、SHEET_LOG、SHEET_VARS、SHEET_SUBSCRIBE、SHEET_RAW
主選單文字：Function_buttons_1（訂閱通知）、Function_buttons_2（網頁工具）、Function_buttons_3（賽事轉播）、BTN_DONATE、BTN_FEEDBACK、BTN_CLOSE_MENU

doPost(e)
解析 e.postData.contents，取得 msg。
早期攔截 /menu
如果 msg.text === "/menu"，立刻呼叫 sendMessage(chatId,"主選單：",getMainMenu())，並 return HtmlService.createHtmlOutput('OK')。

初始化並記錄
ensureSheets()：確保五張工作表都存在，並具備標題列。
logRawUpdate()：記錄原始 JSON。
logMessage("接收", ...)：記錄收到的訊息。

/Del_All 自刪邏輯
讀取 state_delall_<userId>，若存在，檢查使用者輸入是否 刪除<userId>：
如果吻合，呼叫 deleteUserData(userId)，刪除所有相關工作表裡的資料，回覆「✅ 已刪除用戶…」。

否則回覆「操作已取消」。
清除該屬性後結束處理。

/Del_All 管理員邏輯
只有當 userId == 5865480796 且文字以 /Del_All 開頭時觸發。
props.setProperty("state_delall_admin_<userId>","pending") 並 props.setProperty("delall_target_admin_<userId>", target)。
回覆「管理員你好…請再輸入：確定 Del_All <target>」。

/ 指令分流
/start → recordUser() + 歡迎訊息
/help → 列出所有指令
/command1 → querySubscription(userId) 回訂閱
/command2 → clearSubscription(userId) 清除訂閱
/command3 → 空回覆
/manual → 固定手冊連結
其他 / 開頭 → 「⚠️ 無效的指令」

主選單按鈕分流
訂閱通知 → 呼叫 handleSubscriptionStart(chatId,userId)
網頁工具 → 呼叫 onWebTools(chatId,userId)
賽事轉播 → 呼叫 onBroadcast(chatId,userId)
贊助、關閉選單、意見/BUG提供 → 各自回覆並設定 state_feedback_waiting
預設回覆
若以上都不符合，回「⚠️ 無效的訊息或指令」。

deleteUserData(deleteId)
在 使用者清單、訂閱設定、訊息紀錄、原始JSON紀錄 這四張表裡，刪除所有欄位二或欄位三等於 <deleteId> 的列。


1.3 Function_buttons_1.gs
handleSubscriptionStart(chatId, userId)
設定 state_<userId> = "subscribe_main"，並回傳「請選擇你要訂閱的類型：」＋getSubscribeMainMenu()。
handleSubscription(userId, userName, chatId, text, msgId)
根據 state_<userId>（subscribe_main、subscribe_單場、subscribe_場中）處理使用者點選「單場／場中」或選擇運動項目、全部清除、完成儲存、返回等流程。
querySubscription(userId)、clearSubscription(userId)、saveSubscription(userId,userName,subConfig)
getUserSubscriptionFromSheet(userId)
getSubscribeMainMenu()、getSubscribeDetailMenu(cate)

1.4 Function_buttons_2.gs
onWebTools(chatId, userId)
功能尚未實裝，先回覆「bug太多還在修」＋主選單。

1.5 Function_buttons_3.gs
onBroadcast(chatId, userId)
功能尚未實裝，先回覆「別玩了」＋主選單。

Telegram → Webhook URL → doPost(e)
  ├─ msg.text === "/menu" ?
  │     └─ YES → sendMessage 主選單 → return
  ├─ 確保工作表 + 記錄原始 + 記錄接收
  ├─ 是否 selfConfirm(/Del_All 二步) ?
  │     └─ YES → 刪除資料 → 回覆 → return
  ├─ 是否 adminConfirm(Del_All 管理員二步) ?
  │     └─ YES → 刪除 target → 回覆 → return
  ├─ text === "/Del_All" 自刪第一步 ?
  │     └─ YES → 問確認 → return
  ├─ userId==5865480796 && text.startsWith("/Del_All ") 管理員第一步 ?
  │     └─ YES → 問確認 → return
  ├─ text.startsWith("/") 一般指令 ?
  │     └─ switch(/start,/help,/command1,/command2,/command3,/manual)
  │            └─ 處理完 → return
  ├─ text 是主選單按鈕 ?
  │     └─ switch(訂閱通知,網頁工具,賽事轉播,贊助,意見,關閉選單)
  │            └─ 處理完 → return
  └─ 否 → 「⚠️ 無效的訊息或指令」


*/

function getLabels() {
  return {
    // Version
    version: "v2.0.0",

    // Main menu button labels
    Function_buttons_1: "訂閱通知",
    Function_buttons_2: "網頁工具",
    Function_buttons_3: "賽事轉播",
    sponsorButton: "贊助",
    feedbackButton: "意見/BUG提供",
    closeMenuButton: "關閉選單",

    // Subscribe submenu labels
    subscribeSingle: "單場",
    subscribeHalf: "場中",
    subscribeBackToMenu: "返回主選單",
    subscribeClearAll: "全部清除",
    subscribeSave: "完成並儲存",
    subscribeBack: "返回",

    // Options and categories
    sportsOptions: ["足球", "籃球", "網球", "冰球", "棒球", "電競", "其他"],
    noneText: "無",

    // Sheet names
    userListSheet: "使用者清單",
    logSheet: "訊息紀錄",
    varSheet: "變數",
    subscribeSheet: "訂閱設定",
    rawSheet: "原始JSON紀錄",
    feedbackSheet: "意見",

    // Timing and IDs
    timeoutSeconds: 60,
    adminId: 5865480796,

    // Display messages
    menuTitle: "主選單：",
    welcomeMsg: "歡迎，{NAME}！您的 ID 是 {ID}",
    helpMsg: "指令說明\n" +
             "/start - 啟動並歡迎\n" +
             "/help - 顯示指令\n" +
             "/menu - 顯示主選單\n" +
             "/command1 - 查詢訂閱\n" +
             "/command2 - 清除訂閱\n" +
             "/command3 - 空回覆\n" +
             "/manual - 顯示手冊\n" +
             "/Del_All - 清除所有資料 (需確認)",
    invalidCommandMsg: "⚠️ 無效的指令，請使用 /help 查看可用指令。",
    invalidMessageMsg: "⚠️ 無效的訊息或指令，請使用 /help 查看可用指令。",
    featureNotImplemented: "功能尚未實作，敬請期待。",
    sponsorMsg: "支持我們，請點擊：https://www.pttweb.cc/user/____",
    feedbackPrompt: "請一次性輸入意見或BUG",
    feedbackReceivedMsg: "感謝你的回覆，如果太久沒回應請站內信",
    menuClosedMsg: "選單已關閉。如需再次使用，請輸入 /menu",

    // Subscribe flow messages
    chooseSubscribeType: "請選擇你要訂閱的類型：",
    currentSubscriptions: "{CATEGORY}目前已訂閱項目：{LIST}",
    chooseSports: "請選擇項目（多選可自由加入／移除）：",
    subscribeInstructions: "點擊全部清除清除選項\n" +
                           "點擊完成並儲存儲存設定\n" +
                           "點擊返回返回上一層\n\n" +
                           "*點擊返回將不會儲存本次設定",
    addedSubscription: "已加入{ITEM}",
    removedSubscription: "已移除{ITEM}",
    nowSubscribedList: "目前已訂閱：{LIST}",
    clearedAllSubscriptions: "已取消所有{CATEGORY}選項。\n請點擊完成並儲存完成儲存",
    savedSubscriptions: "✅ 已儲存項目",
    returnedToPrevious: "已返回上一層 (本次設定未儲存)",
    invalidSubscriptionCmd: "⚠️ 無效的指令，請點擊選單選項。",
    subscribePrompt: "請選擇下方功能",

    // Deletion (Del_All) messages
    deleteAllPromptUser: "⚠️ 確定要清除所有訂閱嗎？\n請在{TIME}秒內輸入：刪除{ID}",
    deleteAllPromptAdmin: "⚠️ 確定要清除用戶 {ID} 的所有訂閱嗎？\n請在{TIME}秒內輸入：確定 Del_All {ID}",
    deleteAllCancelled: "已取消清除操作。",
    deleteAllDoneUser: "✅ 已清除您的所有訂閱。",
    deleteAllDoneAdmin: "✅ 已清除用戶 {ID} 的所有訂閱。",
    noSubscriptions: "您尚未訂閱任何項目。",
    userNotFound: "找不到該用戶的訂閱記錄。"
  };
}

/**
 * 功能: 檢查並初始化所有工作表與標題列
 */
function checkAndInitSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // 每個 key 是工作表名稱，值是該表第一列要放的標題欄
  var specs = {
    "使用者清單":   ["時間","用戶ID","用戶名稱","訊息ID"],
    "訊息紀錄":     ["時間","用戶ID","用戶名稱","方向","訊息內容","訊息ID"],
    "回饋紀錄":     ["時間","用戶ID","用戶名稱","回饋內容"],
    "變數":         ["變數","值"],
    "訂閱設定":     ["時間","用戶ID","用戶名稱","單場","場中"],
    "原始JSON紀錄": ["時間","原始JSON"]
  };
  for (var name in specs) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      // 加入標題列
      sheet.appendRow(specs[name]);
      Logger.log("已建立工作表：" + name + "，並填入標題列");
    } else {
      // 若已存在，可做二次檢查：若第一列少了某些欄位，就自動補上
      var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var missing = specs[name].filter(function(col) {
        return existing.indexOf(col) < 0;
      });
      if (missing.length) {
        // 在現有欄尾依序補上遺漏的標題
        missing.forEach(function(col) {
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue(col);
          Logger.log("在工作表「" + name + "」補上標題：" + col);
        });
      }
    }
  }
}
