(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BeforeReadyHandler = void 0;
    /**
     * Helper class for encoder / decoder:
     *
     * can cache function calls on the encoder/decoder, when Flac is not ready yet,
     * and then applies them, when Flac becomes ready.
     */
    class BeforeReadyHandler {
        constructor(_target, enabled, Flac) {
            this._target = _target;
            this.Flac = Flac;
            this._enabled = false;
            this._isWaitOnReady = false;
            this._enabled = enabled;
        }
        get isWaitOnReady() {
            return this._isWaitOnReady;
        }
        get enabled() {
            return this._enabled;
        }
        set enabled(val) {
            if (!val && this._enabled) {
                this._reset();
            }
            this._enabled = this.enabled;
        }
        handleBeforeReady(funcName, args) {
            if (!this.Flac.isReady() && this.enabled) {
                if (!this._isWaitOnReady) {
                    this._beforeReadyCache = this._beforeReadyCache || [];
                    this._onReadyHandler = (_evt) => {
                        if (this._beforeReadyCache) {
                            this._beforeReadyCache.forEach(entry => this._target[entry.func].apply(this._target, entry.args));
                        }
                        this._reset();
                    };
                    this.Flac.on('ready', this._onReadyHandler);
                    this._isWaitOnReady = true;
                }
                if (this._beforeReadyCache) {
                    this._beforeReadyCache.push({ func: funcName, args: Array.from(args) });
                    return true;
                }
            }
            return false;
        }
        _reset() {
            if (this._beforeReadyCache) {
                this._beforeReadyCache = void (0);
            }
            if (this._onReadyHandler) {
                this.Flac.off('ready', this._onReadyHandler);
                this._onReadyHandler = void (0);
            }
            this._isWaitOnReady = false;
        }
    }
    exports.BeforeReadyHandler = BeforeReadyHandler;
});
