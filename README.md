# Telegram bot 運彩通知工具

https://t.me/J_TSL_tool_bot  

## 警告
本工具所發送資訊皆來源於：https://article.sportslottery.com.tw/zh-tw/news/live-schedule?iframe  
相關法律請參閱：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=H0120050  

&#8203;  

## 贊助支持：

<p align="left">
  <a href="https://p.ecpay.com.tw/B651285" target="_blank">
    <img src="https://payment.ecpay.com.tw/Upload/QRCode/202504/QRCode_f581a638-4852-44ad-b863-b47aff0fa1aa.png" height="70"/>
    <img src="https://www.ecpay.com.tw/Content/Themes/WebStyle20131201/images/header_logo.png" alt="ECPay" height="50" />
  </a>
<br>
  <a href="申請中" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" />
  </a>  
</p>      

[也歡迎定期定額投餵 :)](https://pay.ecpay.com.tw/CreditPayment/ExpressCredit?MerchantID=3451959 )   

 ### 聲明
• 所有工具除非平台本身投放，或有另外說明，將不會主動放置任何廣告  
• 我承諾贊助款將優先用於維持3~6個月內的伺服器運作。    
• 月結餘額無指定用途者，則繼續貢獻給[台灣運彩](https://article.sportslottery.com.tw/)。    
• 贊助行為屬於自願性支持，並非購買商品或交換服務，若平台不支援原則上無法取消或退還，請在確認金額與意願後再行操作。  
• 若因不可抗力因素（如伺服器中斷、平台維護等）影響使用權益，亦不構成退費依據。  

&#8203;  
## 流程

<pre style="white-space: pre-wrap; word-break: break-all;">
TGbot_project/               
│               
├─ config.gs/README.md                              
├─ webhook.gs                              
└─ core.gs                              
    ├─ Function_buttons_1.gs               
    ├─ Function_buttons_2.gs               
    └─ Function_buttons_3.gs        
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
join TG Bot               
│               
├─ /start        啟動機器人並顯示用戶 ID。               
├─ /help         顯示可用指令列表與說明。               
├─ /menu         顯示主要功能選單               
│   ├─ 訂​閱​通​知                                          
│   │   ├─ 單​場                                     
│   │   │   ├─ 足​球, 籃​球, 網​球, 冰​球, 棒​球, 電​競, 其​他 
│   │   │   ├─ 全​部​清​除                             
│   │   │   ├─ 完​成​並​儲​存                                  
│   │   │   └─ 返​回                               
│   │   │                                       
│   │   ├─ 場​中                                     
│   │   └─ 返​回​主​選​單                             
│   │                                           
│   ├─ buttons_2      未完成                               
│   ├─ buttons_3      未完成
│   ├─ 許​願​池                                       
│   ├─ 贊​助                                           
│   └─ 關​閉​選​單                                   
│                                               
├─ /view_notify         查詢已訂閱種類
├─ /clear_notify        清除所有訂閱項目
├─ /manual              說明書
└─ /……                  更多…
</pre>      

&#8203;  

## 實際效果

https://github.com/user-attachments/assets/db866c2f-bd42-4a63-971b-9a08c33810b7

https://github.com/user-attachments/assets/22691f7a-f64e-4740-b6b1-b9598a106cf2

https://github.com/user-attachments/assets/2365a3a7-c037-48da-b479-8d869fef8533

https://github.com/user-attachments/assets/6dd740f8-8d2a-4cc0-b1e2-d57933fae1e0


<img src="https://github.com/user-attachments/assets/2ca6a48c-baf9-4edd-bc5d-1fbaf41a856e" width="70%">

#### 歷史
<img src="https://github.com/user-attachments/assets/3bc2ff05-a7f7-4deb-bef4-33f329698ec2?raw=true" width="40%" alt="第二張圖">

&#8203;  

## 待辦功能  
０１,   每天晚上10點左右發送未來30小時的不篩選賽事預告(待測試 訊息可能過長)               
０２,   
０３,   
０４,   
０５,   

## 許願池&回應   
<pre>
０１,   重建line版本   
  回：之前版本的用量粗算一個月28800則訊息(平日10+假日20\*一個月四週*人數)    
      用新版Line messaging api收費約4500~5000，如果投幣達標會考慮  

０２,   FB版本  
  回：不熟，但有機會會再研究看看  
    
０３,    
０４,    
０５,   
</pre>
