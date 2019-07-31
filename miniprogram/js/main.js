import BackGround from "./runtime/background";
import GameInfo from "./runtime/gameinfo";
import DataBus from "./databus";
import THROWER from "./play/thrower";
import HOLE from "./play/hole";
import BALL from "./play/ball";

let ctx = canvas.getContext("2d");
let databus = new DataBus();
wx.cloud.init();
const db = wx.cloud.database();

export default class Main {
  constructor() {
    this.aniId = 0;
    this.personalHighScore = null;
    this.restart();
    this.login();
  }

  //GameStart
  restart() {
    databus.reset();
    canvas.removeEventListener("touchstart", this.touchHandler);

    this.bg = new BackGround(ctx);
    this.thrower = new THROWER(ctx);
    this.hole = new HOLE(ctx);
    this.ball = new BALL(ctx);
    this.gameinfo = new GameInfo();
    this.bindLoop = this.loop.bind(this);
    this.hasEventBind = false;

    // 清除上一局的动画
    window.cancelAnimationFrame(this.aniId);
    this.aniId = window.requestAnimationFrame(this.bindLoop, canvas);
  }
  // 获取登录Id
  login() {
    wx.cloud.callFunction({
      name: "login",
      success: res => {
        window.openid = res.result.openid;
        this.prefetchHighScore();
      },
      fail: err => {
        console.error("get openid failed with error", err);
      }
    });
  }

  // 获取历史最高分
  prefetchHighScore() {
    db.collection("score")
      .doc(`${window.openid}-score`)
      .get()
      .then(res => {
        if (this.personalHighScore) {
          if (res.data.max > this.personalHighScore) {
            this.personalHighScore = res.data.max;
          }
        } else {
          this.personalHighScore = res.data.max;
        }
      })
      .catch(err => {
        console.error("db get score catch error", err);
        this.prefetchHighScoreFailed = true;
      });
  }

  // 碰撞函数
  collisionDetection() {
    if (this.ball.x + this.ball.width >= this.hole.x) {
      if (
        this.ball.y >= this.hole.y - 3 &&
        this.ball.y + this.ball.height <= this.hole.y + this.hole.height
      ) {
        this.ball.visible = false;
        databus.score += Math.ceil(10 - this.hole.y / this.hole.height);
        this.ball = new BALL(ctx);
        this.hole = new HOLE(ctx);
        this.thrower = new THROWER(ctx);
      } else {
        databus.gameOver = true;
        if (this.personalHighScore) {
          if (databus.score > this.personalHighScore) {
            this.personalHighScore = databus.score;
          }
        }
        wx.cloud.callFunction({
          name: "uploadScore",
          data: {
            score: databus.score
          },
          success: res => {
            if (this.prefetchHighScoreFailed) {
              this.prefetchHighScore();
            }
          },
          fail: err => {
            console.error("upload score failed", err);
          }
        });
      }
    }
  }

  // 游戏结束后的触摸事件处理逻辑
  touchEventHandler(e) {
    e.preventDefault();
    let x = e.touches[0].clientX;
    let y = e.touches[0].clientY;
    let area = this.gameinfo.btnArea;
    // 判断点击位置
    if (
      x >= area.startX &&
      x <= area.endX &&
      y >= area.startY &&
      y <= area.endY
    ) {
      this.restart();
    }
  }

  //canvas重绘函数,每一帧重新绘制所有的需要展示的元素
  render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.bg.render(ctx);
    this.thrower.drawToCanvas(ctx);
    this.hole.drawToCanvas(ctx);
    this.ball.drawToCanvas(ctx);
    this.gameinfo.renderGameScore(ctx, databus.score);
    if (databus.gameOver) {
      this.gameinfo.renderGameOver(ctx, databus.score, this.personalHighScore);
      if (!this.hasEventBind) {
        this.hasEventBind = true;
        this.touchHandler = this.touchEventHandler.bind(this);
        canvas.addEventListener("touchstart", this.touchHandler);
      }
    }
  }

  //帧更新
  update() {
    if (databus.gameOver) {return};
    //全局碰撞检测
    if (this.ball.v) {
      this.ball.cool();
      this.thrower.shit();
    }
    this.collisionDetection();
  }

  //帧循环
  loop() {
    databus.frame++;
    this.update();
    this.render();
    this.aniId = window.requestAnimationFrame(this.bindLoop, canvas);
  }
}
