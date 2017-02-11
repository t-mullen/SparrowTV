// Some shims

window.URL = window.URL || window.webkitURL;

navigator.getUserMedia  = navigator.getUserMedia || 
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || 
                          navigator.msGetUserMedia;

window.requestAnimationFrame = window.requestAnimationFrame ||
                               window.webkitRequestAnimationFrame ||
                               window.mozRequestAnimationFrame ||
                               window.msRequestAnimationFrame ||
                               window.oRequestAnimationFrame;

window.requestFullscreen = function(element) {
    var rfs = element.requestFullscreen
            || element.webkitRequestFullScreen
            || element.mozRequestFullScreen
            || element.msRequestFullscreen;
    rfs.call(element);
}


// Gets both a screen stream and webcam stream
window.captureUserMedia = function(callback, onlyAudio) {
    var screenShare = function(webcamStream){
        getScreenId(function(error, sourceId, screen_constraints) {
            navigator.getUserMedia(screen_constraints, function(screenStream) {
                callback([screenStream, webcamStream]);
            }, function(err) {
                console.error(err);
                if (location.protocol !== 'https:') {
                    alert('Screen share requires secure origins.');
                } else {
                    alert('Screen capture is not supported. Please upgrade your browser or install the required plugin.');
                }

                callback([null, webcamStream]);
            });

        }, function(err){
            console.error(err);
            callback([null, webcamStream]);
        });

    };
    try {
        var onlyAudio = getParameterByName('novideo') || getParameterByName('onlyaudio');
        navigator.getUserMedia({audio:true, video:!onlyAudio}, 
            function (webcamStream){
                screenShare(webcamStream);
            }, function(err){
                screenShare(null);
            });
    }catch (err){
        screenShare(null);
    }
}

window.getParameterByName = function getParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) {
            return null;
        } else if (!results[2]) {
            return '';
        }
        return decodeURIComponent(results[2].replace(/\+/g, " "));
};

window.FormattedTime = (function(){
    var module = {};
    module.now = function(){
        var d = new Date();
        return ((d.getHours()%12) || 12)+":"+("0" + d.getMinutes()).slice(-2);
    }
                                           
    return module;        
}());

window.makeAjaxCall = function (method, url,  successCallback, errorCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.onreadystatechange = function (e) {
        if (this.readyState === 4) {
            if (this.status >= 200 && this.status < 400) {
                if (successCallback && successCallback.constructor == Function) {
                    return successCallback(this.responseText);
                }
            } else {
                if (errorCallback && errorCallback.constructor == Function) {
                    return errorCallback(this.statusText);
                } else {
                    console.error("Failed to get resource '" + url + "' Error: " + this.statusText);
                }
            }
        }
    };
    xhr.onerror = function (e) {
        if (errorCallback && errorCallback.constructor == Function) {
            return errorCallback(this.statusText);
        } else {
            console.error("Failed to get resource. Error: " + this.statusText);
        }
    };
    xhr.send(null);
};