/* global p5 */

const shell = document.querySelector("#phone");
const canvasHost = document.querySelector("#decorCanvas");
const designSize = { width: 402, height: 874 };
const fallingCircles = [
  {
    x: 54,
    size: 128,
    speed: 0.78,
    offset: 40,
    sway: 18,
    wave: 0.018,
    color: "rgba(255, 236, 178, 0.22)",
  },
  {
    x: 148,
    size: 88,
    speed: 0.62,
    offset: 240,
    sway: 12,
    wave: 0.022,
    color: "rgba(255, 244, 199, 0.24)",
  },
  {
    x: 300,
    size: 176,
    speed: 0.5,
    offset: 120,
    sway: 20,
    wave: 0.015,
    color: "rgba(255, 222, 132, 0.2)",
  },
  {
    x: 382,
    size: 92,
    speed: 0.86,
    offset: 420,
    sway: 15,
    wave: 0.02,
    color: "rgba(255, 238, 172, 0.2)",
  },
  {
    x: 214,
    size: 240,
    speed: 0.38,
    offset: 560,
    sway: 24,
    wave: 0.013,
    color: "rgba(255, 214, 125, 0.16)",
  },
  {
    x: 118,
    size: 56,
    speed: 0.94,
    offset: 720,
    sway: 10,
    wave: 0.024,
    color: "rgba(255, 240, 201, 0.26)",
  },
  {
    x: 344,
    size: 64,
    speed: 0.72,
    offset: 800,
    sway: 12,
    wave: 0.019,
    color: "rgba(232, 127, 33, 0.14)",
  },
  {
    x: 34,
    size: 36,
    speed: 1.08,
    offset: 170,
    sway: 8,
    wave: 0.026,
    color: "rgba(255, 244, 199, 0.24)",
  },
  {
    x: 262,
    size: 44,
    speed: 0.98,
    offset: 350,
    sway: 9,
    wave: 0.023,
    color: "rgba(255, 240, 201, 0.22)",
  },
  {
    x: 392,
    size: 30,
    speed: 1.18,
    offset: 610,
    sway: 7,
    wave: 0.028,
    color: "rgba(255, 236, 178, 0.2)",
  },
  {
    x: 186,
    size: 42,
    speed: 0.88,
    offset: 760,
    sway: 10,
    wave: 0.021,
    color: "rgba(255, 222, 132, 0.18)",
  },
  {
    x: 320,
    size: 52,
    speed: 1,
    offset: 910,
    sway: 11,
    wave: 0.02,
    color: "rgba(255, 244, 199, 0.19)",
  },
];
const dotClusters = {
  intro: [
    {
      x: 370,
      y: 122,
      cols: 4,
      rows: 4,
      size: 5,
      gap: 18,
      phase: 0,
      color: "rgba(255, 242, 204, 0.52)",
    },
    {
      x: 80,
      y: 382,
      cols: 4,
      rows: 3,
      size: 3,
      gap: 16,
      phase: 1.8,
      color: "rgba(255, 242, 204, 0.42)",
    },
    {
      x: 350,
      y: 348,
      cols: 3,
      rows: 3,
      size: 3,
      gap: 18,
      phase: 3.1,
      color: "rgba(255, 242, 204, 0.43)",
    },
    {
      x: 246,
      y: 564,
      cols: 5,
      rows: 3,
      size: 3,
      gap: 15,
      phase: 4.6,
      color: "rgba(255, 242, 204, 0.34)",
    },
    {
      x: 24,
      y: 184,
      cols: 3,
      rows: 4,
      size: 3,
      gap: 15,
      phase: 5.8,
      color: "rgba(255, 242, 204, 0.3)",
    },
  ],
  active: [
    {
      x: 360,
      y: 52,
      cols: 4,
      rows: 4,
      size: 5,
      gap: 18,
      phase: 0.6,
      color: "rgba(255, 242, 204, 0.52)",
    },
    {
      x: 78,
      y: 78,
      cols: 4,
      rows: 2,
      size: 3,
      gap: 16,
      phase: 2.2,
      color: "rgba(255, 242, 204, 0.38)",
    },
    {
      x: 304,
      y: 292,
      cols: 5,
      rows: 4,
      size: 4,
      gap: 13,
      phase: 4,
      color: "rgba(255, 242, 204, 0.28)",
    },
    {
      x: 26,
      y: 360,
      cols: 3,
      rows: 4,
      size: 3,
      gap: 14,
      phase: 5.2,
      color: "rgba(255, 242, 204, 0.26)",
    },
    {
      x: 342,
      y: 430,
      cols: 4,
      rows: 3,
      size: 3,
      gap: 14,
      phase: 6.4,
      color: "rgba(255, 242, 204, 0.24)",
    },
  ],
  password: [
    {
      x: 350,
      y: 392,
      cols: 3,
      rows: 4,
      size: 3,
      gap: 13,
      phase: 5.4,
      color: "rgba(255, 220, 140, 0.24)",
    },
  ],
};

if (!window.p5) {
  console.warn("p5.js is not loaded. Decorative canvas was skipped.");
} else {
  new p5((p) => {
    p.setup = () => {
      p.createCanvas(canvasHost.clientWidth, canvasHost.clientHeight);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      p.frameRate(20);
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
      drawFallingCircles(view);
      drawDotClusters(view);
    }

    function drawFallingCircles(view) {
      const visibleCircles =
        view === "intro" ? fallingCircles : fallingCircles.slice(0, 9);

      for (const item of visibleCircles) {
        const travel = designSize.height + item.size + 160;
        const progress = (p.frameCount * item.speed + item.offset) % travel;
        const y = progress - item.size - 80;
        const x =
          item.x + Math.sin(p.frameCount * item.wave + item.offset) * item.sway;

        circle(x, y, item.size, item.color);
      }
    }

    function drawDotClusters(view) {
      const clusters =
        view === "intro" ? dotClusters.intro : [...dotClusters.active];

      if (view === "password") {
        clusters.push(...dotClusters.password);
      }

      for (const cluster of clusters) {
        dotCluster(cluster);
      }
    }

    function circle(x, y, size, color) {
      p.noStroke();
      p.fill(color);
      p.circle(scaleX(x), scaleY(y), scaleSize(size));
    }

    function dotCluster(cluster) {
      p.noStroke();
      p.fill(cluster.color);

      for (let row = 0; row < cluster.rows; row += 1) {
        for (let col = 0; col < cluster.cols; col += 1) {
          const wave =
            Math.sin(
              p.frameCount * 0.06 + cluster.phase + row * 0.75 + col * 0.42,
            ) * 3;

          p.circle(
            scaleX(cluster.x + col * cluster.gap),
            scaleY(cluster.y + row * cluster.gap + wave),
            scaleSize(cluster.size),
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
