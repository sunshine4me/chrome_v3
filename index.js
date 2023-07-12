import { getImageData, srcToImageData, sleep } from "./lib/core.js";

function captureVisibleTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 100 }, (screenshotUrl) => {
      resolve(screenshotUrl);
    });
  });
}

function captureVisibleTabImageData() {
  return captureVisibleTab().then((screenshotUrl) => {
    return srcToImageData(screenshotUrl);
  });
}

async function drawRectangles(rectangles, style = "solid") {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  for (var rectangle of rectangles) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: ({ x, y, width, height }, style) => {
        const rectangle = document.createElement("div");

        rectangle.setAttribute("name", "myRectangle");
        rectangle.style.position = "fixed";
        rectangle.style.left = x + "px";
        rectangle.style.top = y + "px";
        rectangle.style.width = width + "px";
        rectangle.style.height = height + "px";
        rectangle.style.border = `2px ${style} red`;
        rectangle.style.zIndex = "9999";

        document.body.appendChild(rectangle);
      },
      args: [rectangle, style],
    });
  }
}

async function findClosestElement(rectangle, click = false) {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  return await chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      func: (rectangle, click) => {
        // 计算目标矩形的四个顶点坐标
        const targetPoints = [
          { x: rectangle.x, y: rectangle.y },
          { x: rectangle.x + rectangle.width, y: rectangle.y },
          { x: rectangle.x, y: rectangle.y + rectangle.height },
          { x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height },
        ];

        let closestElement = null;
        let minDistance = Infinity;

        // 计算目标矩形的中心点坐标
        const targetCenterX = rectangle.x + rectangle.width / 2;
        const targetCenterY = rectangle.y + rectangle.height / 2;
        const elements = document.elementsFromPoint(targetCenterX, targetCenterY);

        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];

          const rect = element.getBoundingClientRect();

          // 计算当前元素的四个顶点坐标
          const rectPoints = [
            { x: rect.left, y: rect.top },
            { x: rect.right, y: rect.top },
            { x: rect.left, y: rect.bottom },
            { x: rect.right, y: rect.bottom },
          ];

          let distance = 0;

          // 计算目标矩形的四个顶点到当前元素的四个顶点的距离之和
          for (let j = 0; j < 4; j++) {
            distance += Math.sqrt(
              Math.pow(targetPoints[j].x - rectPoints[j].x, 2) + Math.pow(targetPoints[j].y - rectPoints[j].y, 2)
            );
          }

          // 如果当前元素离目标矩形更近，则更新最近距离和最近元素
          if (distance < minDistance) {
            minDistance = distance;
            closestElement = element;
          }
        }
        //返回最近的元素rect
        if (closestElement) {
          if (click === true) {
            if (closestElement instanceof HTMLCanvasElement) {
              console.log(targetCenterX, targetCenterY);
              let event = new MouseEvent("mousedown", {
                clientX: targetCenterX,
                clientY: targetCenterY,
                button: 0,
              });

              closestElement.dispatchEvent(event);

              event = new MouseEvent("mouseup", {
                clientX: targetCenterX,
                clientY: targetCenterY,
                button: 0,
              });

              closestElement.dispatchEvent(event);
            } else {
              closestElement.click();
            }
          } else {
            const rect = closestElement.getBoundingClientRect();
            return { x: rect.x, y: rect.y, height: rect.height, width: rect.width };
          }
        }
      },
      args: [rectangle, click],
    })
    .then((result) => {
      return result[0].result;
    });
}

async function clearRectangle() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // 查找所有 name 为 myRectangle 的 div 元素
      const _rectangles = document.querySelectorAll('div[name="myRectangle"]');

      // 删除之前匹配的图片框
      _rectangles.forEach((rectangle) => {
        rectangle.remove();
      });
    },
  });
}

var searchImage = document.getElementById("searchImage");
let searchImageInput = document.getElementById("searchImageInput");
var log = document.getElementById("log");
var clear = document.getElementById("clear");
var simulateText = document.getElementById("simulateText");
clear.onclick = async function () {
  clearRectangle();
};

chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  simulateText.addEventListener("keydown", (e) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (key, repeat) => {
        var targetElement = document.activeElement;
        var keyEvent = new KeyboardEvent("keydown", { key: key, repeat: repeat });
        targetElement.dispatchEvent(keyEvent);
      },
      args: [e.key, e.repeat],
    });
  });

  simulateText.addEventListener("keyup", (e) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (key) => {
        var targetElement = document.activeElement;
        var keyEvent = new KeyboardEvent("keyup", { key: key });
        targetElement.dispatchEvent(keyEvent);
      },
      args: [e.key],
    });
  });
});

window.addEventListener("message", (event) => {
  const { fn, result } = event.data;
  if (fn === "matchTemplate") {
    if (result.length <= 0) {
        log.innerText = "找不到元素.";
        return;
    };

    for (var rectangle of result) {
      const pixelRatio = window.devicePixelRatio;
      rectangle.x = rectangle.x / pixelRatio;
      rectangle.y = rectangle.y / pixelRatio;
      rectangle.width = rectangle.width / pixelRatio;
      rectangle.height = rectangle.height / pixelRatio;
    }

    const isClick = document.getElementById("isClick")?.checked;

    if (isClick) {
      log.innerText = "点击.";
      findClosestElement(result[0], true);
    } else {
      findClosestElement(result[0]).then((rect) => {
        log.innerText = "绘制图像.";
        drawRectangles([rect], "dotted");
        drawRectangles(result);
      });
    }
  }
});

searchImageInput.addEventListener(
  "change",
  (e) => {
    searchImage.src = URL.createObjectURL(e.target.files[0]);
  },
  false
);

searchImage.onload = async function () {
  log.innerText = "清除高亮显示";

  await clearRectangle();

  await sleep(1000);
  log.innerText = "生成图像信息......";
  const imageData1 = await captureVisibleTabImageData();
  const imageData2 = await getImageData(searchImage);
  await sleep(1000);
  log.innerText = "计算图片位置......";
  document
    .getElementById("sandbox")
    .contentWindow.postMessage({ fn: "matchTemplate", args: [imageData1, imageData2] }, "*");

};

// document.addEventListener("DOMContentLoaded", function () {
//   console.log("DOMContentLoaded");
// });
