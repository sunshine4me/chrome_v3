function getBestRectangle(mat1, mat2, scaleRatio) {
  let scaleRatios = [1, 0.5, 2.0, 1.9, 0.6, 1.7, 1.8, 0.7, 1.5, 1.6, 0.8, 1.3, 1.4, 0.9, 1.1, 1.2];
  if (scaleRatio) {
    scaleRatios = [scaleRatio];
  }
  // 保存最佳匹配结果的变量
  let maxCorrelation = -1;
  let maxScaleRatio = 1;
  let bestMatchLoc = null;

  for (let scaleRatio of scaleRatios) {
    console.log("matchTemplate", scaleRatio);
    // 调整mat2的尺寸
    let resizedMat2 = new cv.Mat();
    cv.resize(mat2, resizedMat2, new cv.Size(0, 0), scaleRatio, scaleRatio, cv.INTER_LINEAR);

    // 进行图像处理操作，例如模板匹配、边缘检测等
    let result = new cv.Mat();
    cv.matchTemplate(mat1, resizedMat2, result, cv.TM_CCOEFF_NORMED);

    // 寻找最佳匹配位置
    let minMax = cv.minMaxLoc(result);
    let maxLoc = minMax.maxLoc;

    // 记录最佳匹配结果
    if (minMax.maxVal > maxCorrelation) {
      maxCorrelation = minMax.maxVal;
      maxScaleRatio = scaleRatio;
      bestMatchLoc = maxLoc;
    }
    resizedMat2.delete();
    result.delete();

    if (maxCorrelation >= 0.9) {
      break;
    }
  }
  if (bestMatchLoc && maxCorrelation >= 0.8) {
    let expectedWidth = mat2.cols * maxScaleRatio;
    let expectedHeight = mat2.rows * maxScaleRatio;
    return {
      scaleRatio: maxScaleRatio,
      correlation: maxCorrelation,
      x: bestMatchLoc.x,
      y: bestMatchLoc.y,
      width: expectedWidth,
      height: expectedHeight,
    };
  }
}

function clearRectangle(mat, rectangle) {
  const p1 = new cv.Point(rectangle.x, rectangle.y);
  const p2 = new cv.Point(rectangle.x + rectangle.width, rectangle.y + rectangle.height);
  cv.rectangle(mat, p1, p2, [0, 0, 0, 0], -1);
}

function matchTemplate(imageData1, imageData2, findAll) {
  var mat1 = cv.matFromImageData(imageData1);
  var mat2 = cv.matFromImageData(imageData2);

  var firstRectangle = getBestRectangle(mat1, mat2);

  let rectangles = [];
  if (firstRectangle) {
    rectangles.push(firstRectangle);
    clearRectangle(mat1, firstRectangle);
    if (findAll) {
      const scaleRatio = firstRectangle.scaleRatio;
      for (let i = 0; i < 10; i++) {
        var rectangle = getBestRectangle(mat1, mat2, scaleRatio);
        if (rectangle) {
          clearRectangle(mat1, rectangle);
          rectangles.push(rectangle);
        } else {
          break;
        }
      }
    }
  }

  // 释放内存
  mat1.delete();
  mat2.delete();

  return rectangles;
}

var fns = {
  matchTemplate,
  test() {
    return "123";
  },
};

window.addEventListener("message", (event) => {
  const { fn, args } = event.data;
  if (fns[fn]) {
    const result = fns[fn](...args);
    event.source.postMessage({ fn, args, result }, event.origin);
  }
});
