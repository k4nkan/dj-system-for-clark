/* global p5 */

const shell = document.querySelector("#phone");
const canvasHost = document.querySelector("#decorCanvas");
const designSize = { width: 402, height: 874 };

if (!window.p5) {
  console.warn("p5.js is not loaded. Decorative canvas was skipped.");
} else {
  new p5((p) => {
    p.setup = () => {
      p.createCanvas(canvasHost.clientWidth, canvasHost.clientHeight);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      p.frameRate(24);
    };

    p.windowResized = resizeCanvas;

    p.draw = () => {
      const view = shell.dataset.view || "intro";

      p.background("#f6a829");
      drawDecor(view);
    };

    window.addEventListener("dj:viewchange", () => p.redraw());

    function resizeCanvas() {
      p.resizeCanvas(canvasHost.clientWidth, canvasHost.clientHeight);
    }

    function drawDecor(view) {
      if (view === "intro") {
        drawIntroDecor();
        return;
      }

      drawHeaderDecor();
      drawPanelDecor(view);
    }

    function drawIntroDecor() {
      const drift = Math.sin(p.frameCount * 0.018) * 3;

      circle(346 + drift, 296, 286, "rgba(255, 214, 125, 0.24)");
      circle(180 - drift, 486, 430, "rgba(255, 222, 132, 0.24)");
      circle(372, 420 + drift, 174, "rgba(255, 238, 172, 0.22)");
      circle(130, 388, 78, "rgba(255, 236, 178, 0.25)");
      circle(194, 390, 96, "rgba(232, 127, 33, 0.20)");
      circle(204, 398, 62, "rgba(255, 240, 201, 0.30)");
      circle(254, 392, 64, "rgba(255, 236, 178, 0.22)");
      circle(304, 380, 52, "rgba(225, 102, 28, 0.18)");

      dotCluster(370, 122, 4, 4, 5, 18, "rgba(255, 242, 204, 0.52)");
      dotCluster(80, 382, 4, 3, 3, 16, "rgba(255, 242, 204, 0.42)");
      dotCluster(350, 348, 3, 3, 3, 18, "rgba(255, 242, 204, 0.43)");
    }

    function drawHeaderDecor() {
      dotCluster(360, 52, 4, 4, 5, 18, "rgba(255, 242, 204, 0.52)");
      dotCluster(78, 78, 4, 2, 3, 16, "rgba(255, 242, 204, 0.38)");

      p.push();
      p.noStroke();
      p.fill("rgba(255, 222, 132, 0.26)");
      for (let i = 0; i < 8; i += 1) {
        circle(
          92 + i * 18,
          88 + Math.sin(i) * 11,
          58,
          "rgba(255, 222, 132, 0.25)",
        );
      }
      p.pop();
    }

    function drawPanelDecor(view) {
      circle(94, 422, 278, "rgba(255, 238, 172, 0.26)");
      circle(288, 426, 210, "rgba(255, 238, 172, 0.24)");
      circle(142, 528, 236, "rgba(255, 244, 199, 0.26)");
      circle(260, 520, 92, "rgba(255, 244, 199, 0.28)");
      dotCluster(304, 292, 4, 4, 4, 13, "rgba(255, 242, 204, 0.28)");

      if (view === "password") {
        circle(190, 420, 236, "rgba(255, 240, 190, 0.36)");
        circle(338, 412, 92, "rgba(255, 238, 172, 0.42)");
        circle(250, 488, 192, "rgba(255, 207, 90, 0.28)");
        dotCluster(350, 392, 3, 4, 3, 13, "rgba(255, 220, 140, 0.24)");
      }
    }

    function circle(x, y, size, color) {
      p.noStroke();
      p.fill(color);
      p.circle(scaleX(x), scaleY(y), scaleSize(size));
    }

    function dotCluster(x, y, cols, rows, dotSize, gap, color) {
      p.noStroke();
      p.fill(color);

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          p.circle(
            scaleX(x + col * gap),
            scaleY(y + row * gap),
            scaleSize(dotSize),
          );
        }
      }
    }

    function scaleX(value) {
      return (value / designSize.width) * p.width;
    }

    function scaleY(value) {
      return (value / designSize.height) * p.height;
    }

    function scaleSize(value) {
      return (
        value *
        Math.min(p.width / designSize.width, p.height / designSize.height)
      );
    }
  }, canvasHost);
}
