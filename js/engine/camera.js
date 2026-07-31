/**
 * engine/camera.js — safe follow even if GameMap missing
 */
var Camera = (function () {
  var x = 0, y = 0;
  var viewW = 960, viewH = 640;

  function setViewport(w, h) {
    viewW = Math.max(1, w || 960);
    viewH = Math.max(1, h || 640);
  }

  function mapW() {
    return (typeof GameMap !== "undefined" && GameMap.WIDTH) ? GameMap.WIDTH : 3000;
  }
  function mapH() {
    return (typeof GameMap !== "undefined" && GameMap.HEIGHT) ? GameMap.HEIGHT : 1000;
  }

  function follow(targetX, targetY) {
    var desiredX = targetX - viewW / 2;
    var desiredY = targetY - viewH / 2;
    var maxX = Math.max(0, mapW() - viewW);
    var maxY = Math.max(0, mapH() - viewH);
    x = Math.max(0, Math.min(maxX, desiredX));
    y = Math.max(0, Math.min(maxY, desiredY));
    if (!isFinite(x)) x = 0;
    if (!isFinite(y)) y = 0;
  }

  function worldToScreen(wx, wy) {
    return { x: wx - x, y: wy - y };
  }

  function screenToWorld(sx, sy) {
    return { x: sx + x, y: sy + y };
  }

  return {
    follow: follow,
    worldToScreen: worldToScreen,
    screenToWorld: screenToWorld,
    setViewport: setViewport,
    get x() { return x; },
    get y() { return y; },
    get viewW() { return viewW; },
    get viewH() { return viewH; }
  };
})();
