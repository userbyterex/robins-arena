/**
 * engine/camera.js
 */
const Camera = (() => {
  let x = 0, y = 0;
  let viewW = 960, viewH = 640;

  function setViewport(w, h) {
    viewW = w; viewH = h;
  }

  function follow(targetX, targetY) {
    const desiredX = targetX - viewW / 2;
    const desiredY = targetY - viewH / 2;
    x = Math.max(0, Math.min(GameMap.WIDTH - viewW, desiredX));
    y = Math.max(0, Math.min(GameMap.HEIGHT - viewH, desiredY));
  }

  function worldToScreen(wx, wy) {
    return { x: wx - x, y: wy - y };
  }

  function screenToWorld(sx, sy) {
    return { x: sx + x, y: sy + y };
  }

  return { follow, worldToScreen, screenToWorld, setViewport, get x() { return x; }, get y() { return y; }, get viewW() { return viewW; }, get viewH() { return viewH; } };
})();
