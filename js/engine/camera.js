/**
 * engine/camera.js
 */
var Camera = (function () {
  var x = 0, y = 0;
  var viewW = 960, viewH = 640;

  function setViewport(w, h) {
    viewW = w; viewH = h;
  }

  function follow(targetX, targetY) {
    var desiredX = targetX - viewW / 2;
    var desiredY = targetY - viewH / 2;
    x = Math.max(0, Math.min(GameMap.WIDTH - viewW, desiredX));
    y = Math.max(0, Math.min(GameMap.HEIGHT - viewH, desiredY));
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
