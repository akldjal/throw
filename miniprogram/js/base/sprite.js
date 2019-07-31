//游戏基础的精灵类
export default class Sprite {
  //精灵默认值
  constructor(imgSrc = "", width = 0, height = 0, x = 0, y = 0) {
    this.img = new Image();
    this.img.src = imgSrc;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.visible = true;
  }
  // 将精灵图绘制在canvas上
  drawToCanvas(ctx) {
    //判断精灵是否可见
    if (!this.visible) return;
    //照精灵本身信息绘制精灵
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
}
