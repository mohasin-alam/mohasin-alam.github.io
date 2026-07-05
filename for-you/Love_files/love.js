/*
 * Love Tree — v2 (responsive + futuristic edition)
 * Rebuilt on requestAnimationFrame (no jscex dependency).
 *
 * Features:
 *  - Fully responsive: canvas scales to any screen via CSS, drawing math
 *    always happens in a fixed 1100x680 design space.
 *  - Neon / glow "futuristic" trunk + blooms + ambient floating sparkles.
 *  - Ground strip + soft shadow under the tree.
 *  - Blooms are living objects: tap one and it falls (petal-fall animation).
 *  - Ambient auto-fall: every so often a random bloom falls on its own,
 *    then a fresh one blooms back in later — the tree stays "alive" and full.
 */
(function (window) {
    'use strict';

    // ---------- small math helpers ----------
    function randRange(min, max) { return min + Math.random() * (max - min); }
    function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function Point(x, y) { this.x = x || 0; this.y = y || 0; }
    Point.prototype = {
        clone: function () { return new Point(this.x, this.y); },
        add: function (o) { return new Point(this.x + o.x, this.y + o.y); },
        sub: function (o) { return new Point(this.x - o.x, this.y - o.y); },
        div: function (n) { return new Point(this.x / n, this.y / n); },
        mul: function (n) { return new Point(this.x * n, this.y * n); }
    };

    function bezier(cp, t) {
        var p1 = cp[0].mul((1 - t) * (1 - t));
        var p2 = cp[1].mul(2 * t * (1 - t));
        var p3 = cp[2].mul(t * t);
        return p1.add(p2).add(p3);
    }

    // heart-region test, used to scatter blooms only inside a heart-shaped canopy
    function inHeartRegion(x, y, r) {
        var xr = x / r, yr = y / r;
        var z = Math.pow(xr * xr + yr * yr - 1, 3) - xr * xr * yr * yr * yr;
        return z < 0;
    }

    // the heart outline used for the seed + each bloom's petal shape
    function HeartFigure(pointCount) {
        var points = [], x, y, t;
        for (var i = 10; i < 30; i += 0.2) {
            t = i / Math.PI;
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            points.push(new Point(x, y));
        }
        this.points = points;
        this.length = points.length;
    }
    HeartFigure.prototype.get = function (i, scale) { return this.points[i].mul(scale || 1); };

    var BLOOM_PALETTE = ['#ff2d95', '#ff6ec7', '#ff8fd6', '#c77dff', '#a06bff', '#ffd166', '#ff5da2'];

    function pickColor() { return BLOOM_PALETTE[randInt(0, BLOOM_PALETTE.length - 1)]; }

    // ============================================================
    // Bloom — a single flower on the tree. States: appearing -> idle -> falling -> gone
    // ============================================================
    function Bloom(tree, point) {
        this.tree = tree;
        this.home = point.clone();     // resting spot in the canopy
        this.point = point.clone();
        this.color = pickColor();
        this.baseAlpha = randRange(0.75, 1);
        this.angle = randRange(0, Math.PI * 2);
        this.scale = 0;
        this.targetScale = randRange(0.55, 0.95);
        this.swayPhase = randRange(0, Math.PI * 2);
        this.swaySpeed = randRange(0.6, 1.3);
        this.swayAmp = randRange(2, 5);
        this.state = 'waiting';        // waiting -> appearing -> idle -> falling
        this.appearAt = 0;             // ms timestamp (tree clock) to start appearing
        this.figure = tree.bloomFigure;
    }
    Bloom.prototype = {
        startFall: function () {
            if (this.state === 'falling') return;
            this.state = 'falling';
            this.vx = randRange(-30, 30);
            this.vy = randRange(0, 20);
            this.gravity = randRange(55, 90);
            this.rot = randRange(-2.4, 2.4);
            this.alpha = this.baseAlpha;
            this.drag = 0.996;
        },
        update: function (dt, clock) {
            var s = this;
            if (s.state === 'waiting') {
                if (clock >= s.appearAt) s.state = 'appearing';
                return;
            }
            if (s.state === 'appearing') {
                s.scale = lerp(s.scale, s.targetScale, Math.min(1, dt * 9));
                if (Math.abs(s.scale - s.targetScale) < 0.01) {
                    s.scale = s.targetScale;
                    s.state = 'idle';
                }
                return;
            }
            if (s.state === 'idle') {
                // no positional mutation here — sway is computed at draw time
                return;
            }
            if (s.state === 'falling') {
                s.vy += s.gravity * dt;
                s.vx *= s.drag;
                s.point.x += s.vx * dt;
                s.point.y += s.vy * dt;
                s.angle += s.rot * dt;
                var groundY = s.tree.groundY;
                if (s.point.y > groundY - 6) {
                    s.alpha -= dt * 1.6;
                }
                if (s.alpha <= 0 || s.point.y > s.tree.height + 40 || s.point.x < -40 || s.point.x > s.tree.width + 40) {
                    s.tree.retireBloom(s);
                }
            }
        },
        draw: function (ctx, time) {
            var s = this;
            if (s.state === 'waiting') return;
            var px = s.point.x, py = s.point.y, ang = s.angle, alpha = (s.state === 'falling') ? Math.max(0, s.alpha) : s.baseAlpha;

            if (s.state === 'idle' || s.state === 'appearing') {
                px += Math.sin(time * s.swaySpeed + s.swayPhase) * s.swayAmp;
                py += Math.cos(time * s.swaySpeed * 0.8 + s.swayPhase) * (s.swayAmp * 0.5);
                ang = Math.sin(time * 0.5 + s.swayPhase) * 0.25;
            }

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(ang);
            ctx.scale(s.scale, s.scale);
            ctx.globalAlpha = alpha;
            if (s.state === 'appearing' || s.state === 'falling') {
                ctx.shadowColor = s.color;
                ctx.shadowBlur = 8;
            }
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (var i = 0; i < s.figure.length; i++) {
                var p = s.figure.get(i);
                ctx.lineTo(p.x, -p.y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    };

    // ============================================================
    // Branch — grows along a bezier curve, painted once onto the trunk buffer
    // ============================================================
    function Branch(point1, point2, point3, radius, length, children) {
        this.point1 = point1;
        this.point2 = point2;
        this.point3 = point3;
        this.radius = radius;
        this.length = length || 100;
        this.len = 0;
        this.t = 1 / (this.length - 1 || 1);
        this.children = children || [];
        this.maxRadius = radius;
    }

    // ============================================================
    // Tree — the whole scene: seed, ground, trunk, blooms, particles
    // ============================================================
    function Tree(canvas, opt) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.opt = opt || {};
        this.width = this.opt.width || 1100;
        this.height = this.opt.height || 680;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this._setupCanvas();

        this.bloomFigure = new HeartFigure();
        this.time = 0;
        this.msClock = 0;          // quantized 10ms clock, mirrors original pacing
        this.phase = 'seed';       // seed -> drop -> growing -> blooming -> idle
        this.blooms = [];
        this.particles = [];
        this.ambientTimer = randRange(2.5, 5);
        this.respawnQueue = [];    // [{at, home}]
        this._idleCallbacks = [];

        this._initSeed();
        this._initGround();
        this._initTrunkBuffer();
        this._initBranchQueue();
        this._initBloomTargets();
        this._initParticles();
    }

    Tree.prototype = {

        _setupCanvas: function () {
            var c = this.canvas, dpr = this.dpr;
            c.width = Math.round(this.width * dpr);
            c.height = Math.round(this.height * dpr);
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        },

        _initSeed: function () {
            var seedOpt = this.opt.seed || {};
            this.seed = {
                point: new Point(seedOpt.x || this.width / 2, seedOpt.y || this.height / 2 - 60),
                color: seedOpt.color || '#ff1a4d',
                scale: seedOpt.scale || 2,
                baseScale: seedOpt.scale || 2,
                hitRadius: 46
            };
        },

        _initGround: function () {
            var g = this.opt.ground || {};
            this.groundY = this.height - (g.height || 46);
            this.groundLen = 0;
            this.groundTarget = g.width || this.width;
            this.groundSpeed = g.speed || 14;
        },

        _initTrunkBuffer: function () {
            this.trunkCanvas = document.createElement('canvas');
            this.trunkCanvas.width = this.canvas.width;
            this.trunkCanvas.height = this.canvas.height;
            this.trunkCtx = this.trunkCanvas.getContext('2d');
            this.trunkCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        },

        _buildBranch: function (arr) {
            var p1 = new Point(arr[0], arr[1]);
            var p2 = new Point(arr[2], arr[3]);
            var p3 = new Point(arr[4], arr[5]);
            return new Branch(p1, p2, p3, arr[6], arr[7], arr[8] || []);
        },

        _initBranchQueue: function () {
            var raw = this.opt.branch || [];
            this.activeBranches = [];
            for (var i = 0; i < raw.length; i++) {
                this.activeBranches.push(this._buildBranch(raw[i]));
            }
            this.growAcc = 0; // ms accumulator, steps every 10ms like the original pacing
        },

        canGrow: function () { return this.activeBranches.length > 0; },

        _growTick: function () {
            var branches = this.activeBranches;
            for (var i = branches.length - 1; i >= 0; i--) {
                var b = branches[i];
                if (b.len <= b.length) {
                    var p = bezier([b.point1, b.point2, b.point3], b.len * b.t);
                    this._drawTrunkPoint(p, b.radius, b.maxRadius);
                    b.len += 1;
                    b.radius *= 0.97;
                } else {
                    branches.splice(i, 1);
                    for (var j = 0; j < b.children.length; j++) {
                        branches.push(this._buildBranch(b.children[j]));
                    }
                }
            }
        },

        _drawTrunkPoint: function (p, radius, maxRadius) {
            var ctx = this.trunkCtx;
            var t = clamp(radius / maxRadius, 0, 1); // 1 = thick trunk base, 0 = thin twig tip
            var inner = mixColor('#0a3d3f', '#00e5ff', 1 - t);
            var outer = mixColor('#012a2b', '#0091a8', 1 - t);
            var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(radius, 0.6));
            grad.addColorStop(0, inner);
            grad.addColorStop(1, outer);
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = grad;
            ctx.shadowColor = 'rgba(0, 229, 255, 0.55)';
            ctx.shadowBlur = 5;
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, Math.max(radius, 0.6), 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        },

        _initBloomTargets: function () {
            var bloomOpt = this.opt.bloom || {};
            this.bloomCount = bloomOpt.num || 600;
            this.canopyWidth = bloomOpt.width || this.width - 20;
            this.canopyHeight = bloomOpt.height || this.height - 30;
            this.canopyRadius = 240;
        },

        _randomCanopyPoint: function () {
            var w = this.canopyWidth, h = this.canopyHeight, r = this.canopyRadius;
            var x, y, tries = 0;
            do {
                x = randInt(20, w - 20);
                y = randInt(20, h - 20);
                tries++;
            } while (!inHeartRegion(x - w / 2, h - (h - 40) / 2 - y, r) && tries < 200);
            return new Point(x, y);
        },

        _initParticles: function () {
            this.particles = [];
            for (var i = 0; i < 22; i++) {
                this.particles.push({
                    x: randRange(this.width * 0.25, this.width * 0.85),
                    y: randRange(this.height * 0.15, this.groundY - 20),
                    r: randRange(0.8, 2.4),
                    phase: randRange(0, Math.PI * 2),
                    speed: randRange(0.3, 0.8),
                    drift: randRange(4, 12)
                });
            }
        },

        // ---------- public control ----------
        hoverSeed: function (x, y) {
            if (this.phase !== 'seed') return false;
            var d = Math.hypot(x - this.seed.point.x, y - this.seed.point.y);
            return d <= this.seed.hitRadius;
        },

        beginGrowth: function () {
            if (this.phase !== 'seed') return;
            this.phase = 'drop';
            this._dropAcc = 0;
        },

        onIdle: function (fn) {
            if (this.phase === 'idle') { fn(); return; }
            this._idleCallbacks.push(fn);
        },

        // find a bloom near (x,y) that can be tapped to fall
        hitTestBloom: function (x, y) {
            var best = null, bestDist = 22;
            for (var i = 0; i < this.blooms.length; i++) {
                var b = this.blooms[i];
                if (b.state !== 'idle' && b.state !== 'appearing') continue;
                var d = Math.hypot(x - b.point.x, y - b.point.y);
                if (d < bestDist) { bestDist = d; best = b; }
            }
            return best;
        },

        pointerAt: function (x, y) {
            if (this.phase === 'seed') {
                if (this.hoverSeed(x, y)) return { type: 'seed' };
                return null;
            }
            var bloom = this.hitTestBloom(x, y);
            if (bloom) {
                bloom.startFall();
                return { type: 'bloom' };
            }
            return null;
        },

        isHoverable: function (x, y) {
            if (this.phase === 'seed') return this.hoverSeed(x, y);
            return !!this.hitTestBloom(x, y);
        },

        retireBloom: function (bloom) {
            var idx = this.blooms.indexOf(bloom);
            if (idx >= 0) this.blooms.splice(idx, 1);
            this.respawnQueue.push({ at: this.time + randRange(3, 7), home: this._randomCanopyPoint() });
        },

        // ---------- frame update ----------
        update: function (dt) {
            dt = Math.min(dt, 0.05); // guard against huge jumps (tab switch, etc.)
            this.time += dt;

            if (this.phase === 'seed') {
                // gentle pulse handled in draw()
            } else if (this.phase === 'drop') {
                this._updateDrop(dt);
            } else if (this.phase === 'growing') {
                this._updateGrowing(dt);
            } else if (this.phase === 'blooming') {
                this._updateBlooming(dt);
            } else if (this.phase === 'idle') {
                this._updateIdle(dt);
            }

            for (var i = 0; i < this.particles.length; i++) {
                var p = this.particles[i];
                p.y -= p.drift * dt * 0.3;
                if (p.y < this.height * 0.1) p.y = this.groundY - 10;
            }
        },

        _updateDrop: function (dt) {
            this._dropAcc += dt * 1000;
            var stepMs = 10;
            while (this._dropAcc >= stepMs) {
                this._dropAcc -= stepMs;
                if (this.seed.scale > 0.2) {
                    this.seed.scale *= 0.95;
                } else if (this.seed.point.y < this.height + 20) {
                    this.seed.point.y += 2;
                    if (this.groundLen < this.groundTarget) this.groundLen += this.groundSpeed;
                } else {
                    this.phase = 'growing';
                    return;
                }
            }
        },

        _updateGrowing: function (dt) {
            this.growAcc += dt * 1000;
            var stepMs = 10, guard = 0;
            while (this.growAcc >= stepMs && guard < 400) {
                this.growAcc -= stepMs;
                guard++;
                this._growTick();
                if (this.groundLen < this.groundTarget) this.groundLen += this.groundSpeed * 0.4;
                if (!this.canGrow()) {
                    this._startBlooming();
                    return;
                }
            }
        },

        _startBlooming: function () {
            this.phase = 'blooming';
            this.blooms = [];
            var delayStep = 5; // ms between each bloom starting to appear (2 per 10ms, like the original)
            for (var i = 0; i < this.bloomCount; i++) {
                var b = new Bloom(this, this._randomCanopyPoint());
                b.appearAt = i * delayStep;
                this.blooms.push(b);
            }
            this._bloomClock = 0;
        },

        _updateBlooming: function (dt) {
            this._bloomClock += dt * 1000;
            var allSettled = true;
            for (var i = 0; i < this.blooms.length; i++) {
                var b = this.blooms[i];
                b.update(dt, this._bloomClock);
                if (b.state === 'waiting' || b.state === 'appearing') allSettled = false;
            }
            if (this.groundLen < this.groundTarget) this.groundLen += this.groundSpeed * 0.4;
            if (allSettled) {
                this.phase = 'idle';
                var cbs = this._idleCallbacks;
                this._idleCallbacks = [];
                for (var j = 0; j < cbs.length; j++) cbs[j]();
            }
        },

        _updateIdle: function (dt) {
            for (var i = this.blooms.length - 1; i >= 0; i--) {
                this.blooms[i].update(dt, 0);
            }

            // ambient auto-fall: every so often, a random resting bloom lets go
            this.ambientTimer -= dt;
            if (this.ambientTimer <= 0) {
                this.ambientTimer = randRange(2.5, 6);
                var idleOnes = this.blooms.filter(function (b) { return b.state === 'idle'; });
                if (idleOnes.length > 6) {
                    idleOnes[randInt(0, idleOnes.length - 1)].startFall();
                }
            }

            // bring back blooms that finished falling, after their delay
            for (var q = this.respawnQueue.length - 1; q >= 0; q--) {
                var item = this.respawnQueue[q];
                if (this.time >= item.at) {
                    this.respawnQueue.splice(q, 1);
                    var nb = new Bloom(this, item.home);
                    nb.state = 'appearing';
                    nb.appearAt = 0;
                    this.blooms.push(nb);
                }
            }
        },

        // ---------- render ----------
        draw: function () {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.width, this.height);

            this._drawAmbientGlow(ctx);
            this._drawShadow(ctx);
            this._drawGround(ctx);

            if (this.phase !== 'seed') {
                ctx.drawImage(this.trunkCanvas, 0, 0, this.trunkCanvas.width, this.trunkCanvas.height,
                    0, 0, this.width, this.height);
            }

            for (var i = 0; i < this.blooms.length; i++) {
                this.blooms[i].draw(ctx, this.time);
            }

            this._drawParticles(ctx);

            if (this.phase === 'seed' || this.phase === 'drop') {
                this._drawSeed(ctx);
            }
        },

        _drawAmbientGlow: function (ctx) {
            var cx = this.seed.baseScale ? this.opt.seed && this.opt.seed.x || this.width / 2 : this.width / 2;
            var grad = ctx.createRadialGradient(cx, this.height * 0.42, 20, cx, this.height * 0.42, 420);
            grad.addColorStop(0, 'rgba(255, 45, 149, 0.10)');
            grad.addColorStop(1, 'rgba(255, 45, 149, 0)');
            ctx.save();
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.restore();
        },

        _drawShadow: function (ctx) {
            if (this.phase === 'seed') return;
            var progress = clamp(this.groundLen / this.groundTarget, 0, 1);
            var cx = this.seed.point.x;
            var w = 150 * progress + 40, h = 16 * progress + 4;
            ctx.save();
            var grad = ctx.createRadialGradient(cx, this.groundY + 6, 1, cx, this.groundY + 6, w);
            grad.addColorStop(0, 'rgba(0,0,0,0.35)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, this.groundY + 6, w, h, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        },

        _drawGround: function (ctx) {
            if (this.groundLen <= 0) return;
            var cx = this.seed.point.x, y = this.groundY, half = this.groundLen / 2;
            ctx.save();
            var grad = ctx.createLinearGradient(0, y - 4, 0, this.height);
            grad.addColorStop(0, 'rgba(0, 229, 255, 0.9)');
            grad.addColorStop(0.15, 'rgba(6, 40, 40, 0.95)');
            grad.addColorStop(1, 'rgba(2, 15, 18, 0.98)');
            ctx.fillStyle = grad;
            ctx.fillRect(Math.max(0, cx - half), y, Math.min(this.width, half * 2), this.height - y);

            ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(Math.max(0, cx - half), y);
            ctx.lineTo(Math.min(this.width, cx + half), y);
            ctx.stroke();
            ctx.restore();
        },

        _drawParticles: function (ctx) {
            ctx.save();
            for (var i = 0; i < this.particles.length; i++) {
                var p = this.particles[i];
                var a = 0.35 + 0.35 * Math.sin(this.time * p.speed + p.phase);
                ctx.globalAlpha = Math.max(0, a);
                ctx.fillStyle = '#bdfcff';
                ctx.shadowColor = '#8ff5ff';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(p.x + Math.sin(this.time * 0.4 + p.phase) * 6, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        },

        _drawSeed: function (ctx) {
            var s = this.seed;
            var pulse = this.phase === 'seed' ? (1 + Math.sin(this.time * 2.2) * 0.05) : 1;
            var scale = s.scale * pulse;
            ctx.save();
            ctx.translate(s.point.x, s.point.y);
            ctx.scale(scale, scale);
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 20;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (var i = 0; i < this.bloomFigure.length; i++) {
                var p = this.bloomFigure.get(i);
                ctx.lineTo(p.x, -p.y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            if (this.phase === 'seed') {
                ctx.save();
                ctx.font = '600 15px Quicksand, sans-serif';
                ctx.fillStyle = 'rgba(90, 0, 30, 0.85)';
                ctx.textAlign = 'center';
                ctx.fillText('এখানে চাপ দাও', s.point.x, s.point.y + 70);
                ctx.restore();
            }
        }
    };

    function mixColor(hexA, hexB, t) {
        var a = hexToRgb(hexA), b = hexToRgb(hexB);
        var r = Math.round(lerp(a[0], b[0], t));
        var g = Math.round(lerp(a[1], b[1], t));
        var bl = Math.round(lerp(a[2], b[2], t));
        return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }
    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
    }

    window.Tree = Tree;
    window.TreePoint = Point;

})(window);
