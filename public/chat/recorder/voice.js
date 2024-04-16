let RongIMLib;
(function (RongIMLib) {
    let RongIMVoice = (function () {
        function RongIMVoice() {
            console.log("RongIMLib init")
        }
        RongIMVoice.init = function () {
            if (this.isIE) {
                let div = document.createElement("div");
                div.setAttribute("id", "flashContent");
                document.body.appendChild(div);
                let script = document.createElement("script");
                script.src = "/chat/recorder/swfobject-2.0.0.min.js";
                let header = document.getElementsByTagName("head")[0];
                header.appendChild(script);
                setTimeout(function () {
                    let swfVersionStr = "11.4.0";
                    let flashlets = {};
                    let params = {};
                    params.quality = "high";
                    params.bgcolor = "#ffffff";
                    params.allowscriptaccess = "always";
                    params.allowfullscreen = "true";
                    let attributes = {};
                    attributes.id = "player";
                    attributes.name = "player";
                    attributes.align = "middle";
                    swfobject.embedSWF("/chat/recorder/player-2.0.2.swf", "flashContent", "1", "1", swfVersionStr, null, flashlets, params, attributes);
                }, 200);
            }
            else {
                let list = ["/chat/recorder/pcmdata-2.0.0.min.js", "/chat/recorder/libamr-2.0.1.min.js"];
                for (let i = 0, len = list.length; i < len; i++) {
                    let script = document.createElement("script");
                    script.src = list[i];
                    document.head.appendChild(script);
                }
            }
            this.isInit = true;
        };
        RongIMVoice.play = function (data, duration) {
            this.checkInit("play");
            let me = this;
            if (me.isIE) {
                me.thisMovie().doAction("init", data);
            }
            else {
                me.palyVoice(data);
                me.onCompleted(duration);
            }
        };
        RongIMVoice.stop = function () {
            this.checkInit("stop");
            let me = this;
            if (me.isIE) {
                me.thisMovie().doAction("stop");
            }
            else if (me.element) {
                    me.element.stop();
            }
            
        };
        RongIMVoice.onprogress = function () {
            this.checkInit("onprogress");
        };
        RongIMVoice.checkInit = function (postion) {
            if (!this.isInit) {
                throw new Error("RongIMVoice not initialized,postion:" + postion);
            }
        };
        RongIMVoice.thisMovie = function () {
            return eval("window['player']");
        };
        RongIMVoice.onCompleted = function (duration) {
            let me = this;
            let count = 0;
            let timer = setInterval(function () {
                count++;
                me.onprogress();
                if (count >= duration) {
                    clearInterval(timer);
                }
            }, 1000);
            if (me.isIE) {
                me.thisMovie().doAction("play");
            }
        };
        RongIMVoice.base64ToBlob = function (base64Data, type) {
            let mimeType;
            if (type) {
                mimeType = { type: type };
            }
            base64Data = base64Data.replace(/^(.*)$$,/, '');
            let sliceSize = 1024;
            let byteCharacters = atob(base64Data);
            let bytesLength = byteCharacters.length;
            let slicesCount = Math.ceil(bytesLength / sliceSize);
            let byteArrays = new Array(slicesCount);
            for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
                let begin = sliceIndex * sliceSize;
                let end = Math.min(begin + sliceSize, bytesLength);
                let bytes = new Array(end - begin);
                for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
                    bytes[i] = byteCharacters[offset].charCodeAt(0);
                }
                byteArrays[sliceIndex] = new Uint8Array(bytes);
            }
            return new Blob(byteArrays, mimeType);
        };
        RongIMVoice.palyVoice = function (base64Data) {
            let reader = new FileReader(), blob = this.base64ToBlob(base64Data, "audio/amr"), me = this;
            reader.onload = function () {
                let samples = new AMR({
                    benchmark: true
                }).decode(reader.result);
                me.element = AMR.util.play(samples);
            };
            reader.readAsArrayBuffer(blob);
        };
        RongIMVoice.isIE = /Trident/.test(navigator.userAgent);
        RongIMVoice.isInit = false;
        return RongIMVoice;
    })();
    RongIMLib.RongIMVoice = RongIMVoice;
    if ("function" === typeof require && "object" === typeof module && module?.id && "object" === typeof exports && exports) {
        module.exports = RongIMVoice;
    }
    else if ("function" === typeof define && define.amd) {
        define("RongIMVoice", [], function () {
            return RongIMVoice;
        });
    }
})(RongIMLib || (RongIMLib = {}));