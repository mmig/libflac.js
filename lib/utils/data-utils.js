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
    exports.getLengthFor = exports.mergeBuffers = exports.getLength = void 0;
    function getLength(recBuffers) {
        var recLength = 0;
        for (var i = recBuffers.length - 1; i >= 0; --i) {
            recLength += recBuffers[i].byteLength;
        }
        return recLength;
    }
    exports.getLength = getLength;
    function mergeBuffers(channelBuffer, recordingLength) {
        var result = new Uint8Array(recordingLength);
        var offset = 0;
        var lng = channelBuffer.length;
        for (var i = 0; i < lng; i++) {
            var buffer = channelBuffer[i];
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    }
    exports.mergeBuffers = mergeBuffers;
    function getLengthFor(recBuffers, index, sampleBytes, bytePadding) {
        var recLength = 0, blen;
        var decrFac = bytePadding > 0 ? bytePadding / sampleBytes : 0; //<- factor do decrease size in case of padding bytes
        for (var i = recBuffers.length - 1; i >= 0; --i) {
            blen = recBuffers[i][index].byteLength;
            if (bytePadding > 0) {
                recLength += blen - (decrFac * blen);
            }
            else {
                recLength += blen;
            }
        }
        return recLength;
    }
    exports.getLengthFor = getLengthFor;
});
