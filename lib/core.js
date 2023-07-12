/**
 * 获取img的ImageData 数据
 * @param {*} img
 * @returns
 */
export function getImageData(img) {
  var canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const imdData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return imdData;
}

/**
 * 从src 文件读取ImageData数据
 * @param {*} src
 * @returns
 */
export function srcToImageData(src) {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.src = src;
    img.onload = function () {
      var imageData = getImageData(img);
      resolve(imageData);
    };
    img.onerror = function (error) {
      reject(error);
    };
  });
}

export function sleep(ms){
   return new Promise((r) => setTimeout(r, ms));
}