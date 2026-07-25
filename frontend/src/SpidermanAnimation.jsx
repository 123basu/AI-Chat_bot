import { useRef, useEffect } from "react";

export default function SpidermanAnimation() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frameId;
    let angle = 0;
    let webBursts = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const cx = () => window.innerWidth / 2;
    const cy = () => window.innerHeight / 2;
    const rx = () => Math.min(window.innerWidth, window.innerHeight) * 0.38;
    const ry = () => Math.min(window.innerWidth, window.innerHeight) * 0.28;

    function drawHead(x, y, scale) {
      const s = scale || 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);

      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#e1251b";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-5, -3, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, -3, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-5, -3, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, -3, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 2, 2.5, 0, Math.PI);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, -12);
        ctx.lineTo(i * 5, -6);
        ctx.strokeStyle = "#8a1a14";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawBody(x, y, scale) {
      const s = scale || 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);

      ctx.beginPath();
      ctx.ellipse(0, 8, 8, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e1251b";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-6, -2, 3, 10, 0.15, 0, Math.PI * 2);
      ctx.fillStyle = "#1b4f9e";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, -2, 3, 10, -0.15, 0, Math.PI * 2);
      ctx.fillStyle = "#1b4f9e";
      ctx.fill();

      ctx.restore();
    }

    function drawLimb(x1, y1, x2, y2, color, width) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 4;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    function drawSpiderman(x, y, angle) {
      const scale = 1.2;
      const dx = Math.sin(angle * 2) * 6;
      const dy = Math.cos(angle * 1.5) * 4;

      drawLimb(x - 6, y + 4 + dy, x - 20 + dx, y - 14 - dy * 2, "#1b4f9e", 4);
      drawLimb(x + 6, y + 4 + dy, x + 20 + dx, y - 14 - dy * 2, "#1b4f9e", 4);
      drawLimb(x - 5, y + 18, x - 14 + dx * 0.5, y + 34 + dy, "#1b4f9e", 4);
      drawLimb(x + 5, y + 18, x + 14 - dx * 0.5, y + 34 - dy, "#1b4f9e", 4);

      drawBody(x, y, scale);
      drawHead(x, y - 24, scale);

      return { handL: { x: x - 20 + dx, y: y - 14 - dy * 2 }, handR: { x: x + 20 + dx, y: y - 14 - dy * 2 } };
    }

    function drawWebLine(fromX, fromY, toX, toY, phase) {
      const steps = 12 + Math.floor(Math.abs(phase * 3) % 6);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const baseX = fromX + (toX - fromX) * t;
        const baseY = fromY + (toY - fromY) * t;
        const wobble = Math.sin(t * Math.PI * 4 + phase) * (4 + 6 * (1 - t));
        const perpX = -(toY - fromY) / Math.hypot(toX - fromX, toY - fromY) || 0;
        const perpY = (toX - fromX) / Math.hypot(toX - fromX, toY - fromY) || 0;
        ctx.lineTo(baseX + perpX * wobble, baseY + perpY * wobble);
      }
      ctx.strokeStyle = `rgba(200, 200, 220, ${0.25 + 0.1 * Math.sin(phase)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function createBurst(x, y, targetX, targetY) {
      const count = 4 + Math.floor(Math.random() * 3);
      const strands = [];
      for (let i = 0; i < count; i++) {
        const offset = (Math.random() - 0.5) * 30;
        const tx = targetX + (Math.random() - 0.5) * 20;
        const ty = targetY + (Math.random() - 0.5) * 20;
        strands.push({
          sx: x + (Math.random() - 0.5) * 10,
          sy: y + (Math.random() - 0.5) * 10,
          tx,
          ty,
          progress: 0,
          speed: 0.015 + Math.random() * 0.025,
          phase: Math.random() * Math.PI * 2,
        });
      }
      webBursts.push(strands);
    }

    let burstTimer = 0;

    function animate() {
      angle += 0.008;
      burstTimer++;

      const spiderX = cx() + Math.cos(angle) * rx();
      const spiderY = cy() + Math.sin(angle * 1.3) * ry();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const hands = drawSpiderman(spiderX, spiderY, angle);

      if (burstTimer % 90 < 5) {
        createBurst(hands.handL.x, hands.handL.y, cx(), cy());
      }
      if (burstTimer % 110 < 5) {
        createBurst(hands.handR.x, hands.handR.y, cx(), cy());
      }

      webBursts = webBursts.filter((strands) => {
        let alive = false;
        strands.forEach((s) => {
          s.progress += s.speed;
          if (s.progress < 1) alive = true;
        });
        if (alive) {
          strands.forEach((s) => {
            const t = Math.min(s.progress, 1);
            const eased = 1 - Math.pow(1 - t, 2);
            const curX = s.sx + (s.tx - s.sx) * eased;
            const curY = s.sy + (s.ty - s.sy) * eased;
            drawWebLine(s.sx, s.sy, curX, curY, s.phase + burstTimer * 0.02);
          });
        }
        return alive;
      });

      const glow = ctx.createRadialGradient(cx(), cy(), 5, cx(), cy(), 80);
      glow.addColorStop(0, "rgba(255,255,255,0.08)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx() - 80, cy() - 80, 160, 160);

      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="spiderman-canvas" />;
}
