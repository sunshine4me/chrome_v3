// setInterval(() => {
//   chrome.notifications.create({
//     type: "basic",
//     iconUrl: 'icons/icon32.png',
//     title: "服务器消息",
//     message: "你好",
//   });
// }, 10000);

let num = 0;
chrome.action.setBadgeBackgroundColor({ color: "#9688F1" });

const badge = setInterval(() => {
  chrome.action.setBadgeText({ text: num + "" });
  num++;
  if (num > 10) {
    clearInterval(badge);
  }
}, 5000);
